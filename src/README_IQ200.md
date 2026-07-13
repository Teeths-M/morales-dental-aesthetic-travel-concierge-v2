# IQ200 Medical Travel Coordination Platform

## Complete System Overview

IQ200 is a comprehensive medical travel coordination platform that automates the entire patient journey from consultation to recovery.

## System Architecture

### 1. Client Consultation Flow
- **Entry Point**: `/intake` - AI concierge conversational intake (the legacy `/consultation` form now redirects here)
- **Auto-Processing**: SAFE-T4LIFE™ medical risk assessment runs automatically
- **Success Page**: `/consultation-success` - Stripe payment success landing (still used by the fee/deposit flow)

### 2. SAFE-T4LIFE™ Risk Assessment (Automated)
**Function**: `safeT4LifeScan`
- Screens for high-risk medical conditions
- Checks medication interactions
- Evaluates anesthesia history
- **Outcomes**: PASSED → Proceed, BLOCKED → Admin review

**Automation**: Triggers automatically on new Case creation

### 3. Doctor Assignment & Quote
**Function**: `assignDoctorToCase`
- Finds doctors in procedure country
- Generates secure portal token
- Sends email with portal link
- Doctor provides: treatment cost, duration, recovery time

**Portal**: `/portal/doctor/:token` - Doctor quote submission

**Automation**: Triggers when SAFE-T result = PASSED

### 4. Travel Agency Assignment
**Function**: `assignTravelAgency`
- Assigns travel agency
- Coordinates flights, hotel, transfers
- Agency submits quotes via portal

**Portal**: `/portal/travel/:token` - Travel agency quote submission

**Automation**: Triggers when doctor_confirmation_status = Confirmed

### 5. Chauffeur Service Assignment
**Function**: `assignChauffeurServices`
- Assigns origin driver (home → airport)
- Assigns destination driver (airport → hotel → clinic → airport)
- Both drivers submit quotes via portal

**Portal**: `/portal/transfer/:token` - Chauffeur quote submission

**Automation**: Triggers when travel_vendor_id is assigned

### 6. Admin Pricing & Proposal
**Function**: `iq200Pipeline`
- Admin reviews all vendor costs
- Applies markup (30%, 32%, or 35%)
- Generates client proposal
- Sends proposal email with secure link

**Portal**: `/portal/proposal/:token` - Client reviews and accepts

### 7. Payment Processing
- Consultation fee ($49) - optional credit toward package
- Deposit options: 25%, 50%, or full payment
- Stripe integration for secure payments

### 8. Case Status Pipeline
```
Submitted → Safe-T-Reviewed → Doctor-Pending → Vendor-Pending → 
Admin-Review → Proposal-Sent → PMP-25/PMP-50 → Deposit-Paid → 
Travel-Coordination → Ready-For-Travel → Procedure-In-Progress → 
Recovery → Completed
```

## Backend Functions

| Function | Purpose |
|----------|---------|
| `safeT4LifeScan` | Medical risk assessment |
| `assignDoctorToCase` | Doctor assignment & notification |
| `assignTravelAgency` | Travel agency assignment |
| `assignChauffeurServices` | Chauffeur service assignment |
| `generateClientProposal` | Calculate final package pricing |
| `executeCaseWorkflow` | Manual workflow execution |
| `iq200Pipeline` | Main pipeline orchestration |

## Automations

1. **Auto-trigger SAFE-T4LIFE Scan** - On Case create
2. **Auto-assign Doctor after SAFE-T Pass** - On Case update (safe_t_result = PASSED)
3. **Auto-assign Travel after Doctor Confirms** - On Case update (doctor_confirmation_status = Confirmed)
4. **Auto-assign Chauffeur after Travel Assignment** - On Case update (travel_vendor_id assigned)

## Entity Structure

### Case (Main Entity)
- **Core Fields**: status, case_priority, client info
- **Medical Fields**: medications, allergies, conditions, risk_score, safe_t_result
- **Doctor Fields**: doctor_email, doctor_selected, treatment_cost, confirmation_status
- **Travel Fields**: travel_vendor_id, flight_cost, hotel_cost, itinerary_status
- **Transfer Fields**: origin_driver_id, destination_driver_id, transfer costs
- **Pricing Fields**: base_cost, markup_percentage, final_package_price, profit
- **Payment Fields**: payment_status, amount_paid, stripe_payment_id
- **Timeline**: timeline_log (audit trail)

## Admin Dashboard

**URL**: `/iq200` (Admin only)

Features:
- Real-time case pipeline view
- Manual workflow execution
- Pricing workbench with markup calculator
- Case escalation controls
- Audit log tracking
- Stats dashboard

## Vendor Portals

All portals use secure token-based authentication:

1. **Doctor Portal**: `/portal/doctor/:token`
2. **Travel Agency Portal**: `/portal/travel/:token`
3. **Chauffeur Portal**: `/portal/transfer/:token`
4. **Client Proposal Portal**: `/portal/proposal/:token`

## Key Features

✅ **Fully Automated Pipeline** - Minimal admin intervention required
✅ **SAFE-T4LIFE™ Screening** - Proprietary medical risk assessment
✅ **Multi-Vendor Coordination** - Doctors, travel, chauffeurs
✅ **Dynamic Pricing Engine** - Cost calculation + markup
✅ **Secure Token Portals** - No login required for vendors
✅ **Complete Audit Trail** - Every action logged
✅ **Email Notifications** - Automated at each stage
✅ **Payment Processing** - Stripe integration
✅ **Admin Override Controls** - Manual escalation when needed

## Getting Started

1. **Client submits consultation** → `/intake`
2. **System auto-processes** through SAFE-T4LIFE
3. **Doctor assigned** → Provides quote via portal
4. **Travel assigned** → Submits flight/hotel quotes
5. **Chauffeur assigned** → Submits transfer quotes
6. **Admin reviews & prices** → `/iq200`
7. **Proposal sent to client** → Client accepts & pays
8. **Travel coordination** → All vendors confirmed
9. **Procedure & recovery** → Case completed

## Support

For technical support or questions, contact the IQ200 development team.