# M-Care — Morales Dental & Aesthetic Travel Concierge

A medical tourism concierge platform where an AI agent, M-Care, coordinates the entire patient journey — safety screening, doctor matching, travel logistics, and 24/7 monitoring — while every safety-critical decision is made by deterministic code, never by the AI.

## The core principle

> "We built this to save lives, not to make profit."

Medical tourism can be genuinely dangerous when procedures are combined unsafely, or when a patient's risk profile isn't properly screened before booking. This platform enforces a hard rule: if a combination of procedures or a disclosed medical condition is clinically dangerous, the system blocks it — no bypass, no AI override, no exception for any business reason.

## How safety actually works

This is the one architectural decision the whole platform is built around, and it's enforced in code, not just policy:

- **Deterministic engines decide. AI only narrates.** Every safety score (`base44/functions/_shared/safeTEngine.ts`) is computed by pure, replayable logic — never by a language model. The result is written to an append-only, hash-chained log *before* any AI sees it, and the AI is only ever given the already-finalized outcome to explain in plain language. Any risk level an LLM tries to return is discarded.
- **Fail closed, always.** Ambiguity, an incomplete profile, or a detected prompt-injection attempt routes to human review — never to "low risk."
- **An automated red-team suite guards this on every push** (`tests/redteam/` — run via `npx playwright test --project=redteam`), with no network calls and no AI credits spent, specifically to catch any change that would weaken this guarantee. It runs live in this repo's Actions tab.

## M-Care: the agent

M-Care is a real, tool-calling AI agent — not a scripted chatbot. It can search for verified doctors, check destination safety and weather, coordinate ground transport, translate a doctor-patient conversation in real time, dispatch help in an emergency, and more, across a large set of individually-scoped, permissioned tools. It can reason and act across a genuinely wide surface area of the platform, but it structurally cannot touch a safety decision, a verification status, or a financial approval — those stay gated to deterministic code and, where required, a human.

## This runs itself

Data freshness, safety monitoring, and partner trust scoring run on real, scheduled automation — not manual button-clicks. See `.github/workflows/freshness-cron.yml` and this repo's Actions tab for the live, ongoing history of scheduled runs.

## Full engineering history

`CLAUDE.md` is the living record of how this platform was built and why — every architectural decision, every bug found and fixed, every feature shipped, documented as it happened rather than after the fact.

## Tech stack

React 18 + Vite · React Router v6 · TanStack React Query v5 · Tailwind CSS · Radix UI/shadcn · Base44 (BaaS) backend with a large suite of Deno edge functions

---

## Running this locally

This project is built on [Base44](http://Base44.com) — any change pushed to this repo is also reflected in the Base44 Builder.

### Prerequisites

1. Clone the repository using the project's Git URL
2. Navigate to the project directory
3. Install dependencies: `npm install`
4. Create an `.env.local` file and set the right environment variables

```
VITE_BASE44_APP_ID=your_app_id
VITE_BASE44_APP_BASE_URL=your_backend_url

e.g.
VITE_BASE44_APP_ID=cbef744a8545c389ef439ea6
VITE_BASE44_APP_BASE_URL=https://my-to-do-list-81bfaad7.base44.app
```

Run the app: `npm run dev`

### Publish your changes

Open [Base44.com](http://Base44.com) and click on Publish.

### Docs & Support

Documentation: [https://docs.base44.com/Integrations/Using-GitHub](https://docs.base44.com/Integrations/Using-GitHub)

Support: [https://app.base44.com/support](https://app.base44.com/support)
