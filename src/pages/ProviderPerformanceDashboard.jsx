import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Star, Clock, Users, TrendingUp, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import AdminLayout from '@/components/layout/AdminLayout';

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star
          key={s}
          className={`w-3.5 h-3.5 ${s <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}`}
        />
      ))}
    </div>
  );
}

function ResponseBadge({ hours }) {
  if (hours === null) return <span className="text-xs text-muted-foreground">No data</span>;
  if (hours <= 4) return <Badge className="bg-green-100 text-green-700 text-xs">{hours}h avg</Badge>;
  if (hours <= 24) return <Badge className="bg-amber-100 text-amber-700 text-xs">{hours}h avg</Badge>;
  return <Badge className="bg-red-100 text-red-700 text-xs">{hours}h avg</Badge>;
}

function ProviderRow({ name, type, avgRating, ratingCount, avgResponseHours, casesCount }) {
  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3">
        <div className="font-medium text-sm text-foreground">{name || '—'}</div>
        <div className="text-xs text-muted-foreground capitalize">{type}</div>
      </td>
      <td className="px-4 py-3 text-center text-sm text-muted-foreground">{casesCount}</td>
      <td className="px-4 py-3">
        {avgRating !== null ? (
          <div className="flex items-center gap-2">
            <StarRating rating={avgRating} />
            <span className="text-sm font-semibold text-foreground">{avgRating.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">({ratingCount})</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">No reviews yet</span>
        )}
      </td>
      <td className="px-4 py-3">
        <ResponseBadge hours={avgResponseHours} />
      </td>
    </tr>
  );
}

