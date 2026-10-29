import { useState } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * PilotForm — the only thing the page asks of anyone.
 *
 * Two fields, one button, and a promise underneath it. It writes one record and
 * confirms in four words; there is no sequence, no second step, and no email
 * capture bolted on afterwards.
 */
export default function PilotForm() {
  const [destination, setDestination] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | done
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();

    const place = destination.trim();
    const address = email.trim();

    if (!place || !address) {
      setError('Both fields, please.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setError('That email address does not look right.');
      return;
    }

    setStatus('sending');
    setError('');

    try {
      await base44.entities.PilotSignup.create({
        destination: place,
        email: address,
        source: 'pilot_page',
      });
      setStatus('done');
    } catch {
      setStatus('idle');
      setError('That did not go through. Try once more.');
    }
  };

  if (status === 'done') {
    return (
      <p className="mp-beat-text" role="status">
        You're on the list.
      </p>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="max-w-xl">
      <div>
        <label className="mp-label" htmlFor="pilot-destination">Where are you going?</label>
        <input
          id="pilot-destination"
          className="mp-input"
          type="text"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          autoComplete="country-name"
          required
        />
      </div>

      <div className="mt-8">
        <label className="mp-label" htmlFor="pilot-email">Email</label>
        <input
          id="pilot-email"
          className="mp-input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
      </div>

      {error && (
        <p className="mt-5 text-[0.95rem] text-[#e23b2e]" role="alert">{error}</p>
      )}

      <button type="submit" className="mp-cta mt-10" disabled={status === 'sending'}>
        {status === 'sending' ? 'Sending…' : 'Join the pilot'}
      </button>

      <p className="mp-fine mt-6 max-w-md">
        The pilot is running from Trinidad and Tobago. We will not share your details with anyone.
      </p>
    </form>
  );
}