# Procedure Request System

## Overview
Doctors can now request new procedures to be added to the MasterProcedure catalog. Admins review and approve requests, which automatically become available for client selection.

## Components Created

### 1. Entity: ProcedureRequest
**File:** `entities/ProcedureRequest.json`

**Fields:**
- `doctor_id`, `doctor_name`, `doctor_email` — Requesting doctor
- `procedure_name` (+ translations: es, fr, pt, de)
- `category` — Facial, Breast, Body, Dental, Wellness, Other
- `category_emoji` — Visual icon
- `description` — Detailed procedure info
- `specialty` — Required medical specialty
- `status` — pending | approved | rejected
- `submitted_date`, `reviewed_by`, `reviewed_date`, `review_notes`
- `procedure_id` — Auto-generated on approval

### 2. Doctor UI: Request New Procedure
**File:** `components/doctor-dashboard/ProcedureRequestForm.jsx`
- Added to DoctorDashboard as new tab "Request Procedure"
- Multi-language name fields (English, Spanish, French, Portuguese, German)
- Category selection with emoji
- Description and specialty fields
- Submit for admin review

### 3. Admin Review Panel
**File:** `components/admin/AdminProcedureRequests.jsx`
- Shows pending requests with approve/reject buttons
- Displays reviewed requests history
- Auto-generates procedure ID on approval
- Creates MasterProcedure record automatically

### 4. Backend Function
**File:** `functions/reviewProcedureRequest.js`
- Admin-only endpoint
- Approve action:
  - Generates procedure ID (e.g., FACE-NEW-1234)
  - Creates MasterProcedure with all translations
  - Updates ProcedureRequest status
  - Sends approval email to doctor
- Reject action:
  - Updates status with notes
  - Sends rejection email to doctor

### 5. Admin Page Route
**File:** `pages/AdminProcedureRequests.jsx`
- Protected admin-only route
- Accessible at `/admin/procedure-requests`
- Added to admin navigation sidebar

## Workflow

### Doctor Flow:
1. Login to DoctorDashboard
2. Navigate to "Request Procedure" tab
3. Fill in procedure details (name, category, description, specialty)
4. Submit for review
5. Receive email notification when approved/rejected

### Admin Flow:
1. Navigate to `/admin/procedure-requests`
2. Review pending requests
3. Click "Approve" or "Reject"
4. **If approved:**
   - MasterProcedure created automatically
   - Available in client onboarding modal immediately
   - Doctor notified via email
5. **If rejected:**
   - Add optional notes
   - Doctor notified via email

## Integration Points

### Client Onboarding Modal
**File:** `components/welcome/ProcedureWelcomeModal.jsx`
- Automatically includes newly approved procedures
- Loads from MasterProcedure entity (filtered by `is_active: true`)
- No manual updates needed

### Doctor Matching
**File:** `functions/matchDoctorsForProcedure.js`
- Works with newly added procedures automatically
- Matches based on MasterProcedure records

## Key Features

✅ **Multi-language Support** — Doctors can provide translations for global use
✅ **Auto-ID Generation** — Unique procedure IDs (FACE-RHINO-1234)
✅ **Email Notifications** — Doctors notified on approval/rejection
✅ **Instant Availability** — Approved procedures immediately visible to clients
✅ **Audit Trail** — Full history of requests, reviews, and decisions
✅ **Category Management** — Organized by procedure type with emoji icons

## Testing Checklist

- [ ] Doctor can submit procedure request
- [ ] Admin receives request in dashboard
- [ ] Approve creates MasterProcedure
- [ ] Reject updates status with notes
- [ ] Email notifications sent
- [ ] New procedure appears in client onboarding
- [ ] Doctor matching works for new procedure
- [ ] Multi-language names display correctly

## Future Enhancements

- Attach supporting documents (research papers, certifications)
- Doctor specialty verification before submission
- Bulk import/export of procedures
- Procedure deprecation workflow
- Category management UI for admins