export default function ProviderPerformanceDashboard() {
  const { data: cases = [], isLoading: loadingCases } = useQuery({
    queryKey: ['provider_perf_cases'],
    queryFn: () => base44.entities.CaseRecord.list('-created_date', 500),
    staleTime: 60000,
  });

  const { data: recoverySessions = [], isLoading: loadingRecovery } = useQuery({
    queryKey: ['provider_perf_recovery'],
    queryFn: () => base44.entities.RecoverySession.list('-created_date', 500),
    staleTime: 60000,
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ['provider_perf_doctors'],
    queryFn: () => base44.entities.Doctor.list('full_name', 200),
    staleTime: 60000,
  });

  const { data: agencies = [] } = useQuery({
    queryKey: ['provider_perf_agencies'],
    queryFn: () => base44.entities.TravelAgency.list('agency_name', 200),
    staleTime: 60000,
  });

  const { data: taxis = [] } = useQuery({
    queryKey: ['provider_perf_taxis'],
    queryFn: () => base44.entities.TaxiService.list('company_name', 200),
    staleTime: 60000,
  });

  // Build feedback map: case_id → feedback_rating from RecoverySession
  const feedbackByCaseId = useMemo(() => {
    const map = {};
    recoverySessions.forEach(rs => {
      if (rs.case_id && rs.feedback_rating) {
        map[rs.case_id] = rs.feedback_rating;
      }
    });
    return map;
  }, [recoverySessions]);

  // Build doctor performance stats
  const doctorStats = useMemo(() => {
    return doctors.map(doc => {
      const docCases = cases.filter(c => c.doctor_selected === doc.full_name || c.doctor_email === doc.email);
      const ratings = docCases.map(c => feedbackByCaseId[c.id]).filter(Boolean);
      const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

      // Response time: created_date → doctor_confirmed_at
      const responseTimes = docCases
        .filter(c => c.doctor_confirmed_at && c.created_date)
        .map(c => (new Date(c.doctor_confirmed_at) - new Date(c.created_date)) / (1000 * 60 * 60));
      const avgResponseHours = responseTimes.length
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : null;

      return {
        id: doc.id,
        name: doc.full_name || doc.name,
        type: 'doctor',
        casesCount: docCases.length,
        avgRating,
        ratingCount: ratings.length,
        avgResponseHours,
      };
    }).filter(d => d.casesCount > 0);
  }, [doctors, cases, feedbackByCaseId]);

  // Build travel agency stats
  const agencyStats = useMemo(() => {
    return agencies.map(ag => {
      const agCases = cases.filter(c => c.travel_vendor_id === ag.id);
      const ratings = agCases.map(c => feedbackByCaseId[c.id]).filter(Boolean);
      const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

      const responseTimes = agCases
        .filter(c => c.itinerary_status === 'CONFIRMED' && c.doctor_confirmed_at && c.created_date)
        .map(c => (new Date(c.doctor_confirmed_at) - new Date(c.created_date)) / (1000 * 60 * 60));
      const avgResponseHours = responseTimes.length
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : null;

      return {
        id: ag.id,
        name: ag.agency_name,
        type: 'travel agency',
        casesCount: agCases.length,
        avgRating,
        ratingCount: ratings.length,
        avgResponseHours,
      };
    }).filter(a => a.casesCount > 0);
  }, [agencies, cases, feedbackByCaseId]);

  // Build taxi/chauffeur stats
  const taxiStats = useMemo(() => {
    return taxis.map(tx => {
      const txCases = cases.filter(c => c.origin_driver_id === tx.id || c.destination_driver_id === tx.id);
      const ratings = txCases.map(c => feedbackByCaseId[c.id]).filter(Boolean);
      const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

      const responseTimes = txCases
        .filter(c => c.transfer_status === 'CONFIRMED' && c.created_date && c.doctor_confirmed_at)
        .map(c => (new Date(c.doctor_confirmed_at) - new Date(c.created_date)) / (1000 * 60 * 60));
      const avgResponseHours = responseTimes.length
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : null;

      return {
        id: tx.id,
        name: tx.company_name || tx.driver_name,
        type: 'chauffeur',
        casesCount: txCases.length,
        avgRating,
        ratingCount: ratings.length,
        avgResponseHours,
      };
    }).filter(t => t.casesCount > 0);
  }, [taxis, cases, feedbackByCaseId]);

  const allProviders = [...doctorStats, ...agencyStats, ...taxiStats]
    .sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0));

  // Summary stats
  const allRatings = allProviders.filter(p => p.avgRating !== null).map(p => p.avgRating);
  const overallAvgRating = allRatings.length ? (allRatings.reduce((a, b) => a + b, 0) / allRatings.length).toFixed(1) : '—';
  const allResponseTimes = allProviders.filter(p => p.avgResponseHours !== null).map(p => p.avgResponseHours);
  const overallAvgResponse = allResponseTimes.length ? Math.round(allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length) : null;
  const topRated = allProviders.filter(p => p.avgRating >= 4.5).length;

  const isLoading = loadingCases || loadingRecovery;

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-display">Provider Performance</h1>
          <p className="text-muted-foreground mt-1">Average patient feedback ratings and consultation response times by provider</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-white border-0 shadow-md rounded-2xl">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Star className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{overallAvgRating}</p>
                  <p className="text-xs text-muted-foreground">Platform Avg Rating</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-0 shadow-md rounded-2xl">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{overallAvgResponse !== null ? `${overallAvgResponse}h` : '—'}</p>
                  <p className="text-xs text-muted-foreground">Avg Response Time</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-0 shadow-md rounded-2xl">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                  <Award className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{topRated}</p>
                  <p className="text-xs text-muted-foreground">Top Rated (≥4.5★)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-0 shadow-md rounded-2xl">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{allProviders.length}</p>
                  <p className="text-xs text-muted-foreground">Active Providers</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Provider table */}
        <Card className="bg-white border-0 shadow-md rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Provider Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                <div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin mr-2" />
                Loading provider data…
              </div>
            ) : allProviders.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                No provider data available yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="text-left px-4 py-3 font-medium">Provider</th>
                      <th className="text-center px-4 py-3 font-medium">Cases</th>
                      <th className="text-left px-4 py-3 font-medium">Avg Patient Rating</th>
                      <th className="text-left px-4 py-3 font-medium">Avg Response Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allProviders.map(p => (
                      <ProviderRow key={`${p.type}-${p.id}`} {...p} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}