# Morales Platform — Quick Reference Guide

**Purpose:** Single-page reference for common development tasks  
**Last Updated:** 2026-06-17

---

## 🚀 Getting Started

### Project Structure
```
src/
├─ api/           # Base44 SDK client
├─ components/    # React components (120+)
├─ context/       # React contexts (auth, mode, cart)
├─ hooks/         # Custom hooks (useEntity, useVault)
├─ lib/           # Utilities, services, constants
├─ pages/         # Route components (80+)
├─ functions/     # Backend functions (130+)
└─ entities/      # Database schemas (65)
```

### Key Commands
```bash
npm run dev          # Start development server
npm run build        # Production build
npm run preview      # Preview production build
```

---

## 📦 Data Fetching

### Use useEntity Hook (Recommended)
```javascript
import { useEntity, useEntitySingle } from '@/hooks/useEntity';

// Fetch list
const { data: doctors, loading, error, reload } = useEntity('Doctor', {
  filter: { verification_status: 'verified' },
  sort: '-created_date',
  limit: 50
});

// Fetch single
const { data: caseRecord } = useEntitySingle('CaseRecord', caseId);
```

### Use Service Layer (When Available)
```javascript
import { caseService, vaultService } from '@/lib/services';

const cases = await caseService.getByStatus('Submitted', 20);
const hasDocs = await vaultService.hasDocuments(user.email);
```

### Direct SDK (Last Resort)
```javascript
import { base44 } from '@/api/base44Client';

const records = await base44.entities.CaseRecord.filter(
  { client_email: user.email },
  '-created_date',
  20  // Always specify limit!
);
```

---

## 🎨 Styling

### Use Brand Tokens (Never Hardcode Colors)
```javascript
import { BRAND, BRAND_STYLES } from '@/lib/brandTokens';

// Inline styles
<div style={BRAND_STYLES.emeraldBg}>
  <span style={BRAND_STYLES.goldText}>Luxury Text</span>
</div>

// Or use constants
<div style={{ color: BRAND.gold, backgroundColor: BRAND.emerald }}>
```

### Tailwind Classes (Preferred)
```jsx
// Use Tailwind with brand colors from index.css
<div className="bg-emerald text-gold font-display">
```

---

## 🔐 Authentication

### Check User Role
```javascript
import { useAuth } from '@/lib/AuthContext';
import { ROLES } from '@/lib/constants';

const { user, isAuthenticated } = useAuth();

if (user.role === ROLES.ADMIN || user.role === ROLES.PLATFORM_ADMIN) {
  // Admin-only logic
}
```

### Protected Routes (App.jsx)
```jsx
<Route element={<ProtectedRoute allowedRoles={[ROLES.CLIENT, ROLES.ADMIN]} />}>
  <Route path="/dashboard" element={<Dashboard />} />
</Route>
```

---

## 📝 Constants Reference

### Import from `/lib/constants.js`
```javascript
import { 
  ROLES,           // User roles enum
  CASE_STATUS,     // Case workflow statuses
  PAYMENT_STATUS,  // Payment states
  ROUTES,          // Route paths
  ERROR_MESSAGES,  // User-friendly errors
  // ... and 20+ more
} from '@/lib/constants';
```

### Common Values
```javascript
ROLES.ADMIN = 'admin'
ROLES.PLATFORM_ADMIN = 'platform_admin'
ROLES.CLIENT = 'client'

CASE_STATUS.SUBMITTED = 'Submitted'
CASE_STATUS.COMPLETED = 'Completed'

PAYMENT_STATUS.PAID_IN_FULL = 'Paid In Full'

SAFE_T_RESULT.PASSED = 'PASSED'
SAFE_T_RESULT.BLOCKED = 'BLOCKED'
```

---

## 🛠️ Error Handling

### Use Toast (Standard Pattern)
```javascript
import { useToast } from '@/components/ui/use-toast';

const { toast } = useToast();

try {
  await base44.entities.CaseRecord.create(data);
  toast({
    title: 'Success',
    description: 'Case created successfully',
  });
} catch (error) {
  toast({
    title: 'Error',
    description: ERROR_MESSAGES.SERVER_ERROR,
    variant: 'destructive',
  });
}
```

### Error Boundary (Automatic)
All routes wrapped in `<ErrorBoundary>` — catches uncaught errors and shows user-friendly fallback.

