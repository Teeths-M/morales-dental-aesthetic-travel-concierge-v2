import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verify admin access
        const user = await base44.auth.me();
        if (user?.role !== 'admin' && user?.role !== 'platform_admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const { consultation_id } = await req.json();
        
        if (!consultation_id) {
            return Response.json({ error: 'consultation_id is required' }, { status: 400 });
        }

        // BUG-R11-01 FIX: filter({ id }) never works — SDK cannot query the built-in `id` field.
        // Also switch to asServiceRole — admin calling this cannot read patient-owned consultations.
        const consultation = await base44.asServiceRole.entities.Consultation.get(consultation_id);
        if (!consultation) {
            return Response.json({ error: 'Consultation not found' }, { status: 404 });
        }

        let doctorPrice = 0;
        if (consultation.doctor_id) {
            // BUG-R11-01 FIX: use asServiceRole for DoctorPricing lookup
            const doctorPricings = await base44.asServiceRole.entities.DoctorPricing.filter({
                doctor_id: consultation.doctor_id
            });
            const matchingPricing = doctorPricings.find(p =>
                p.procedure_name === consultation.procedure_interest
            );
            doctorPrice = matchingPricing?.doctor_price_usd || 0;
        }

        // Calculate travel costs
        const flightCost = consultation.flight_cost_usd || 0;
        const hotelCost = consultation.hotel_cost_usd || 0;

        // Calculate taxi/transfer costs (all 6 legs)
        const transferCosts = [
            consultation.leg_1_cost_usd || 0,
            consultation.leg_2_cost_usd || 0,
            consultation.leg_3_cost_usd || 0,
            consultation.leg_4_cost_usd || 0,
            consultation.leg_5_cost_usd || 0,
            consultation.leg_6_cost_usd || 0
        ].reduce((sum, cost) => sum + cost, 0);

        // Calculate total base cost
        const baseCost = doctorPrice + flightCost + hotelCost + transferCosts;

        // Apply markup (default 30%)
        const markupPercentage = 0.30;
        const markupAmount = baseCost * markupPercentage;
        const totalCost = baseCost + markupAmount;

        // Generate PDF
        const doc = new jsPDF();
        
        // Header
        doc.setFillColor(22, 78, 64); // Primary color
        doc.rect(0, 0, 210, 30, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('SAFE-T 4LIFE', 20, 20);
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'normal');
        doc.text('Medical Tourism Package Proposal', 20, 28);

        // Patient Information
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Patient Information', 20, 50);
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`Name: ${consultation.patient_name}`, 20, 60);
        doc.text(`Email: ${consultation.email}`, 20, 68);
        if (consultation.phone) {
            doc.text(`Phone: ${consultation.phone}`, 20, 76);
        }
        doc.text(`Procedure: ${consultation.procedure_interest}`, 20, 84);
        if (consultation.preferred_date) {
            doc.text(`Preferred Date: ${new Date(consultation.preferred_date).toLocaleDateString()}`, 20, 92);
        }

        // Cost Breakdown
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Cost Breakdown', 20, 115);
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        let yPos = 125;
        
        if (doctorPrice > 0) {
            doc.text(`Medical Procedure: $${doctorPrice.toFixed(2)}`, 20, yPos);
            yPos += 8;
        }
        
        if (flightCost > 0) {
            doc.text(`Flight: $${flightCost.toFixed(2)}`, 20, yPos);
            yPos += 8;
        }
        
        if (hotelCost > 0) {
            doc.text(`Accommodation: $${hotelCost.toFixed(2)}`, 20, yPos);
            yPos += 8;
        }
        
        if (transferCosts > 0) {
            doc.text(`Ground Transportation: $${transferCosts.toFixed(2)}`, 20, yPos);
            yPos += 8;
        }
        
        yPos += 5;
        doc.setFont('helvetica', 'bold');
        doc.text(`Subtotal: $${baseCost.toFixed(2)}`, 20, yPos);
        yPos += 8;
        doc.text(`Service Fee (30%): $${markupAmount.toFixed(2)}`, 20, yPos);
        yPos += 8;
        
        doc.setFontSize(14);
        doc.setFillColor(22, 78, 64);
        doc.setTextColor(255, 255, 255);
        doc.text(`Total Package Cost: $${totalCost.toFixed(2)}`, 20, yPos);

        // Footer
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'normal');
        doc.text('This proposal is valid for 30 days from the date of issue.', 20, 270);
        doc.text('For questions or to proceed with booking, please contact us.', 20, 276);

        // Convert PDF to base64
        const pdfBase64 = doc.output('base64');
        const pdfUrl = `data:application/pdf;base64,${pdfBase64}`;

        // BUG-R11-01 FIX: use asServiceRole for email dispatch (admin-triggered function)
        if (consultation.email) {
            await base44.asServiceRole.integrations.Core.SendEmail({
                to: consultation.email,
                subject: 'Your SAFE-T 4LIFE Medical Tourism Package Proposal',
                body: `Dear ${consultation.patient_name},\n\nThank you for choosing SAFE-T 4LIFE for your medical tourism needs.\n\nPlease find attached your personalized package proposal.\n\nTotal Package Cost: $${totalCost.toFixed(2)}\n\nThis proposal includes:\n- Medical procedure with our certified partner\n- Flight arrangements\n- Accommodation\n- Ground transportation\n\nTo proceed with your booking or if you have any questions, please don't hesitate to contact us.\n\nBest regards,\nSAFE-T 4LIFE Team`
            });
        }

        return Response.json({ 
            success: true, 
            pdf_url: pdfUrl,
            total_cost: totalCost,
            breakdown: {
                doctor_price: doctorPrice,
                flight_cost: flightCost,
                hotel_cost: hotelCost,
                transfer_costs: transferCosts,
                base_cost: baseCost,
                markup: markupAmount
            }
        });
    } catch (error) {
        // BUG-R11-02 FIX: SEC-10 — never expose internal error details to callers
        console.error('[generateClientProposalPDF]', error);
        return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
    }
});