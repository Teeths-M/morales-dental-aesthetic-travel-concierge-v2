import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Star, Heart, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

function StarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(0);

  const labels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="transition-transform hover:scale-110 focus:outline-none"
          >
            <Star
              className={`w-10 h-10 transition-colors ${
                star <= (hovered || value)
                  ? 'text-amber-400 fill-amber-400'
                  : 'text-slate-200 fill-slate-200'
              }`}
            />
          </button>
        ))}
      </div>
      <p className={`text-sm font-semibold transition-colors ${value ? 'text-amber-600' : 'text-muted-foreground'}`}>
        {labels[hovered || value] || 'Select a rating'}
      </p>
    </div>
  );
}

export default function PostSurgeryFeedback() {
  const _urlParams = new URLSearchParams(window.location.search);
  // Token is in the path: /feedback/:token
  const token = window.location.pathname.split('/feedback/')[1];

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error | invalid
  const [errorMsg, setErrorMsg] = useState('');

  // Validate token exists
  useEffect(() => {
    if (!token) setStatus('invalid');
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) return;

    setStatus('submitting');
    const res = await base44.functions.invoke('submitPostSurgeryFeedback', { token, rating, comment });

    if (res.data?.success) {
      setStatus('success');
    } else if (res.data?.error === 'Feedback already submitted') {
      setStatus('already_submitted');
    } else {
      setErrorMsg(res.data?.error || 'Something went wrong. Please try again.');
      setStatus('error');
    }
  };

  if (status === 'invalid') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-border p-10 text-center max-w-md w-full shadow-lg">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="font-display text-xl font-semibold text-foreground mb-2">Invalid Link</h2>
          <p className="text-muted-foreground text-sm">This feedback link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  if (status === 'already_submitted') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-border p-10 text-center max-w-md w-full shadow-lg">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <h2 className="font-display text-xl font-semibold text-foreground mb-2">Already Submitted</h2>
          <p className="text-muted-foreground text-sm">You've already shared your feedback. Thank you!</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background flex items-center justify-center p-4">
        <motion.div
          className="bg-white rounded-2xl border border-border p-10 text-center max-w-md w-full shadow-lg"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <Heart className="w-8 h-8 text-emerald-600 fill-emerald-600" />
          </div>
          <h2 className="font-display text-2xl font-semibold text-foreground mb-3">Thank You!</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Your feedback means the world to us and helps us provide even better care for patients on their medical journey.
          </p>
          <div className="mt-6 flex justify-center gap-1">
            {[1,2,3,4,5].map(s => (
              <Star key={s} className={`w-6 h-6 ${s <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}`} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">SAFE-T 4LIFE™ Medical Tourism Platform</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background flex items-center justify-center p-4">
      <motion.div
        className="bg-white rounded-2xl border border-border shadow-lg max-w-lg w-full overflow-hidden"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-primary to-primary/80 px-8 py-8 text-center">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Heart className="w-6 h-6 text-white fill-white" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-white mb-1">Share Your Experience</h1>
          <p className="text-primary-foreground/70 text-sm">Your recovery feedback helps us improve care for every patient</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-7">
          {/* Star Rating */}
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground mb-4">How would you rate your overall experience?</p>
            <StarRating value={rating} onChange={setRating} />
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Tell us about your journey <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={4}
              placeholder="How was your care team? How did you feel during recovery? Any suggestions for us?"
              className="w-full px-4 py-3 rounded-xl border border-border text-sm bg-secondary/20 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
            />
          </div>

          {status === 'error' && (
            <p className="text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {errorMsg}
            </p>
          )}

          <Button
            type="submit"
            disabled={rating === 0 || status === 'submitting'}
            className="w-full py-3 text-sm font-semibold"
          >
            {status === 'submitting' ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Submitting…
              </span>
            ) : 'Submit Feedback'}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Your response is private and only used to improve patient care.
          </p>
        </form>
      </motion.div>
    </div>
  );
}