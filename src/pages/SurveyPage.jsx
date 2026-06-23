import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Star, CheckCircle2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

const QUESTIONS = {
  patient: [
    'How would you rate your overall medical tourism experience?',
    'How satisfied were you with your doctor and clinical care?',
    'How well were your travel and logistics coordinated?',
    'How safe and supported did you feel throughout your journey?',
    'How likely are you to recommend Morales Medical to others?'
  ],
  doctor: [
    'How would you rate the quality of patient referrals you received?',
    'How efficient was the case coordination process?',
    'How clear and complete was the patient information provided?',
    'How responsive was the Morales support team?',
    'How likely are you to continue partnering with Morales Medical?'
  ],
  default: [
    'How would you rate your overall experience?',
    'How satisfied were you with the communication?',
    'How well were logistics managed?',
    'How professional was the team?',
    'How likely are you to recommend us?'
  ]
};

function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="transition-transform hover:scale-110"
        >
          <Star
            className={`w-8 h-8 transition-colors ${
              star <= (hover || value)
                ? 'text-amber-400 fill-amber-400'
                : 'text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function SurveyPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = window.location.pathname.split('/survey/')[1] || urlParams.get('token');

  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0); // 0 = welcome, 1-5 = questions, 6 = done
  const [answers, setAnswers] = useState([]);
  const [currentScore, setCurrentScore] = useState(0);
  const [currentComment, setCurrentComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      if (!token) { setError('Invalid survey link.'); setLoading(false); return; }
      const surveys = await base44.asServiceRole.entities.ReputationSurvey.filter({ token });
      const s = surveys[0];
      if (!s) { setError('Survey not found.'); setLoading(false); return; }
      if (s.submitted_at) { setError('This survey has already been completed. Thank you!'); setLoading(false); return; }
      setSurvey(s);
      setLoading(false);
    };
    load();
  }, [token]);

  const questions = survey ? (QUESTIONS[survey.role] || QUESTIONS.default) : QUESTIONS.default;

  const handleNext = () => {
    if (step === 0) { setStep(1); return; }
    if (currentScore === 0) return;
    const newAnswers = [...answers, { question: questions[step - 1], score: currentScore, comment: currentComment }];
    setAnswers(newAnswers);
    setCurrentScore(0);
    setCurrentComment('');
    if (step < questions.length) { setStep(step + 1); } else { handleSubmit(newAnswers); }
  };

  const handleSubmit = async (finalAnswers) => {
    setSubmitting(true);
    const res = await base44.functions.invoke('submitReputationSurvey', { token, answers: finalAnswers });
    setResult(res.data);
    setStep(questions.length + 1);
    setSubmitting(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md text-center">
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Survey Status</h2>
        <p className="text-gray-500">{error}</p>
      </div>
    </div>
  );

  const isDone = step > questions.length;
  const isPositive = result?.is_positive;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center p-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 max-w-lg w-full"
        >
          {step === 0 && (
            <div className="text-center">
              <div className="text-5xl mb-4">⭐</div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-3">How was your experience?</h1>
              <p className="text-gray-500 mb-6">Hi {survey?.patient_name || 'there'}! 5 quick questions — takes about 2 minutes.</p>
              <Button onClick={handleNext} className="bg-emerald-600 hover:bg-emerald-700 text-white w-full rounded-xl py-3">
                Start Survey →
              </Button>
            </div>
          )}

          {step > 0 && step <= questions.length && (
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-6">
                <span>Question {step} of {questions.length}</span>
                <span>{Math.round((step / questions.length) * 100)}% complete</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 mb-8">
                <div className="bg-emerald-500 h-1.5 rounded-full transition-all" style={{ width: `${(step / questions.length) * 100}%` }} />
              </div>
              <h2 className="text-lg font-semibold text-gray-800 mb-6">{questions[step - 1]}</h2>
              <StarRating value={currentScore} onChange={setCurrentScore} />
              <textarea
                value={currentComment}
                onChange={e => setCurrentComment(e.target.value)}
                placeholder="Add a comment (optional)..."
                className="w-full mt-6 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none"
                rows={3}
              />
              <Button
                onClick={handleNext}
                disabled={currentScore === 0 || submitting}
                className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3 disabled:opacity-50"
              >
                {step === questions.length ? (submitting ? 'Submitting...' : 'Submit Review') : 'Next →'}
              </Button>
            </div>
          )}

          {isDone && (
            <div className="text-center">
              <div className="text-5xl mb-4">{isPositive ? '🌟' : '🙏'}</div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">
                {isPositive ? 'Thank you so much!' : 'Thank you for your feedback'}
              </h2>
              <p className="text-gray-500 mb-6">
                {isPositive
                  ? `You gave us ${result?.overall_score}/5 stars. Your experience deserves to be shared!`
                  : 'Your feedback has been sent to our team. We\'ll be in touch soon to make things right.'}
              </p>
              {isPositive && result?.review_links && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-700 mb-4">Share your experience publicly:</p>
                  <a href={result.review_links.google} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 font-semibold transition-all">
                    <ExternalLink className="w-4 h-4" /> Review on Google
                  </a>
                  <a href={result.review_links.trustpilot} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-700 text-white rounded-xl py-3 font-semibold transition-all">
                    <ExternalLink className="w-4 h-4" /> Review on Trustpilot
                  </a>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}