---

## 🔧 Backend Functions

### Invoke from Frontend
```javascript
import { base44 } from '@/api/base44Client';

const result = await base44.functions.invoke('safeT4LifeScan', {
  caseId: 'case_123',
  action: 'get_status'
});
```

### Common Functions
```javascript
// Payment
base44.functions.invoke('stripePaymentWebhook', {...})

// SAFE-T Risk
base44.functions.invoke('safeT4LifeScan', { caseId, action })

// Workflow
base44.functions.invoke('executeCaseWorkflow', { caseId })
base44.functions.invoke('portalHubWorkflow', { consultation_id })

// Vault
base44.functions.invoke('uploadToVault', payload)
base44.functions.invoke('downloadFromVault', { vault_token })
```

---

## 📊 Entity Schemas

### Read Schema
```javascript
import { base44 } from '@/api/base44Client';

const schema = base44.entities.CaseRecord.schema();
// Returns JSON schema for form generation
```

### Common Entities
```javascript
base44.entities.CaseRecord     // Patient cases
base44.entities.Doctor         // Doctor profiles
base44.entities.Consultation   // Consultations
base44.entities.PassportVault  // Encrypted documents
base44.entities.AuditLog       // Audit trail
```

---

## 🎯 Common Patterns

### Create Entity
```javascript
const record = await base44.entities.CaseRecord.create({
  client_name: 'John Doe',
  client_email: 'john@example.com',
  status: CASE_STATUS.SUBMITTED,
});
```

### Update Entity
```javascript
await base44.entities.CaseRecord.update(caseId, {
  status: CASE_STATUS.COMPLETED,
  timeline_log: [...old.timeline_log, { timestamp, action }]
});
```

### Filter with Limit (IMPORTANT)
```javascript
// ✅ Correct — bounded query
const cases = await base44.entities.CaseRecord.filter(
  { status: 'Submitted' },
  '-created_date',
  50  // Always specify limit!
);

// ❌ Wrong — unbounded (OOM risk)
const cases = await base44.entities.CaseRecord.filter({});
```

---

## 📱 Responsive Design

### Mobile-First Classes
```jsx
<div className="
  flex flex-col          /* Mobile: vertical */
  md:flex-row            /* Tablet+: horizontal */
  gap-4
  p-4
">
```

### Breakpoints
- Mobile: default (no prefix)
- Tablet: `md:` (768px+)
- Desktop: `lg:` (1024px+)
- Large: `xl:` (1280px+)

---

## 🔍 Debugging

### Check Current User
```javascript
const { user, isAuthenticated } = useAuth();
console.log('User:', user);
```

### Inspect Entity Data
```javascript
const { data, loading, error } = useEntity('CaseRecord', { limit: 5 });
console.log('Cases:', data);
```

### Test Backend Function
```javascript
// In browser console
const result = await base44.functions.invoke('functionName', { param: 'value' });
console.log(result);
```

---

## 📚 Documentation

### Architecture
- `ARCHITECTURE_AUDIT.md` — Full audit & recommendations
- `REFACTOR_SUMMARY.md` — Phase 1 execution summary
- `SECURITY_AUDIT.md` — Security compliance report

### Guides
- `PRODUCTION_DEPLOYMENT_GUIDE.md` — Deployment checklist
- `AI_GOVERNANCE_STANDARD.md` — AI usage policies
- `DOCTOR_VERIFICATION_SYSTEM.md` — Verification workflow

---

## 🆘 Troubleshooting

### "asServiceRole is not defined"
**Cause:** Using `asServiceRole` in frontend code  
**Fix:** Only use `asServiceRole` in backend functions

### "Service token required"
**Cause:** base44Client.js Proxy wrapper (RESOLVED in v1.1)  
**Fix:** Ensure you're on latest version

### "Entity not found"
**Cause:** Entity name typo or doesn't exist  
**Fix:** Check entity name matches schema file exactly

### Infinite loading
**Cause:** Unbounded query or missing error handling  
**Fix:** Add limit parameter, check browser console for errors

---

## 📞 Support

- **Platform Issues:** Base44 dashboard → Support
- **App Bugs:** Check `ARCHITECTURE_AUDIT.md` for known issues
- **Questions:** Review this guide or existing code patterns

---

**Remember:** When in doubt, follow existing patterns in the codebase. Consistency > cleverness.