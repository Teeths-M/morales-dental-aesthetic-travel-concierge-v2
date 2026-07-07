/**
 * Error Boundary Wrapper for Route-Level Pages
 * Catches uncaught render errors and shows a calm, honest fallback instead of
 * crashing the entire app. Reports to Sentry (if configured) and to the
 * Reliability & Incident Response system (ReliabilityIncident), and shows the
 * user a reference ID so a bug is never a silent, unexplained dead end.
 *
 * Usage: Wrap route-level pages, e.g.
 * <Route path="/admin" element={<ErrorBoundary><SimpleAdminDashboard /></ErrorBoundary>} />
 */
import React, { Component } from 'react';
import * as Sentry from '@sentry/react';
import { reportIncident } from '@/lib/incidentReporting';
import { ROUTES } from '@/lib/constants';

const GOLD = '#D4AF37';
const DARK = '#060B16';
const CARD = '#0C1A1D';
const BORDER = '#2A3F4A';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, incidentCode: null, description: '', descriptionSent: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
    try {
      Sentry.captureException(error, { extra: errorInfo });
    } catch (_) { /* Sentry may not be initialized — safe to ignore */ }

    const incidentCode = reportIncident({
      severity: 'high',
      source: 'frontend',
      feature: this.props.feature,
      errorMessage: error?.message,
      stackTrace: error?.stack,
    });
    this.setState({ incidentCode });
  }

  handleContinueLater = () => {
    window.location.href = ROUTES.DASHBOARD;
  };

  handleReturnHome = () => {
    window.location.href = ROUTES.HOME;
  };

  handleSubmitDescription = () => {
    if (!this.state.description.trim() || !this.state.incidentCode) return;
    reportIncident({ incidentCode: this.state.incidentCode, userDescription: this.state.description.trim() });
    this.setState({ descriptionSent: true });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: '100vh', background: DARK, display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: 20, fontFamily: '"SF Pro Display", system-ui, sans-serif',
      }}>
        <div style={{
          maxWidth: 440, width: '100%', background: CARD, border: `1px solid ${BORDER}`,
          borderRadius: 24, padding: '40px 32px', textAlign: 'center',
        }}>
          <img src="/morales-m-mark.png" alt="Morales" style={{ width: 44, height: 44, margin: '0 auto 20px', display: 'block' }} />

          <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: GOLD }}>
            We're Sorry
          </p>
          <h2 style={{ margin: '0 0 14px', fontSize: 22, fontWeight: 600, color: '#fff', lineHeight: 1.35 }}>
            Something didn't work the way it should have.
          </h2>
          <p style={{ margin: '0 0 20px', fontSize: 14, lineHeight: 1.65, color: 'rgba(255,255,255,0.6)' }}>
            Our engineering team has already been notified and we'll investigate right away.
          </p>

          {this.state.incidentCode && (
            <p style={{
              margin: '0 0 24px', fontSize: 12.5, fontFamily: 'monospace', color: 'rgba(255,255,255,0.45)',
              background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '10px 14px',
            }}>
              Reference ID: <span style={{ color: GOLD, fontWeight: 700 }}>{this.state.incidentCode}</span>
            </p>
          )}

          {!this.state.descriptionSent ? (
            <div style={{ marginBottom: 24, textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: 12.5, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
                Want to tell us what you were doing? It helps us fix this faster.
              </label>
              <textarea
                value={this.state.description}
                onChange={(e) => this.setState({ description: e.target.value })}
                rows={3}
                maxLength={2000}
                placeholder="Optional — describe what happened"
                style={{
                  width: '100%', boxSizing: 'border-box', borderRadius: 12, padding: '10px 12px',
                  background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, color: '#fff',
                  fontSize: 13, fontFamily: 'inherit', resize: 'vertical',
                }}
              />
              {this.state.description.trim() && (
                <button
                  type="button"
                  onClick={this.handleSubmitDescription}
                  style={{
                    marginTop: 10, padding: '9px 16px', borderRadius: 999, cursor: 'pointer',
                    background: 'rgba(212,175,55,0.12)', border: `1px solid ${GOLD}55`, color: GOLD,
                    fontSize: 12.5, fontWeight: 700,
                  }}
                >
                  Send
                </button>
              )}
            </div>
          ) : (
            <p style={{ margin: '0 0 24px', fontSize: 12.5, color: '#34d399' }}>Thank you — that's been added to the report.</p>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={this.handleContinueLater}
              style={{
                flex: 1, padding: '13px 16px', borderRadius: 12, cursor: 'pointer',
                background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, color: 'rgba(255,255,255,0.75)',
                fontSize: 13, fontWeight: 600,
              }}
            >
              Continue Later
            </button>
            <button
              type="button"
              onClick={this.handleReturnHome}
              style={{
                flex: 1, padding: '13px 16px', borderRadius: 12, cursor: 'pointer',
                background: GOLD, border: 'none', color: DARK, fontSize: 13, fontWeight: 700,
              }}
            >
              Return Home
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
