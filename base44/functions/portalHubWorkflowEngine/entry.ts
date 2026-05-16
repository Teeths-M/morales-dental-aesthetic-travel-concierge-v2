import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { action, consultation_id, data } = payload;

    // Action: initiate_doctor_approval
    if (action === 'initiate_doctor_approval') {
      const consultation = await base44.entities.Consultation.get(consultation_id);
      
      // Update WorkflowEvent status
      const workflowEvent = await base44.entities.WorkflowEvent.filter({
        consultation_id,
        stage: 'risk_check'
      });
      
      if (!workflowEvent.length) {
        const newEvent = await base44.entities.WorkflowEvent.create({
          consultation_id,
          patient_name: consultation.patient_name,
          patient_email: consultation.email,
          stage: 'risk_check',
          risk_result: 'pending'
        });
        
        return Response.json({ 
          status: 'workflow_created',
          workflow_id: newEvent.id 
        });
      }
      
      return Response.json({ workflow_id: workflowEvent[0].id });
    }

    // Action: doctor_approved
    if (action === 'doctor_approved') {
      const { procedure_name, price, recovery_days, available_dates } = data;
      
      // Update WorkflowEvent
      const workflowEvent = await base44.entities.WorkflowEvent.filter({
        consultation_id
      });
      
      if (workflowEvent.length) {
        await base44.entities.WorkflowEvent.update(workflowEvent[0].id, {
          stage: 'doctor',
          doctor_status: 'confirmed',
          doctor_notes: `${procedure_name} - $${price} - Recovery: ${recovery_days} days`
        });
      }

      // Fetch consultation for patient details
      const consultation = await base44.entities.Consultation.get(consultation_id);
      
      // Trigger quote request creation for all provider types
      const partners = await base44.entities.Partner.filter({ is_active: true });
      const quoteRequests = [];

      const provider_types = ['flight', 'hotel', 'taxi_origin', 'taxi_destination', 'recovery_accommodation'];
      
      for (const provider_type of provider_types) {
        const relevant_partners = partners.filter(p => {
          if (provider_type === 'flight') return p.type === 'travel';
          if (provider_type === 'hotel') return p.type === 'hotel';
          if (provider_type === 'taxi_origin' || provider_type === 'taxi_destination') return p.type === 'cab';
          if (provider_type === 'recovery_accommodation') return p.type === 'other' && p.name.toLowerCase().includes('recovery');
          return false;
        });

        for (const partner of relevant_partners) {
          const qr = await base44.entities.QuoteRequest.create({
            consultation_id,
            patient_name: consultation.patient_name,
            procedure_name,
            procedure_date: consultation.preferred_date,
            recovery_days,
            destination_country: 'Mexico', // TODO: make dynamic
            patient_country: consultation.nationality,
            provider_type,
            partner_id: partner.id,
            status: 'pending',
            delivery_method: 'email',
            due_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days
          });
          
          quoteRequests.push(qr);

          // Create notification for partner
          await base44.entities.WorkflowNotification.create({
            workflow_event_id: workflowEvent[0]?.id || '',
            recipient_type: 'partner',
            recipient_email: partner.email,
            recipient_phone: partner.phone,
            notification_type: 'quote_request',
            channel: 'email',
            content: `Quote request for ${procedure_name} - Patient: ${consultation.patient_name} - Travel dates: ${consultation.preferred_date} to ${new Date(new Date(consultation.preferred_date).getTime() + recovery_days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`
          });
        }
      }

      return Response.json({ 
        status: 'quotes_initiated',
        quote_count: quoteRequests.length,
        workflow_stage: 'awaiting_quotes'
      });
    }

    // Action: process_quotes_and_calculate_package
    if (action === 'process_quotes_and_calculate_package') {
      const consultation = await base44.entities.Consultation.get(consultation_id);
      const quotes = await base44.entities.Quote.filter({ consultation_id });
      
      // Calculate total package cost
      let totalCost = 0;
      const doctor_cost = data.doctor_price || 0;
      
      totalCost += doctor_cost;
      
      // Add selected quotes
      for (const quote of quotes) {
        if (quote.is_selected) {
          totalCost += quote.base_price;
        }
      }

      // Apply 35% markup
      const markup_pct = 35;
      const marked_up_cost = totalCost * (1 + markup_pct / 100);

      // Create payment plan
      const paymentPlan = await base44.entities.PaymentPlan.create({
        consultation_id,
        plan_type: 'awaiting_selection',
        total_package_cost: totalCost,
        markup_pct,
        final_cost: marked_up_cost,
        amount_due_today: marked_up_cost,
        payment_status: 'awaiting_selection'
      });

      return Response.json({
        status: 'package_calculated',
        total_base_cost: totalCost,
        markup_pct,
        final_cost: marked_up_cost,
        payment_plan_id: paymentPlan.id
      });
    }

    // Action: client_selects_payment_option
    if (action === 'client_selects_payment_option') {
      const { plan_type } = data;
      const paymentPlan = await base44.entities.PaymentPlan.filter({ consultation_id });
      
      if (!paymentPlan.length) {
        return Response.json({ error: 'Payment plan not found' }, { status: 404 });
      }

      const pp = paymentPlan[0];
      let discount_pct = 0;
      let amount_due_today = pp.final_cost;
      let amount_due_later = 0;

      if (plan_type === 'full_payment') {
        discount_pct = 5;
        amount_due_today = pp.final_cost * (1 - discount_pct / 100);
        amount_due_later = 0;
      } else if (plan_type === 'deposit_25') {
        amount_due_today = pp.final_cost * 0.25;
        amount_due_later = pp.final_cost * 0.75;
      } else if (plan_type === 'deposit_50') {
        amount_due_today = pp.final_cost * 0.50;
        amount_due_later = pp.final_cost * 0.50;
      }

      await base44.entities.PaymentPlan.update(pp.id, {
        plan_type,
        discount_pct,
        amount_due_today,
        amount_due_later,
        payment_status: 'pending_payment'
      });

      return Response.json({
        status: 'payment_option_selected',
        plan_type,
        amount_due_today,
        amount_due_later,
        discount_applied: discount_pct
      });
    }

    // Action: payment_received
    if (action === 'payment_received') {
      const { amount_received } = data;
      const paymentPlan = await base44.entities.PaymentPlan.filter({ consultation_id });
      
      if (!paymentPlan.length) {
        return Response.json({ error: 'Payment plan not found' }, { status: 404 });
      }

      const pp = paymentPlan[0];
      let new_status = pp.payment_status;
      
      if (amount_received >= pp.final_cost) {
        new_status = 'fully_paid';
      } else if (amount_received > 0) {
        new_status = 'partial_paid';
      }

      await base44.entities.PaymentPlan.update(pp.id, {
        payment_status: new_status
      });

      // If fully paid, trigger full workflow
      if (new_status === 'fully_paid') {
        return Response.json({
          status: 'payment_received',
          trigger_workflow: 'FULLY_CONFIRMED',
          next_action: 'notify_all_parties_and_finalize_bookings'
        });
      }

      return Response.json({
        status: 'payment_received',
        payment_status: new_status
      });
    }

    // Action: trigger_full_confirmation_workflow
    if (action === 'trigger_full_confirmation_workflow') {
      const consultation = await base44.entities.Consultation.get(consultation_id);
      const workflowEvent = await base44.entities.WorkflowEvent.filter({ consultation_id });
      
      if (!workflowEvent.length) {
        return Response.json({ error: 'Workflow not found' }, { status: 404 });
      }

      const we = workflowEvent[0];

      // Update workflow stage to 'travel'
      await base44.entities.WorkflowEvent.update(we.id, {
        stage: 'travel',
        travel_status: 'confirmed'
      });

      // Notify all parties
      const partners = await base44.entities.Partner.filter({ is_active: true });
      const quotes = await base44.entities.Quote.filter({ consultation_id });
      
      for (const quote of quotes) {
        if (quote.is_selected) {
          const partner = partners.find(p => p.id === quote.partner_id);
          if (partner) {
            await base44.entities.WorkflowNotification.create({
              workflow_event_id: we.id,
              recipient_type: 'partner',
              recipient_email: partner.email,
              notification_type: 'booking_confirmation',
              channel: 'email',
              content: `CONFIRMED: Please proceed with full booking for patient ${consultation.patient_name}. Procedure: ${consultation.procedure_interest}. Travel dates: ${consultation.preferred_date}`
            });
          }
        }
      }

      // Request client address
      await base44.entities.WorkflowNotification.create({
        workflow_event_id: we.id,
        recipient_type: 'patient',
        recipient_email: consultation.email,
        notification_type: 'quote_request',
        channel: 'email',
        content: `Please confirm your pickup address for airport transfer and complete pre-procedure preparations.`
      });

      return Response.json({
        status: 'full_confirmation_initiated',
        parties_notified: true,
        next_step: 'awaiting_client_address'
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});