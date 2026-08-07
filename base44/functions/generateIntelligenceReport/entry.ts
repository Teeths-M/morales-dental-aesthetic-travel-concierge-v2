import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { jsPDF } from 'npm:jspdf@4.0.0';

// ── generateIntelligenceReport ──────────────────────────────────────────────
// Admin-only. Produces a PDF summarizing every partner's verification status,
// risk score, and the platform's monitoring activity — for legal/compliance
// teams. Returns a data-URI pdf_url the admin can preview and download.

const PAGE_WIDTH = 210;
const MARGIN = 14;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const ADMIN_ROLES = new Set(['admin', 'platform_admin']);

function safe(v: unknown, fallback = '—'): string {
  if (v === null || v === undefined || v === '') return fallback;
  return String(v);
}
function boolYesNo(v: unknown): string {
  if (v === true) return 'Yes';
  if (v === false) return 'No';
  return '—';
}
function fmtDate(v: unknown): string {
  if (!v) return '—';
  const d = new Date(v as string);
  if (isNaN(d.getTime())) return '—';
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user || !ADMIN_ROLES.has(user.role || '')) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // ── Gather all partner records (service-role; admin reads everything) ──
    const [doctors, agencies, taxis, security, companions, checkIns] = await Promise.all([
      base44.asServiceRole.entities.Doctor.list('-created_date', 500),
      base44.asServiceRole.entities.TravelAgency.list('-created_date', 500),
      base44.asServiceRole.entities.TaxiService.list('-created_date', 500),
      base44.asServiceRole.entities.SecurityAgency.list('-created_date', 500),
      base44.asServiceRole.entities.Companion.list('-created_date', 500),
      base44.asServiceRole.entities.SoloCheckIn.list('-created_date', 1000),
    ]);

    // ── Monitoring activity (platform-level) ──
    const checkInStats = {
      total: checkIns.length,
      pending: checkIns.filter((c: any) => c.status === 'pending').length,
      acknowledged: checkIns.filter((c: any) => c.status === 'acknowledged').length,
      escalated: checkIns.filter((c: any) => String(c.status || '').startsWith('escalated')).length,
      resolved: checkIns.filter((c: any) => c.status === 'resolved').length,
    };

    // Recent audit entries (last 100) for the monitoring-history section.
    let recentAudits: any[] = [];
    try {
      recentAudits = await base44.asServiceRole.entities.AuditLog.list('-timestamp', 100);
    } catch (_) { recentAudits = []; }

    // ── Build the PDF ──
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    let y = 0;

    const header = (title: string, subtitle: string) => {
      doc.setFillColor(6, 11, 22);
      doc.rect(0, 0, PAGE_WIDTH, 28, 'F');
      doc.setTextColor(212, 175, 55);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(title, MARGIN, 14);
      doc.setTextColor(230, 230, 230);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(subtitle, MARGIN, 21);
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(8);
      doc.text(`Generated ${new Date().toUTCString()}  ·  Confidential`, PAGE_WIDTH - MARGIN, 21, { align: 'right' });
      y = 36;
    };

    const sectionTitle = (text: string) => {
      if (y > 270) doc.addPage();
      y += 4;
      doc.setTextColor(6, 11, 22);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text(text, MARGIN, y);
      y += 3;
      doc.setDrawColor(212, 175, 55);
      doc.setLineWidth(0.4);
      doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
      y += 5;
    };

    const tableHeader = (cols: string[], widths: number[]) => {
      let x = MARGIN;
      doc.setFillColor(240, 240, 240);
      doc.rect(MARGIN, y - 3.5, CONTENT_WIDTH, 6, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 40, 40);
      cols.forEach((c, i) => {
        doc.text(c, x + 1, y, { maxwidth: widths[i] - 2 });
        x += widths[i];
      });
      y += 4.5;
    };

    const tableRow = (cols: string[], widths: number[], opts: { danger?: boolean } = {}) => {
      if (y > 280) { doc.addPage(); }
      let x = MARGIN;
      doc.setFontSize(7.6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(opts.danger ? 180 : 30, opts.danger ? 40 : 30, opts.danger ? 40 : 30);
      const rowH = 5.5;
      cols.forEach((c, i) => {
        const lines = doc.splitTextToSize(c, widths[i] - 2);
        doc.text(lines.slice(0, 2), x + 1, y, { maxwidth: widths[i] - 2 });
        x += widths[i];
      });
      y += rowH;
      doc.setDrawColor(225, 225, 225);
      doc.setLineWidth(0.1);
      doc.line(MARGIN, y - 1, PAGE_WIDTH - MARGIN, y - 1);
    };

    header('M-Care Intelligence Report', 'Partner Verification, Risk & Monitoring — Compliance Summary');

    // ── Platform summary ──
    const verified = (arr: any[], key = 'verification_status') =>
      arr.filter((p: any) => ['verified', 'manually_approved'].includes(p[key]) || p.license_verified === true).length;
    const failed = (arr: any[], key = 'verification_status') =>
      arr.filter((p: any) => ['failed', 'rejected'].includes(p[key])).length;

    sectionTitle('Platform Summary');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    const summary = [
      ['Doctors', doctors.length, verified(doctors), failed(doctors)],
      ['Travel Agencies', agencies.length, verified(agencies), failed(agencies)],
      ['Taxi / Transport', taxis.length, verified(taxis), failed(taxis)],
      ['Security Agencies', security.length, verified(security), failed(security)],
      ['Companions', companions.length, verified(companions), failed(companions)],
    ] as const;
    doc.text('Partner Type', MARGIN, y);
    doc.text('Total', MARGIN + 55, y);
    doc.text('Verified', MARGIN + 75, y);
    doc.text('Failed/Rejected', MARGIN + 100, y);
    y += 5;
    summary.forEach((row) => {
      doc.setFont('helvetica', 'bold');
      doc.text(String(row[0]), MARGIN, y);
      doc.setFont('helvetica', 'normal');
      doc.text(String(row[1]), MARGIN + 55, y);
      doc.text(String(row[2]), MARGIN + 75, y);
      doc.text(String(row[3]), MARGIN + 100, y);
      y += 5;
    });
    y += 2;
    doc.setFontSize(9);
    doc.text(`Monitoring: ${checkInStats.total} check-ins · ${checkInStats.pending} pending · ${checkInStats.acknowledged} acknowledged · ${checkInStats.escalated} escalated · ${checkInStats.resolved} resolved`, MARGIN, y);
    y += 6;

    // ── Doctor table ──
    sectionTitle('Doctors');
    const dw = [50, 34, 28, 30, 38];
    tableHeader(['Name / Clinic', 'Verification', 'License', 'Internet Risk', 'Rating (reviews)'], dw);
    doctors.forEach((d: any) => {
      const danger = ['failed', 'rejected', 'suspended'].includes(d.verification_status) || d.internet_risk_level === 'high';
      tableRow([
        safe(d.full_name) + (d.clinic_name ? `\n${d.clinic_name}` : ''),
        safe(d.verification_status),
        boolYesNo(d.license_verified),
        safe(d.internet_risk_level) + (d.internet_risk_score != null ? ` (${d.internet_risk_score})` : ''),
        `${safe(d.rating, '5.0')} (${safe(d.review_count, '0')})`,
      ], dw, { danger });
    });

    // ── Travel Agency table ──
    sectionTitle('Travel Agencies');
    const aw = [48, 32, 22, 24, 54];
    tableHeader(['Agency', 'Verification', 'IATA', 'AI Decision', 'HQ / Rating'], aw);
    agencies.forEach((a: any) => {
      const danger = ['failed', 'rejected'].includes(a.verification_status) || !a.iata_verified;
      tableRow([
        safe(a.agency_name),
        safe(a.verification_status),
        boolYesNo(a.iata_verified),
        safe(a.ai_decision),
        `${safe(a.headquarters_country)} · ${safe(a.rating, '5.0')}`,
      ], aw, { danger });
    });

    // ── Taxi / Transport table ──
    sectionTitle('Taxi / Transport Partners');
    const tw = [46, 32, 20, 22, 60];
    tableHeader(['Agency', 'Verification', 'License', 'Insurance', 'City · Quality · Trips'], tw);
    taxis.forEach((t: any) => {
      const danger = ['failed', 'rejected'].includes(t.verification_status) || !t.license_verified;
      tableRow([
        safe(t.agency_name),
        safe(t.verification_status),
        boolYesNo(t.license_verified),
        boolYesNo(t.insurance_verified),
        `${safe(t.operating_city)} · ${safe(t.quality_score, '5.0')} · ${safe(t.total_trips, '0')}`,
      ], tw, { danger });
    });

    // ── Security Agency table ──
    sectionTitle('Security Agencies');
    const sw = [44, 32, 30, 30, 44];
    tableHeader(['Agency', 'Verification', 'Background Check', 'License', 'Country · Responses'], sw);
    security.forEach((s: any) => {
      const danger = ['rejected', 'suspended'].includes(s.verification_status) || s.background_check_status === 'failed';
      tableRow([
        safe(s.agency_name),
        safe(s.verification_status),
        safe(s.background_check_status),
        safe(s.license_verification_status),
        `${safe(s.country)} · ${safe(s.total_responses, '0')}`,
      ], sw, { danger });
    });

    // ── Companion table ──
    sectionTitle('Companions');
    const cw = [44, 34, 28, 26, 48];
    tableHeader(['Name / Agency', 'Verification', 'Identity', 'Background', 'Rating · Bookings'], cw);
    companions.forEach((c: any) => {
      const danger = ['failed'].includes(c.verification_status) || c.background_check_status === 'failed';
      tableRow([
        safe(c.agency_name || c.full_name),
        safe(c.verification_status),
        safe(c.identity_verification_status),
        safe(c.background_check_status),
        `${safe(c.rating, '5.0')} · ${safe(c.total_bookings, '0')}`,
      ], cw, { danger });
    });

    // ── Monitoring history ──
    sectionTitle('Monitoring Activity — Recent Audit Log');
    const auditW = [34, 40, 36, 70];
    tableHeader(['Timestamp', 'Event', 'Actor', 'Resource'], auditW);
    recentAudits.slice(0, 25).forEach((a: any) => {
      tableRow([
        fmtDate(a.timestamp),
        safe(a.event_type),
        safe(a.actor_name || a.actor_role),
        safe(a.resource_type) + (a.resource_id ? ` (${String(a.resource_id).slice(0, 8)})` : ''),
      ], auditW);
    });

    // Footer on every page
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7.5);
      doc.setTextColor(150, 150, 150);
      doc.text(`M-Care Intelligence Report — Confidential · Page ${i} of ${pageCount}`, PAGE_WIDTH / 2, 290, { align: 'center' });
    }

    const pdfBase64 = doc.output('base64');
    const pdfUrl = `data:application/pdf;base64,${pdfBase64}`;

    return Response.json({
      success: true,
      pdf_url: pdfUrl,
      generated_at: new Date().toISOString(),
      generated_by: user.email,
      summary: {
        partners: {
          doctors: doctors.length,
          travel_agencies: agencies.length,
          taxis: taxis.length,
          security: security.length,
          companions: companions.length,
        },
        check_ins: checkInStats,
        recent_audit_count: recentAudits.length,
      },
    });
  } catch (error) {
    console.error('[generateIntelligenceReport]', error);
    return Response.json({ error: 'An internal error occurred.' }, { status: 500 });
  }
});