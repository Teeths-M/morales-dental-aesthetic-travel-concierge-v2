import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AdminLayout from '@/components/layout/AdminLayout';
import PilotWaitlistTable from '@/components/admin/PilotWaitlistTable';
import { Button } from '@/components/ui/button';
import { Inbox, RefreshCw, Mail } from 'lucide-react';

/**
 * AdminPilotWaitlist — everyone who asked to join the pilot, in one place.
 *
 * Reads through getPilotWaitlist, which checks the caller's role server-side:
 * this page is the view, not the lock. Loading and empty are both real states,
 * and revisiting the page refetches, so a signup that arrives while the tab is
 * open shows up on the next look rather than needing a hard refresh.
 */

const BG = '#060B16';
const CARD = '#0C1A1D';
const BORDER = '#2A3F4A';

export default function AdminPilotWaitlist() {
  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['pilot-waitlist'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getPilotWaitlist', {});
      return res?.data || null;
    },
    staleTime: 15_000,
    refetchOnMount: 'always',
  });

  const rows = data?.rows || [];
  const waiting = data?.waiting ?? 0;

  return (
    <AdminLayout>
      <div style={{ padding: 24, background: BG, minHeight: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
          <Inbox style={{ width: 22, height: 22, color: '#D4AF37' }} />
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: '#fff' }}>Pilot waiting list</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            style={{ marginLeft: 'auto' }}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <p style={{ margin: '0 0 20px', fontSize: 13, color: 'rgba(255,255,255,0.5)', maxWidth: 720, lineHeight: 1.7 }}>
          Everyone who has asked to join the pilot from the website, newest first. Only an email
          address is collected, so there is nothing else to review.
        </p>

        {!isLoading && !isError && rows.length > 0 && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '10px 16px' }}>
              <p style={{ margin: 0, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
                Total
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 700, color: '#fff' }}>{data.total}</p>
            </div>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '10px 16px' }}>
              <p style={{ margin: 0, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
                Waiting
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 700, color: '#D4AF37' }}>{waiting}</p>
            </div>
          </div>
        )}

        {isLoading && (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 28 }}>
            <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Loading signups…</p>
          </div>
        )}

        {isError && (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 28, textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 14, color: '#fff', fontWeight: 600 }}>That didn’t load</p>
            <p style={{ margin: '6px 0 14px', fontSize: 12.5, color: 'rgba(255,255,255,0.45)' }}>
              The waiting list could not be read just now.
            </p>
            <Button size="sm" variant="outline" onClick={() => refetch()}>Try again</Button>
          </div>
        )}

        {!isLoading && !isError && rows.length === 0 && (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 32, textAlign: 'center' }}>
            <Mail style={{ width: 26, height: 26, color: 'rgba(255,255,255,0.25)', margin: '0 auto 10px' }} />
            <p style={{ margin: 0, fontSize: 14, color: '#fff', fontWeight: 600 }}>No one has joined yet</p>
            <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65 }}>
              Signups from the website’s “Join the pilot” form appear here the moment they are saved.
            </p>
          </div>
        )}

        {!isLoading && !isError && rows.length > 0 && <PilotWaitlistTable rows={rows} />}
      </div>
    </AdminLayout>
  );
}