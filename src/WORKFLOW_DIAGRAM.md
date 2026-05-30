# IQ200 Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        IQ200 MEDICAL TRAVEL PLATFORM                         │
│                              Complete Workflow                                │
└─────────────────────────────────────────────────────────────────────────────┘

                                    CLIENT
                                       │
                                       ▼
                        ┌──────────────────────────┐
                        │   /consultation Form     │
                        │  Client submits details  │
                        └──────────────────────────┘
                                       │
                                       ▼
                        ┌──────────────────────────┐
                        │   Case Entity Created    │
                        │   Status: Submitted      │
                        └──────────────────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    │ AUTOMATION #1 TRIGGERS              │
                    │ "Auto-trigger SAFE-T4LIFE Scan"     │
                    └──────────────────┬──────────────────┘
                                       ▼
                    ┌────────────────────────────────────┐
                    │  FUNCTION: safeT4LifeScan          │
                    │  • Screen medical conditions       │
                    │  • Check medications/allergies     │
                    │  • Calculate risk score            │
                    └────────────────────────────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    │                                     │
              ┌─────▼─────┐                         ┌─────▼─────┐
              │  PASSED   │                         │  BLOCKED  │
              └─────┬─────┘                         └─────┬─────┘
                    │                                     │
                    ▼                                     ▼
        Status: Safe-T-Reviewed                 Status: Admin-Review
                    │                           (Manual review required)
                    │
    ┌───────────────┴───────────────┐
    │ AUTOMATION #2 TRIGGERS        │
    │ "Auto-assign Doctor"          │
    └───────────────┬───────────────┘
                    ▼
    ┌──────────────────────────────────┐
    │  FUNCTION: assignDoctorToCase    │
    │  • Find doctors in country       │
    │  • Generate portal token         │
    │  • Send email with link          │
    └──────────────────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  DOCTOR PORTAL        │
        │  /portal/doctor/:token│
        │  • Review case         │
        │  • Submit quote        │
        │  • Confirm dates       │
        └───────────────────────┘
                    │
                    ▼
        Doctor sets:
        • treatment_cost
        • treatment_duration
        • recovery_days
        • confirmation_status = "Confirmed"
                    │
    ┌───────────────┴───────────────┐
    │ AUTOMATION #3 TRIGGERS        │
    │ "Auto-assign Travel Agency"   │
    └───────────────┬───────────────┘
                    ▼
    ┌──────────────────────────────────┐
    │ FUNCTION: assignTravelAgency     │
    │  • Find travel agencies          │
    │  • Generate portal token         │
    │  • Send email with link          │
    └──────────────────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │ TRAVEL PORTAL         │
        │ /portal/travel/:token │
        │ • Submit flight quote │
        │ • Submit hotel quote  │
        └───────────────────────┘
                    │
                    ▼
        Travel sets:
        • flight_cost
        • hotel_cost
        • travel_vendor_id
                    │
    ┌───────────────┴───────────────┐
    │ AUTOMATION #4 TRIGGERS        │
    │ "Auto-assign Chauffeur"       │
    └───────────────┬───────────────┘
                    ▼
    ┌──────────────────────────────────┐
    │ FUNCTION: assignChauffeurServices│
    │  • Find origin driver            │
    │  • Find destination driver       │
    │  • Send portal links             │
    └──────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
