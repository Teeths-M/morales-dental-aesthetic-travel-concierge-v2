# Morales UI System
**9 production-grade components** — dark luxury aesthetic, fully accessible, zero external dependencies beyond the existing stack.

---

## Quick Import

```jsx
import { StatusBadge, DataTable, StatCard, PageHeader, ActionMenu, FormField, ConfirmDialog, InlineAlert, SectionLoader } from '@/components/ui-system';
```

---

## Component API Reference

---

### `<StatusBadge>`
Maps every DB status string to a semantic colour + animated dot. Covers CaseRecord, PartnerVerification, DoctorVerification, SoloCheckIn, PaymentTransaction.

```jsx
<StatusBadge status="verified" />
<StatusBadge status="pending" size="lg" dot={false} />
<StatusBadge status="escalated_2h" label="Overdue" size="sm" />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `status` | `string` | `''` | Raw DB status string |
| `label` | `string?` | auto | Override display label |
| `size` | `'sm'|'md'|'lg'` | `'md'` | Badge size |
| `dot` | `boolean` | `true` | Show status dot |

---

### `<DataTable>`
Sortable table with skeleton loading, empty states, and mobile card collapse.

```jsx
const columns = [
  { key: 'client_name', label: 'Patient', sortable: true },
  { key: 'status', label: 'Status', render: (val) => <StatusBadge status={val} /> },
  { key: 'created_date', label: 'Date', sortable: true, align: 'right',
    render: (val) => new Date(val).toLocaleDateString() },
];

<DataTable
  columns={columns}
  data={cases}
  isLoading={isLoading}
  onRowClick={(row) => navigate(`/admin/cases/${row.id}`)}
  emptyTitle="No cases yet"
  emptyMessage="Cases will appear here once patients submit consultations."
/>
```

| Prop | Type | Default |
|------|------|---------|
| `columns` | `Column[]` | `[]` |
| `data` | `object[]` | `[]` |
| `isLoading` | `boolean` | `false` |
| `onRowClick` | `(row) => void` | — |
| `emptyTitle` | `string` | `'No data yet'` |
| `emptyMessage` | `string` | — |
| `emptyAction` | `ReactNode` | — |
| `skeletonRows` | `number` | `5` |

---

### `<PageHeader>`
Consistent heading for all pages with breadcrumbs, back nav, badge slot, actions slot.

```jsx
<PageHeader
  title="Partner Verification"
  subtitle="Review and approve partner applications"
  breadcrumbs={[{ label: 'Admin', path: '/admin' }, { label: 'Partner Verification' }]}
  badge={<StatusBadge status="pending" size="sm" />}
  actions={
    <Button onClick={handleExport}>Export CSV</Button>
  }
/>
```

---

### `<StatCard>`
Dashboard metric card with trend indicator, icon, accent border, and bottom slot for sparklines.

```jsx
<StatCard
  title="Active Cases"
  value={42}
  subtitle="Updated just now"
  icon={Briefcase}
  iconColor="text-blue-400"
  trend={12.4}
  trendLabel="vs last month"
  accent="gold"
  onClick={() => navigate('/admin')}
/>

// With sparkline in bottom slot:
<StatCard title="Revenue" value="$28,400" accent="emerald">
  <MiniAreaChart data={revenueData} />
</StatCard>
```

---

### `<ActionMenu>`
Accessible ⋯ dropdown for table rows and cards. Keyboard navigable (arrows, Escape).

```jsx
<ActionMenu
  items={[
    { label: 'View Details',  icon: Eye,    onClick: () => navigate(`/cases/${row.id}`) },
    { label: 'Send Email',    icon: Mail,   onClick: () => handleEmail(row) },
    'divider',
    { label: 'Delete Case',   icon: Trash2, onClick: () => setDeleteTarget(row), variant: 'danger' },
  ]}
/>

// Custom trigger:
<ActionMenu
  trigger={<Button variant="outline" size="sm">Actions ▾</Button>}
  items={menuItems}
  align="left"
/>
```

---

### `<FormField>`
Full-featured accessible form field: text, email, tel, textarea, select. Error state, hint, prefix/suffix, character counter.

```jsx
<FormField
  id="patient-email"
  label="Email Address"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  error={errors.email}
  hint="We'll send your confirmation here"
  required
  prefix={<Mail className="w-4 h-4" />}
/>

<FormField
  label="Procedure Notes"
  type="textarea"
  value={notes}
  onChange={(e) => setNotes(e.target.value)}
  maxLength={500}
  rows={4}
/>

<FormField
  label="Document Type"
  type="select"
  value={docType}
  onChange={(e) => setDocType(e.target.value)}
  options={[
    { value: 'passport', label: 'Passport' },
    { value: 'visa', label: 'Visa' },
  ]}
/>
```

---

### `<ConfirmDialog>`
Modal confirmation for destructive actions. Focus-trapped, Escape to close, async-aware.

```jsx
const [deleteTarget, setDeleteTarget] = useState(null);

<ConfirmDialog
  isOpen={!!deleteTarget}
  onClose={() => setDeleteTarget(null)}
  onConfirm={async () => {
    await base44.entities.CaseRecord.delete(deleteTarget.id);
    toast({ title: 'Case deleted' });
  }}
  title="Delete this case?"
  message={`This will permanently remove ${deleteTarget?.client_name}'s case and all associated data. This cannot be undone.`}
  confirmLabel="Yes, delete"
  variant="danger"
/>
```

---

### `<InlineAlert>`
Sits in document flow — not a toast. For form errors, status notices, and contextual info.

```jsx
<InlineAlert
  variant="warning"
  title="Verification Expiring Soon"
  message="Dr. Smith's licence expires in 14 days. Request re-verification to avoid service interruption."
  actions={
    <button className="text-xs text-amber-300 underline" onClick={handleReVerify}>
      Trigger Re-verification
    </button>
  }
  onDismiss={() => setShowAlert(false)}
/>

<InlineAlert variant="error" message={apiError} />
<InlineAlert variant="success" title="Payment confirmed" message="Case advanced to Travel Coordination." />
```

---

### `<LoadingSpinner>` / `<SectionLoader>` / `<PageLoader>`

```jsx
// Inline — inside buttons, next to text
<LoadingSpinner size="sm" label="Saving…" />

// Section — replaces a card's content while loading
{isLoading ? <SectionLoader label="Loading cases…" /> : <DataTable ... />}

// Full page — initial app load
<PageLoader label="Preparing your dashboard" />
```

---

## Design Principles

| Principle | Implementation |
|-----------|---------------|
| **Loading always explicit** | Every component has skeleton/spinner states — never blank white flashes |
| **Empty always useful** | Custom icons, titles, messages, and action CTAs for every empty state |
| **Errors always helpful** | Inline errors with icons, not just red borders |
| **Accessible by default** | `role`, `aria-label`, `aria-invalid`, `aria-describedby`, keyboard nav on all interactive elements |
| **Mobile first** | DataTable collapses to card stack; all text scales; touch targets ≥44px |
| **Dark luxury aesthetic** | Matches `#060B16` background, `#D4AF37` gold accents, `border-white/[0.07]` borders from brand tokens |
| **Zero new dependencies** | Uses only React, Tailwind, lucide-react, framer-motion — all already installed |