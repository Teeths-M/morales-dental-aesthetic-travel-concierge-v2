# Meridian / Morales — Product Principles

*"The Stripe model, applied to medical safety"*

> **Standing design constitution.** Read fully before any feature or UI decision.
> Whenever a new feature or screen is proposed, check it against these principles
> first and flag any conflict before building.

---

## Principle #1 — Simple is harder than complex

**Stripe:** Every extra click, form, decision creates friction.
**Us:** Every extra onboarding field, every extra confirmation screen, every extra document upload is friction a scared patient has to push through.

- Already applied: single OTP instead of two, age moved early, value-before-ask reorder.
- **Standing rule:** before adding any field/screen, ask *"does this serve the patient's decision or their safety?"* If not, cut it.

## Principle #2 — Design for the first five minutes

**Stripe:** A few lines of code to accept payment. First impressions compound.
**Us:** Landing → "Start your journey" → first real value (verified doctors found) has to happen fast, before the ask for contact details.

- The first five minutes is not onboarding forms — it's the moment the patient feels *someone is taking this as seriously as I am*.

## Principle #3 — Build for your core user

**Stripe:** Obsessed over developers, not "everyone who takes payments."
**Us:** Our core user is not "anyone booking medical travel." It's the person stacking procedures who is one bad decision from the outcome that killed the patient in the case that started this — anxious, often first-generation, often not fluent in medical jargon, sometimes not fluent in English.

- Every design decision gets tested against *her*, not against a generic "user persona."

## Principle #4 — Documentation is part of the product

**Stripe:** Docs aren't support — they're the product experience.
**Us:** The "why we ask" line under every intake question, the safety-review explanation ("I'm weighing combined anesthesia time…"), the confirmation email — none of this is a legal afterthought. It's the product's voice.

- If copy reads like a disclaimer instead of a person explaining something carefully, rewrite it.

## Principle #5 — Consistency builds trust

**Stripe:** Every screen, every button should feel familiar.
**Us:** One design system, enforced everywhere — the calm/light palette for decision-making screens, gold reserved only for trust markers, teal as the only "safe to proceed" action color. No screen should introduce a new visual language the patient has to relearn mid-journey.

## Principle #6 — Hide complexity behind simplicity

**Stripe:** Payments, fraud detection, compliance are complicated — the customer shouldn't feel that.
**Us:** The safety-scoring engine, the RED enforcement layers, the BAA/data sovereignty architecture, the staged-plan logic — all of it is genuinely complex. The patient should only ever see: *"Here's your plan. It's been reviewed. Here's why."* The complexity is our job to carry, not theirs to see.

## Principle #7 — Ship for the next decade

**Stripe:** Design for durability, not trends.
**Us:** This is the direct lesson from the Base44/no-code conversation — don't build core patient-data infrastructure on a trendy, fast, turnkey tool that can't sign a BAA or guarantee data residency. Build the compliance and data architecture like it has to survive a decade of real patients, real regulators, and real audits — because it does.

---

## The one-line version

Stripe made the internet's scariest technical problem feel effortless. We have to make the internet's scariest medical decision feel safe — without ever letting the patient see how hard that is to guarantee.
