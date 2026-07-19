# Demo Runbook — EVOLVE (Jul 22) & Buildathon (Jul 24)

One page. Rehearse the walk once on the DEPLOYED app before each event.

## The walk (works with zero backend — verified 2026-07-19)

1. Open **/intake** on the deployed app (phone or laptop — same bundle).
2. Name → age → at the procedure question, pick **All-on-4 / All-on-6** AND **Abdominoplasty (Tummy Tuck)**. The question invites "you can choose more than one" — this is a combination a real patient can genuinely request.
3. **The moment:** M refuses. The Safe-T readout goes RED, names the clinical reason (bleeding risk / anesthesia load across two major procedures), and recommends All-on-4 as stage one with the tummy tuck staged later. No override button exists — that is the point.
4. Say the line: *"Every other platform optimizes for the booking. M is the platform that turns it down when the combination is dangerous — the RED block is deterministic code, not an AI opinion, and the AI has no technical ability to override it. There's a CI red-team suite that fails the build if anyone weakens it."*
5. Accept the staged recommendation → continue a few steps to show the flow keeps working (destination, email — all client-side).

## STOP RULE

**Do not press final submit live.** The server-side safety re-check
(`validateProcedureSafety`) is not deployed yet, so submission fails closed
with an honest "we couldn't run the final safety check, nothing was submitted"
message. Correct behaviour — but not the note to end a demo on. End on the
refusal + staged recommendation. That's the money shot anyway.

## If asked "can I try it myself?"

"Yes — the safety walkthrough end to end. Final submission is gated behind a
server-side safety re-check that's mid-migration with our platform provider,
so the last button is off this week. Everything you just saw runs on your
device — which is also why it works in a clinic basement with no signal."

## If asked "is this real patient data?"

"No — no real patients yet. Admin boards say DEMO MODE / SAMPLE when showing
sample data; the platform never mixes fake data into real views unlabelled."

## Known-safe surfaces to show if time allows

- **/procedures** — full catalogue, picks carry back into the walkthrough without restarting.
- **Safe-T readout** — the deterministic analysis panel.
- **Admin → Situation Room / Mission Control** — both clearly badge DEMO MODE with no live cases.

## Do NOT show

- Payment/checkout (no live Stripe keys).
- Mesh beacon page in any framing other than what it self-labels: VISION DEMO.
- Anything requiring OTP login live on stage (Google OAuth flow is slow and can stall).

## One-sentence story

"We built the medical-travel platform that refuses the dangerous booking —
deterministic safety the AI cannot override, for the patient who was never
going to read the fine print."
