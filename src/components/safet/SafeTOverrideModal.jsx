import React, { useRef, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X, PenLine, RotateCcw } from 'lucide-react';

const LIABILITY_TEXT = `By signing below, I — the undersigned patient — hereby acknowledge and agree to ALL of the following:

1. SAFE-T OVERRIDE: I have been informed that the SAFE-T 4LIFE™ AI risk assessment system has identified medical risk factors that recommend against proceeding with this medical travel consultation.

2. FULL PERSONAL LIABILITY: I voluntarily choose to override this safety recommendation and accept full personal liability for any and all medical outcomes, complications, adverse events, or consequences that may arise from proceeding.

3. PLATFORM INDEMNITY: I explicitly release and indemnify Morales Medical Travel Safety, its staff, and all partner providers from any and all clinical liability related to risks identified in my SAFE-T assessment.

4. INFORMED DECISION: I confirm I have read the risk flags identified in my assessment, I understand them, and I am making this decision of my own free will without coercion.

5. MANDATORY ARBITRATION: I agree that any disputes shall be resolved exclusively through binding arbitration seated in Port of Spain, Trinidad and Tobago.`;

export default function SafeTOverrideModal({ isOpen, onClose, onSuccess, workflowData, consultationId, caseRecordId }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [arbitrationAccepted, setArbitrationAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!isOpen) { setHasSigned(false); setArbitrationAccepted(false); setError(null); setDone(false); }
  }, [isOpen]);

  const startDraw = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.beginPath(); ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.strokeStyle = '#1a3a2e';
    ctx.lineTo(x, y); ctx.stroke();
    setHasSigned(true);
  };

  const stopDraw = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  };

  const handleSubmit = async () => {
    if (!hasSigned) { setError('Please sign the document before proceeding.'); return; }
    if (!arbitrationAccepted) { setError('You must accept the arbitration clause to proceed.'); return; }
    setError(null);
    setSubmitting(true);
    try {
      const signatureData = canvasRef.current.toDataURL('image/png');
      const now = new Date().toISOString();
      await base44.functions.invoke('safeTProceedWithOverride', {
        consultation_id: consultationId,
        workflow_id: workflowData?.workflow_id,
        case_record_id: caseRecordId,
        signature_data: signatureData,
        signature_timestamp: now,
        accepted_arbitration_clause: true,
        risk_flags: workflowData?.risk_flags || [],
        risk_summary: workflowData?.risk_summary || '',
      });
      setDone(true);
      setTimeout(() => { onSuccess(); onClose(); }, 3000);
    } catch (err) {
      setError('Submission failed: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, overflowY: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '620px', padding: '2rem' }}>

        {done ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '1rem' }}>✅</div>
            <h2 style={{ color: '#1a3a2e', marginBottom: '8px' }}>Consent Recorded</h2>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>Your signed consent has been archived. A copy has been emailed to you. Your case is now proceeding to doctor review.</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <AlertTriangle style={{ color: '#dc2626', width: 20, height: 20 }} />
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '2px' }}>SAFE-T Risk Override</span>
                </div>
                <h2 style={{ margin: 0, fontSize: '20px', color: '#1a3a2e' }}>Liability Waiver & Informed Consent</h2>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><X style={{ width: 20, height: 20, color: '#9ca3af' }} /></button>
            </div>

            {workflowData?.risk_flags?.length > 0 && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem' }}>
                <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 600, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '1px' }}>Risk flags identified by SAFE-T</p>
                {workflowData.risk_flags.map((flag, i) => (
                  <p key={i} style={{ margin: '4px 0', fontSize: '13px', color: '#7f1d1d' }}>• {flag}</p>
                ))}
              </div>
            )}

            <div style={{ background: '#f9fafb', borderLeft: '4px solid #1a3a2e', borderRadius: '0 8px 8px 0', padding: '1rem', marginBottom: '1.5rem', maxHeight: '220px', overflowY: 'auto' }}>
              <pre style={{ margin: 0, fontSize: '11px', color: '#374151', lineHeight: 1.8, whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif' }}>{LIABILITY_TEXT}</pre>
            </div>

            <p style={{ fontSize: '13px', fontWeight: 600, color: '#1a3a2e', marginBottom: '8px' }}>
              <PenLine style={{ width: 14, height: 14, display: 'inline', marginRight: '6px', verticalAlign: '-2px' }} />
              Sign below to proceed
            </p>
            <div style={{ position: 'relative', border: '2px solid #1a3a2e', borderRadius: '12px', marginBottom: '1rem', overflow: 'hidden' }}>
              <canvas ref={canvasRef} width={560} height={140} style={{ display: 'block', width: '100%', height: '140px', cursor: 'crosshair', touchAction: 'none' }}
                onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
              />
              {!hasSigned && <p style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: '#d1d5db', fontSize: '13px', pointerEvents: 'none', margin: 0 }}>Sign here</p>}
            </div>
            <button onClick={clearCanvas} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '1.5rem' }}>
              <RotateCcw style={{ width: 12, height: 12 }} /> Clear signature
            </button>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '1.5rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={arbitrationAccepted} onChange={e => setArbitrationAccepted(e.target.checked)} style={{ marginTop: '2px', width: '16px', height: '16px', flexShrink: 0 }} />
              <span style={{ fontSize: '12px', color: '#374151', lineHeight: 1.6 }}>I accept the mandatory arbitration clause and agree all disputes will be resolved exclusively in Port of Spain, Trinidad and Tobago. I have read and understood all five clauses above.</span>
            </label>

            {error && <p style={{ color: '#dc2626', fontSize: '13px', marginBottom: '1rem' }}>{error}</p>}

            <div style={{ display: 'flex', gap: '10px' }}>
              <Button variant="outline" onClick={onClose} style={{ flex: 1 }} disabled={submitting}>Go back</Button>
              <Button onClick={handleSubmit} disabled={submitting || !hasSigned || !arbitrationAccepted}
                style={{ flex: 2, background: '#1a3a2e', color: 'white', opacity: (!hasSigned || !arbitrationAccepted) ? 0.5 : 1 }}>
                {submitting ? 'Submitting...' : 'I Accept — Proceed With My Case'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}