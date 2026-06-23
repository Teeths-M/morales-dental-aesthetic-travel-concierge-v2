import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Star, ArrowLeft, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';

export default function PatientReviews() {
  const [user, setUser] = useState(null);
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      setUser(u);
      if (u) {
        const results = await base44.entities.ReputationSurvey.filter({ respondent_email: u.email }, '-created_date', 50);
        setSurveys(results);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const avgRating = surveys.length
    ? (surveys.reduce((sum, s) => sum + (s.overall_rating || 0), 0) / surveys.length).toFixed(1)
    : null;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <DashboardSidebar />
      <main className="flex-1 p-5 lg:p-8 overflow-y-auto max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-display text-2xl text-slate-900">My Reviews</h1>
            <p className="text-sm text-slate-500">Your feedback and experience reviews</p>
          </div>
        </div>

        {avgRating && (
          <Card className="mb-6 bg-gradient-to-r from-emerald-50 to-blue-50 border-emerald-200">
            <CardContent className="pt-5 flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center">
                <Star className="w-8 h-8 text-emerald-600 fill-emerald-400" />
              </div>
              <div>
                <p className="text-3xl font-semibold text-slate-900">{avgRating} <span className="text-base font-normal text-slate-500">/ 5</span></p>
                <p className="text-sm text-slate-600">Average across {surveys.length} review{surveys.length !== 1 ? 's' : ''}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : surveys.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">No reviews yet</p>
              <p className="text-sm text-slate-400 mt-1">Reviews will appear here after completing a service</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {surveys.map((survey) => (
              <Card key={survey.id} className="border border-slate-100 shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{survey.service_type || 'Service Review'}</CardTitle>
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map(star => (
                        <Star key={star} className={`w-4 h-4 ${star <= (survey.overall_rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {survey.comments && <p className="text-sm text-slate-600 mb-3">"{survey.comments}"</p>}
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{new Date(survey.created_date).toLocaleDateString()}</span>
                    <Badge className="bg-emerald-100 text-emerald-700">Submitted</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}