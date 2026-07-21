import { createHandler, ok, err } from '../_shared/createHandler.ts';

// Public, anonymous — /luggage/:token is scanned off a QR code with no login.
// Returns only what the finder needs to see; never the owner's email, case_id,
// or any other patient detail.
Deno.serve(createHandler(async ({ base44, body }) => {
  const { finder_token } = await body();
  if (!finder_token) return err('finder_token is required');

  const bags = await base44.asServiceRole.entities.LuggageToken.filter({ finder_contact_token: finder_token });
  const bag = bags[0];
  if (!bag) return ok({ found: false });

  return ok({ found: true, bag_label: bag.bag_label, token_code: bag.token_code });
}, { name: 'getLuggageByFinderToken', requireAuth: false }));
