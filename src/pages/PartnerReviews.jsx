import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Star, ArrowLeft, TrendingUp, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function PartnerReviews() {
  const [user, setUser] = useState(null);
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      setUser(u);
      if (u) {
        const results = await base44.entities.ReputationSurvey.filter({ provider_email: u.email }, '-created_date', 50);
        setSurveys(results);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const avgRating = surveys.length
    ? (surveys.reduce((sum, s) => sum + (s.overall_rating || 0), 0) / surveys.length).toFixed(1)
    : null;

  const ratingCounts = [5,4,3,2,1].map(star => ({
    star,
    count: surveys.filter(s => s.overall_rating === star).length,
  }));

  return (
    <div className="min-h-screen bg-slate-50 p-5 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/partner-portal" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-display text-2xl text-slate-900">My Reviews</h1>
            <p className="text-sm text-slate-500">Patient feedback about your services</p>
          </div>
        </div>

        {avgRating && (
          <Card className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
            <CardContent className="pt-5">
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center">
                    <Star className="w-8 h-8 text-amber-500 fill-amber-400" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-slate-900">{avgRating} <span className="text-base font-normal text-slate-500">/ 5</span></p>
                    <p className="text-sm text-slate-600">{surveys.length} review{surveys.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="flex-1 space-y-1 min-w-[160px]">
                  {ratingCounts.map(({ star, count }) => (
                    <div key={star} className="flex items-center gap-2 text-xs">
                      <span className="w-3 text-slate-500">{star}</span>
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />
                      <div className="flex-1 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-1.5 bg-amber-400 rounded-full"
                          style={{ width: surveys.length ? `${(count / surveys.length) * 100}%` : '0%' }}
                        />
                      </div>
                      <span className="w-4 text-slate-400">{count}</span>
                    </div>
                  ))}
                </div>
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
              <p className="text-sm text-slate-400 mt-1">Patient reviews will appear here after completed services</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {surveys.map((survey) => (
              <Card key={survey.id} className="border border-slate-100 shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{survey.service_type || 'Patient Review'}</CardTitle>
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
                    <Badge className="bg-blue-100 text-blue-700">Received</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}