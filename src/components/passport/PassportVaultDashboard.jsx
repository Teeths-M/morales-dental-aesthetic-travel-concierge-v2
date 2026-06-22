import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Shield, Clock, CheckCircle2, XCircle, Eye, EyeOff, RotateCcw, Users, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const ROLE_LABELS = {
  doctor: '🏥 Doctor',
  travel_agency: '✈️ Travel Agency',
  admin: '🔒 Admin',
  hospital_staff: '🏨 Hospital Staff'
};

const REASON_LABELS = {
  flight_booking: 'Flight Booking',
  hotel_booking: 'Hotel Booking',
  visa_processing: 'Visa Processing',
  clinic_verification: 'Clinic Verification',
  identity_check: 'Identity Check',
  emergency_response: 'Emergency Response',
  admin_audit: 'Admin Audit'
};

export default function PassportVaultDashboard({ patientEmail }) {
  const [vault, setVault] = useState(null);
  const [grants, setGrants] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('access');
  const [revoking, setRevoking] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [vaults, grantsData, logs] = await Promise.all([
      base44.entities.PassportVault.filter({ status: 'active' }),
      base44.entities.PassportAccessGrant.filter({ patient_email: patientEmail }),
      base44.entities.PassportAuditLog.filter({ patient_email: patientEmail }, '-timestamp', 50)
    ]);
    setVault(vaults[0] || null);
    setGrants(grantsData);
    setAuditLogs(logs);
    setLoading(false);
  };

  const handleApproveRevoke = async (grantToken, action) => {
    setRevoking(grantToken);
    await base44.functions.invoke('approveRevokePassportAccess', { grant_token: grantToken, action });
    await loadData();
    setRevoking(null);
  };

  const getStatusBadge = (status) => {
    const map = {
      approved: <Badge className="bg-green-100 text-green-700 text-xs">Active</Badge>,
      pending_approval: <Badge className="bg-amber-100 text-amber-700 text-xs">Awaiting Approval</Badge>,
      revoked: <Badge className="bg-red-100 text-red-700 text-xs">Revoked</Badge>,
      expired: <Badge className="bg-slate-100 text-slate-500 text-xs">Expired</Badge>
    };
    return map[status] || <Badge className="text-xs">{status}</Badge>;
  };

  const getActionIcon = (action) => {
    const map = {
      upload: '📤',
      view: '👁️',
      download: '⬇️',
      grant_access: '🔓',
      revoke_access: '🔒',
      request_access: '📨',
      approve_request: '✅',
      deny_request: '❌',
      access_expired: '⏰',
      delete: '🗑️'
    };
    return map[action] || '•';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!vault) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No passport vault created yet.</p>
      </div>
    );
  }

  const activeGrants = grants.filter(g => g.status === 'approved');
  const pendingGrants = grants.filter(g => g.status === 'pending_approval');

  return (
    <div className="space-y-5">
      {/* Vault Status Card */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Shield className="w-8 h-8 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-emerald-900 text-sm">Passport Vault — Active</p>
              <div className="mt-1.5 space-y-0.5 text-xs text-emerald-700">
                <p>Last 4: <span className="font-mono font-bold">{vault.redacted_for_display?.last_4_digits || '—'}</span></p>
                <p>Expires: <span className="font-bold">{vault.redacted_for_display?.expiry_date || '—'}</span></p>
                <p>Nationality: <span className="font-bold">{vault.redacted_for_display?.nationality || '—'}</span></p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-emerald-600 font-mono break-all max-w-[160px]">
              {vault.passport_token}
            </p>
            <p className="text-xs text-emerald-500 mt-1">Encrypted · Access-controlled · Audited</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-emerald-600">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Encrypted & access-controlled · {vault.access_count || 0} access events · Vault expires {vault.expires_at ? format(new Date(vault.expires_at), 'MMM d, yyyy') : 'never'}</span>
        </div>
      </div>

      {/* Pending Approvals */}
      {pendingGrants.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-bold text-amber-800 flex items-center gap-2">
            <Clock className="w-4 h-4" /> {pendingGrants.length} Pending Access Request{pendingGrants.length > 1 ? 's' : ''}
          </p>
          {pendingGrants.map(grant => (
            <div key={grant.id} className="bg-white rounded-xl p-3 border border-amber-200">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{grant.requester_name}</p>
                  <p className="text-xs text-slate-500">{ROLE_LABELS[grant.requester_role] || grant.requester_role} · {REASON_LABELS[grant.access_reason] || grant.access_reason}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Level: {grant.access_level?.replace(/_/g, ' ')}</p>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 border-red-200 text-red-600 hover:bg-red-50"
                    disabled={revoking === grant.grant_token}
                    onClick={() => handleApproveRevoke(grant.grant_token, 'deny')}
                  >
                    Deny
                  </Button>
                  <Button
                    size="sm"
                    className="text-xs h-7 bg-emerald-600 hover:bg-emerald-700"
                    disabled={revoking === grant.grant_token}
                    onClick={() => handleApproveRevoke(grant.grant_token, 'approve')}
                  >
                    Approve
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Who Has Access / Audit Log */}
      <div className="border border-border rounded-2xl overflow-hidden">
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('access')}
            className={`flex-1 text-xs font-semibold py-2.5 flex items-center justify-center gap-1.5 transition-colors ${activeTab === 'access' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'}`}
          >
            <Users className="w-3.5 h-3.5" /> Who Has Access ({activeGrants.length})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex-1 text-xs font-semibold py-2.5 flex items-center justify-center gap-1.5 transition-colors ${activeTab === 'audit' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'}`}
          >
            <FileText className="w-3.5 h-3.5" /> Audit Log ({auditLogs.length})
          </button>
        </div>

        <div className="p-4">
          {activeTab === 'access' ? (
            activeGrants.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No active access grants</p>
            ) : (
              <div className="space-y-3">
                {activeGrants.map(grant => (
                  <div key={grant.id} className="flex items-center justify-between gap-2 py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{grant.requester_name}</p>
                      <p className="text-xs text-muted-foreground">{ROLE_LABELS[grant.requester_role]} · {REASON_LABELS[grant.access_reason]}</p>
                      <p className="text-xs text-muted-foreground">
                        Expires {grant.expires_at ? format(new Date(grant.expires_at), 'MMM d, h:mm a') : '—'}
                        {grant.auto_approved && <span className="ml-1 text-emerald-600">(auto-approved)</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(grant.status)}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 border-red-200 text-red-600 hover:bg-red-50"
                        disabled={revoking === grant.grant_token}
                        onClick={() => handleApproveRevoke(grant.grant_token, 'revoke')}
                      >
                        Revoke
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {auditLogs.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No audit events yet</p>
              ) : auditLogs.map(log => (
                <div key={log.id} className="flex items-start gap-2.5 py-2 border-b border-border last:border-0">
                  <span className="text-base">{getActionIcon(log.action)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground capitalize">{log.action?.replace(/_/g, ' ')} by {log.actor_name || log.actor_role}</p>
                    {log.metadata?.fields_exposed && (
                      <p className="text-xs text-muted-foreground">Level: {log.metadata?.access_level?.replace(/_/g, ' ')}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{log.timestamp ? format(new Date(log.timestamp), 'MMM d, yyyy h:mm a') : '—'}</p>
                  </div>
                  <Badge className={`text-xs flex-shrink-0 ${log.status === 'success' ? 'bg-green-100 text-green-700' : log.status === 'denied' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                    {log.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}