import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { action, data } = payload;

    // Action: log_price_event
    if (action === 'log_price_event') {
      const { procedure, destination, package_cost, inclusions, recovery_days, booking_type } = data;
      
      // Generate anonymized ref
      const timestamp = new Date().toISOString();
      const anonymized_ref = `user_${Math.random().toString(36).substr(2, 5)}`;

      const logEntry = await base44.entities.PriceBroadcastLog.create({
        timestamp,
        anonymized_ref,
        procedure,
        destination,
        package_cost_usd: package_cost,
        inclusions,
        recovery_days,
        booking_type,
        is_published: true
      });

      return Response.json({
        status: 'logged',
        log_id: logEntry.id,
        anonymized_ref
      });
    }

    // Action: get_carousel_cards (last 15, published)
    if (action === 'get_carousel_cards') {
      const cards = await base44.entities.PriceBroadcastLog.filter({
        is_published: true
      });

      // Sort by newest first, limit to 15
      const sorted = cards.sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      ).slice(0, 15);

      return Response.json({
        status: 'success',
        cards: sorted.map(card => ({
          id: card.id,
          procedure: card.procedure,
          destination: card.destination,
          cost: card.package_cost_usd,
          type: card.booking_type,
          timestamp: card.timestamp,
          inclusions: card.inclusions,
          recovery_days: card.recovery_days
        }))
      });
    }

    // Action: get_trending_procedures
    if (action === 'get_trending_procedures') {
      const logs = await base44.entities.PriceBroadcastLog.list();
      
      // Count procedures in last 24h
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const last24h = logs.filter(log => 
        new Date(log.timestamp) > yesterday
      );

      const counts = {};
      last24h.forEach(log => {
        const key = `${log.procedure}|${log.destination}`;
        counts[key] = (counts[key] || 0) + 1;
      });

      // Get top 3
      const trending = Object.entries(counts)
        .map(([key, count]) => {
          const [proc, dest] = key.split('|');
          return { procedure: proc, destination: dest, count };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      return Response.json({
        status: 'success',
        trending
      });
    }

    // Action: create_price_estimate
    if (action === 'create_price_estimate') {
      const { user_email, user_name, user_phone, procedure, destination, preferred_month, health_conditions } = data;

      // Basic calculation (simplified)
      const basePrices = {
        'dental_implants': { surgery: 2500, hospital: 800, hotel: 400, flight: 800, transfer: 300, recovery: 200 },
        'knee_replacement': { surgery: 4500, hospital: 2000, hotel: 600, flight: 1000, transfer: 400, recovery: 300 },
        'hip_replacement': { surgery: 5000, hospital: 2500, hotel: 600, flight: 1000, transfer: 400, recovery: 300 },
        'rhinoplasty': { surgery: 3200, hospital: 1200, hotel: 400, flight: 800, transfer: 300, recovery: 150 },
        'breast_surgery': { surgery: 4000, hospital: 1500, hotel: 500, flight: 900, transfer: 350, recovery: 250 }
      };

      const procKey = procedure.toLowerCase().replace(/ /g, '_');
      const prices = basePrices[procKey] || basePrices['knee_replacement']; // fallback

      // Seasonal multiplier (Nov-Dec = higher, Jan-Feb = lower)
      let seasonalMultiplier = 1;
      if (preferred_month) {
        const month = parseInt(preferred_month.split('-')[1]);
        if (month >= 11 || month <= 2) seasonalMultiplier = 1.15;
        if (month >= 6 && month <= 8) seasonalMultiplier = 1.1;
      }

      const baseTotal = Object.values(prices).reduce((a, b) => a + b, 0);
      const totalLow = baseTotal * seasonalMultiplier;
      const totalHigh = totalLow * 1.15; // 15% variance for seasonal/premium options

      // Recovery days estimate
      const recoveryDays = {
        'dental_implants': 5,
        'knee_replacement': 10,
        'hip_replacement': 12,
        'rhinoplasty': 7,
        'breast_surgery': 7
      }[procKey] || 7;

      const estimate = await base44.entities.PriceEstimate.create({
        user_email,
        user_name,
        user_phone,
        procedure,
        destination,
        preferred_month,
        health_conditions,
        estimated_surgery_cost: prices.surgery,
        estimated_hospital_stay_cost: prices.hospital,
        estimated_hotel_cost: prices.hotel,
        estimated_flight_cost: prices.flight,
        estimated_transfer_cost: prices.transfer,
        estimated_recovery_cost: prices.recovery,
        estimated_total_low: Math.round(totalLow),
        estimated_total_high: Math.round(totalHigh),
        recovery_days: recoveryDays,
        estimate_status: 'generated'
      });

      // Log as price event
      await base44.entities.PriceBroadcastLog.create({
        timestamp: new Date().toISOString(),
        anonymized_ref: `user_${Math.random().toString(36).substr(2, 5)}`,
        procedure,
        destination,
        package_cost_usd: Math.round((totalLow + totalHigh) / 2),
        inclusions: ['Surgery', 'Hospital stay', 'Hotel', 'Flights', 'Transfers', 'Recovery care'],
        recovery_days: recoveryDays,
        booking_type: 'estimated',
        is_published: true
      });

      return Response.json({
        status: 'estimate_created',
        estimate_id: estimate.id,
        total_low: Math.round(totalLow),
        total_high: Math.round(totalHigh),
        recovery_days: recoveryDays
      });
    }

    // Action: initiate_consultation_fee
    if (action === 'initiate_consultation_fee') {
      const { user_email, procedure, destination, stripe_charge_id } = data;

      const fee = await base44.entities.ConsultationFee.create({
        email: user_email,
        procedure,
        destination,
        consultation_fee_amount: 49,
        fee_paid: true,
        fee_paid_at: new Date().toISOString(),
        stripe_charge_id,
        status: 'paid'
      });

      return Response.json({
        status: 'consultation_fee_created',
        fee_id: fee.id
      });
    }

    // Action: process_consultation_fee_refund
    if (action === 'process_consultation_fee_refund') {
      const { consultation_fee_id, package_booking_id, refund_method } = data;

      const fee = await base44.entities.ConsultationFee.get(consultation_fee_id);
      
      if (fee && fee.fee_paid && !fee.fee_refunded) {
        await base44.entities.ConsultationFee.update(consultation_fee_id, {
          fee_refunded: true,
          refund_method,
          package_booking_id,
          status: 'refunded'
        });

        return Response.json({
          status: 'fee_refunded',
          amount: 49,
          refund_method
        });
      }

      return Response.json({
        error: 'Fee already refunded or not found'
      }, { status: 400 });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});