┌───────────────┐       ┌───────────────┐
│ ORIGIN DRIVER │       │ DEST DRIVER   │
│ Portal        │       │ Portal        │
│ Home→Airport  │       │ Airport→Hotel │
└───────────────┘       │ Hotel→Clinic  │
                        │ Clinic→Airport│
                        └───────────────┘
                    │
                    ▼
        Drivers set:
        • pickup_cost
        • dropoff_cost
        • local_transfer_cost
                    │
                    ▼
        ┌───────────────────────┐
        │  ADMIN DASHBOARD      │
        │      /iq200           │
        │  • Review all costs   │
        │  • Apply markup       │
        │  • Generate proposal  │
        └───────────────────────┘
                    │
                    ▼
        FUNCTION: iq200Pipeline
        • Calculate base_cost
        • Apply markup (30-35%)
        • Calculate final_package_price
        • Generate proposal_token
        • Send email to client
                    │
                    ▼
        ┌───────────────────────┐
        │ CLIENT PROPOSAL       │
        │ /portal/proposal/:token
        │ • Review package      │
        │ • Accept proposal     │
        │ • Make payment        │
        └───────────────────────┘
                    │
                    ▼
        Status: Proposal-Sent
                    │
                    ▼
        Client selects payment:
        • Full payment (5% discount)
        • 50% deposit
        • 25% deposit
                    │
                    ▼
        Status: Deposit-Paid
                    │
                    ▼
        Travel coordination:
        • Confirm flights
        • Confirm hotel
        • Confirm transfers
                    │
                    ▼
        Status: Ready-For-Travel
                    │
                    ▼
        Client travels:
        • Origin pickup
        • Flight to destination
        • Destination transfer
        • Procedure day
        • Recovery period
        • Return transfer
                    │
                    ▼
        Status: Procedure-In-Progress
                    │
                    ▼
        Status: Recovery
                    │
                    ▼
        Status: Completed
                    │
                    ▼
        ┌───────────────────────┐
        │   CASE CLOSED         │
        │  • Archive record     │
        │  • Request review     │
        │  • Aftercare followup │
        └───────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                              ADMIN CONTROLS                                  │
│                                                                              │
│  Dashboard: /iq200                                                           │
│  • View all cases in pipeline                                               │
│  • Manual workflow execution                                                │
│  • Pricing workbench                                                        │
│  • Case escalation                                                          │
│  • Audit trail                                                              │
│                                                                              │
│  Functions Available:                                                        │
│  • executeCaseWorkflow - Manual trigger                                     │
│  • iq200Pipeline - Admin actions                                            │
│  • generateClientProposal - Pricing calculation                             │
└─────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                              ENTITY STRUCTURE                                │
│                                                                              │
│  Case Entity Fields:                                                         │
│  ├── Core: status, case_priority, client info                               │
│  ├── Medical: risk_score, safe_t_result, conditions                         │
│  ├── Doctor: doctor_email, treatment_cost, confirmation_status              │
│  ├── Travel: travel_vendor_id, flight_cost, hotel_cost                      │
│  ├── Transfer: origin_driver_id, destination_driver_id, costs               │
│  ├── Pricing: base_cost, markup_percentage, final_package_price, profit     │
│  ├── Payment: payment_status, amount_paid, stripe_payment_id                │
│  └── Audit: timeline_log (complete history)                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Automation Summary

| # | Name | Trigger | Function | Condition |
|---|------|---------|----------|-----------|
| 1 | Auto-trigger SAFE-T4LIFE | Case create | safeT4LifeScan | Always |
| 2 | Auto-assign Doctor | Case update | assignDoctorToCase | safe_t_result = PASSED |
| 3 | Auto-assign Travel | Case update | assignTravelAgency | doctor_confirmation_status = Confirmed |
| 4 | Auto-assign Chauffeur | Case update | assignChauffeurServices | travel_vendor_id assigned |

## Function Summary

| Function | Purpose | Manual/Auto |
|----------|---------|-------------|
| safeT4LifeScan | Medical risk assessment | Auto |
| assignDoctorToCase | Doctor assignment | Auto |
| assignTravelAgency | Travel agency assignment | Auto |
| assignChauffeurServices | Chauffeur assignment | Auto |
| generateClientProposal | Calculate pricing | Manual |
| executeCaseWorkflow | Manual workflow trigger | Manual |
| iq200Pipeline | Pipeline orchestration | Manual |

## Portal URLs

| Portal | URL Pattern | Purpose |
|--------|-------------|---------|
| Doctor | `/portal/doctor/:token` | Submit treatment quote |
| Travel | `/portal/travel/:token` | Submit travel quote |
| Chauffeur | `/portal/transfer/:token` | Submit transfer quote |
| Client Proposal | `/portal/proposal/:token` | Accept package & pay |