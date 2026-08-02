import { createHandler, ok, err } from '../../shared/createHandler.ts';

// Public, anonymous — a finder scanning a QR code has no login and no case
// access. Looks the bag up by its own finder_contact_token (never trust a
// caller-supplied bag id), updates status server-side, and notifies the owner
// + admin without ever exposing the owner's identity back to the finder.
Deno.serve(createHandler(async ({ base44, body }) => {
  const { finder_token, finder_name, finder_phone, finder_email, current_location } = await body();
  if (!finder_token || !finder_name || !current_location) {
    return err('finder_token, finder_name and current_location are required');
  }

  const bags = await base44.asServiceRole.entities.LuggageToken.filter({ finder_contact_token: finder_token });
  const bag = bags[0];
  if (!bag) return err('Luggage tag not found', 404);

  const history = [...(bag.status_history || []), {
    status: 'found',
    location: current_location,
    timestamp: new Date().toISOString(),
    source: 'finder_scan',
  }];

  await base44.asServiceRole.entities.LuggageToken.update(bag.id, {
    current_status: 'found',
    last_seen_location: current_location,
    status_history: history,
    last_updated_at: new Date().toISOString(),
    return_coordinated_at: new Date().toISOString(),
  });

  if (bag.patient_email) {
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: bag.patient_email,
      subject: '🎉 Your Lost Bag Has Been Found!',
      body: `Great news! Someone found your bag.\n\nBag: ${bag.bag_label}\nFound by: ${finder_name}\nLocation: ${current_location}\n${finder_phone ? `Finder phone: ${finder_phone}` : ''}\n${finder_email ? `Finder email: ${finder_email}` : ''}\n\nYour concierge team will coordinate the return. We'll be in touch shortly.\n\nMorales Medical`,
    }).catch(() => {});
  }

  const adminEmail = Deno.env.get('ADMIN_EMAIL');
  if (adminEmail) {
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: adminEmail,
      subject: `🧳 Luggage Found — ${bag.token_code}`,
      body: `Lost bag has been found via QR scan.\n\nToken: ${bag.token_code}\nBag: ${bag.bag_label}\nOwner case: ${bag.case_id}\nFound by: ${finder_name} at ${current_location}\nFinder contact: ${finder_phone || finder_email || 'None provided'}`,
    }).catch(() => {});
  }

  return ok({ success: true });
}, { name: 'reportLuggageFound', requireAuth: false }));
