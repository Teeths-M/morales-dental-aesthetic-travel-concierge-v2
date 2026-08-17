import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, Upload, RotateCw, Trash2, ChevronUp, ChevronDown,
  Check, RefreshCw, Loader2, ShieldCheck, ShieldAlert, AlertTriangle, FileText, Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import {
  computeAverageBrightness, computeGlareRatio, estimateFrameFillRatio,
  estimateEdgeTouchScore, getLiveGuidance,
} from '@/lib/scannerHeuristics';
import { combinePagesToPdf } from '@/lib/pdfCombine';
import { friendlyError } from '@/lib/friendlyError';

// DocumentScannerCard — the M-Care Scanner. Renders inline in the chat via
// the same tool-name-match mechanism SafetyGateCard already uses (see
// MessageBubble.jsx: message.tool_calls?.map, matched on toolCall.name ===
// 'openMcareScanner'). toolCall.results carries the real owner context
// openMcareScanner resolved server-side (owner_type/owner_email/owner_id/
// document_type_hint) — never client-supplied.
//
// Live guidance is deliberately heuristic, not real computer-vision edge
// detection (no CV library exists in this repo, and building one was
// explicitly deferred) — the actual quality/verification verdict always
// comes from scanVaultDocument's server-side vision-LLM check, never from
// anything computed here. Deliberately deferred from this pass, alongside
// offline sync and the other-owner-type dashboards: true interactive
// drag-crop and perspective correction (both genuinely CV-adjacent scope) —
// Rotate is real (canvas re-encode), reorder/retake/delete are real.

const DOC_TYPE_LABELS = [
  ['passport', 'Passport'], ['national_id', 'National ID'], ['drivers_license', "Driver's License"],
  ['medical_record', 'Medical Record'], ['medical_report', 'Medical Report'], ['lab_result', 'Lab Result'],
  ['prescription', 'Prescription'], ['doctor_license', 'Doctor License'],
  ['professional_certificate', 'Professional Certificate'], ['insurance_document', 'Insurance Document'],
  ['visa', 'Visa'], ['flight_document', 'Flight Document'], ['hotel_confirmation', 'Hotel Confirmation'],
  ['invoice', 'Invoice'], ['consent_document', 'Consent Document'], ['travel_document', 'Travel Document'],
  ['partner_credential', 'Partner Credential'], ['security_credential', 'Security Credential'], ['other', 'Other'],
];
const LABEL_BY_TYPE = Object.fromEntries(DOC_TYPE_LABELS);

const GOLD = '#D4AF37';

function VerificationBadge({ status }) {
  const map = {
    verified: { icon: ShieldCheck, text: 'Verified against registry', bg: 'rgba(34,197,94,0.12)', fg: '#22C55E', border: 'rgba(34,197,94,0.3)' },
    requires_human_review: { icon: ShieldAlert, text: 'Pending human review', bg: 'rgba(212,175,55,0.12)', fg: GOLD, border: 'rgba(212,175,55,0.3)' },
    verification_failed: { icon: AlertTriangle, text: 'Verification failed', bg: 'rgba(239,68,68,0.12)', fg: '#EF4444', border: 'rgba(239,68,68,0.3)' },
    not_applicable_no_authority: { icon: FileText, text: 'Scanned — not independently verifiable', bg: 'rgba(156,163,175,0.12)', fg: '#9CA3AF', border: 'rgba(156,163,175,0.3)' },
  };
  const cfg = map[status] || map.not_applicable_no_authority;
  const Icon = cfg.icon;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: cfg.bg, border: `1px solid ${cfg.border}`, fontSize: 12, fontWeight: 600, color: cfg.fg }}>
      <Icon className="w-3.5 h-3.5" /> {cfg.text}
    </div>
  );
}

async function rotateBlob90(blob) {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.height;
  canvas.height = bitmap.width;
  const ctx = canvas.getContext('2d');
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), blob.type || 'image/jpeg', 0.92));
}

let pageIdCounter = 0;

export default function DocumentScannerCard({ toolCall, onRespond }) {
  const ctx = (() => {
    let r = toolCall?.results;
    if (typeof r === 'string') { try { r = JSON.parse(r); } catch { /* keep raw */ } }
    return r?.data || r || {};
  })();
  const ownerType = ctx.owner_type || 'patient';
  const ownerEmail = ctx.owner_email || '';
  const ownerId = ctx.owner_id || '';
  const documentTypeHint = ctx.document_type_hint || null;

  const [mode, setMode] = useState('choose'); // choose | camera | review | processing | result | done
  const [pages, setPages] = useState([]); // [{id, blob, url, rotation}]
  const [cameraError, setCameraError] = useState(null);
  const [liveHint, setLiveHint] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [processingError, setProcessingError] = useState(null);
  const [confirmType, setConfirmType] = useState('other');
  const [confirming, setConfirming] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const guidanceTimerRef = useRef(null);
  const prevFillRef = useRef(0);
  const fileInputRef = useRef(null);

  const stopCamera = useCallback(() => {
    if (guidanceTimerRef.current) { clearInterval(guidanceTimerRef.current); guidanceTimerRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera not available on this device.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setMode('camera');

      // Live heuristic guidance — sampled at ~2fps from a small offscreen
      // canvas, deliberately cheap. Never authoritative; see file header.
      const sampleCanvas = document.createElement('canvas');
      sampleCanvas.width = 120; sampleCanvas.height = 90;
      const sctx = sampleCanvas.getContext('2d', { willReadFrequently: true });
      guidanceTimerRef.current = setInterval(() => {
        const video = videoRef.current;
        if (!video || video.readyState < 2) return;
        sctx.drawImage(video, 0, 0, sampleCanvas.width, sampleCanvas.height);
        const full = sctx.getImageData(0, 0, sampleCanvas.width, sampleCanvas.height).data;
        const innerX = Math.round(sampleCanvas.width * 0.3), innerY = Math.round(sampleCanvas.height * 0.3);
        const innerW = Math.round(sampleCanvas.width * 0.4), innerH = Math.round(sampleCanvas.height * 0.4);
        const inner = sctx.getImageData(innerX, innerY, innerW, innerH).data;
        const edge = sctx.getImageData(0, 0, sampleCanvas.width, 4).data;
        const corner = sctx.getImageData(0, 0, 6, 6).data;

        const brightness = computeAverageBrightness(full);
        const glareRatio = computeGlareRatio(full);
        const frameFillRatio = estimateFrameFillRatio(inner, full);
        const edgeTouchScore = estimateEdgeTouchScore(edge, corner);
        const isStable = Math.abs(frameFillRatio - prevFillRef.current) < 0.08;
        prevFillRef.current = frameFillRatio;

        setLiveHint(getLiveGuidance({ brightness, glareRatio, frameFillRatio, edgeTouchScore, isStable }));
      }, 500);
    } catch (_e) {
      setCameraError('Could not access the camera. You can still upload a photo or PDF.');
    }
  }, []);

  const capturePage = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 960;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const id = ++pageIdCounter;
      setPages((prev) => [...prev, { id, blob, url: URL.createObjectURL(blob), rotation: 0 }]);
      stopCamera();
      setMode('review');
    }, 'image/jpeg', 0.92);
  }, [stopCamera]);

  const handleFilePick = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const newPages = files.map((f) => ({ id: ++pageIdCounter, blob: f, url: URL.createObjectURL(f), rotation: 0, isPdfOrUpload: true }));
    setPages((prev) => [...prev, ...newPages]);
    setMode('review');
    e.target.value = '';
  }, []);

  const removePage = (id) => setPages((prev) => prev.filter((p) => p.id !== id));
  const movePage = (id, dir) => setPages((prev) => {
    const idx = prev.findIndex((p) => p.id === id);
    const swapWith = idx + dir;
    if (idx < 0 || swapWith < 0 || swapWith >= prev.length) return prev;
    const copy = [...prev];
    [copy[idx], copy[swapWith]] = [copy[swapWith], copy[idx]];
    return copy;
  });
  const rotatePage = async (id) => {
    const page = pages.find((p) => p.id === id);
    if (!page || page.isPdfOrUpload) return;
    const rotated = await rotateBlob90(page.blob);
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, blob: rotated, url: URL.createObjectURL(rotated) } : p)));
  };

  const runScan = useCallback(async (userConfirmedType) => {
    setMode('processing');
    setProcessingError(null);
    try {
      const imagePages = pages.filter((p) => !p.isPdfOrUpload || p.blob.type?.startsWith('image/'));
      if (pages.length > 1 && imagePages.length > 1) {
        try { await combinePagesToPdf(imagePages.map((p) => p.blob)); } catch (_) { /* combined PDF is a nice-to-have, never blocks the scan */ }
      }

      const page_urls = [];
      for (const p of pages) {
        const file = p.blob instanceof File ? p.blob : new File([p.blob], `page-${p.id}.jpg`, { type: p.blob.type || 'image/jpeg' });
        const res = await base44.integrations.Core.UploadPrivateFile({ file });
        if (!res?.file_uri) throw new Error('Upload returned no file_uri');
        page_urls.push(res.file_uri);
      }

      const invokeRes = await base44.functions.invoke('scanVaultDocument', {
        page_urls,
        owner_type: ownerType,
        owner_email: ownerEmail,
        owner_id: ownerId,
        document_type_hint: userConfirmedType ? null : documentTypeHint,
        user_confirmed_type: userConfirmedType || null,
      });
      const result = invokeRes?.data ?? invokeRes;
      if (!result || result.error) throw new Error(result?.error || 'Scan failed');

      setScanResult(result);
      setMode('result');
    } catch (e) {
      setProcessingError(friendlyError(e, 'Could not process that scan. Please try again.', 'DocumentScannerCard'));
      setMode('review');
    }
  }, [pages, ownerType, ownerEmail, ownerId, documentTypeHint]);

  const finish = (message) => {
    setMode('done');
    onRespond?.(message);
  };

  const label = scanResult ? (LABEL_BY_TYPE[scanResult.document_type] || 'document') : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ marginTop: 8, borderRadius: 16, border: '1px solid #2A3F4A', background: '#0C1A1D', overflow: 'hidden', maxWidth: 380 }}
    >
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #2A3F4A', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Camera className="w-4 h-4" style={{ color: GOLD }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#F5F1E8', letterSpacing: '0.02em' }}>M-CARE SCANNER</span>
        {pages.length > 0 && mode !== 'done' && (
          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9CA3AF' }}>{pages.length} page{pages.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      <div style={{ padding: 14 }}>
        <AnimatePresence mode="wait">
          {mode === 'choose' && (
            <motion.div key="choose" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {documentTypeHint && (
                <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 10 }}>
                  Scanning your {LABEL_BY_TYPE[documentTypeHint]?.toLowerCase() || 'document'}.
                </p>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <Button onClick={startCamera} className="flex-1 gap-2" style={{ background: GOLD, color: '#0C1A1D' }}>
                  <Camera className="w-4 h-4" /> Camera
                </Button>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="flex-1 gap-2">
                  <Upload className="w-4 h-4" /> Upload
                </Button>
              </div>
              {cameraError && <p style={{ fontSize: 12, color: '#EF4444', marginTop: 8 }}>{cameraError}</p>}
              <input ref={fileInputRef} type="file" accept="image/*,application/pdf" multiple capture="environment" className="hidden" onChange={handleFilePick} />
            </motion.div>
          )}

          {mode === 'camera' && (
            <motion.div key="camera" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: '#000', aspectRatio: '4/3' }}>
                <video ref={videoRef} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 10, border: '2px dashed rgba(212,175,55,0.6)', borderRadius: 8, pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, textAlign: 'center' }}>
                  <span style={{ padding: '4px 10px', borderRadius: 999, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 12, fontWeight: 600 }}>
                    {liveHint || 'Position your document'}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <Button variant="outline" onClick={() => { stopCamera(); setMode(pages.length ? 'review' : 'choose'); }} className="flex-1">Cancel</Button>
                <Button onClick={capturePage} className="flex-1 gap-2" style={{ background: GOLD, color: '#0C1A1D' }}>
                  <Camera className="w-4 h-4" /> Capture
                </Button>
              </div>
            </motion.div>
          )}

          {mode === 'review' && (
            <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {processingError && <p style={{ fontSize: 12, color: '#EF4444', marginBottom: 8 }}>{processingError}</p>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
                {pages.map((p, i) => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 6, borderRadius: 8, background: 'rgba(255,255,255,0.03)' }}>
                    <img src={p.url} alt={`page ${i + 1}`} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} />
                    <span style={{ fontSize: 12, color: '#F5F1E8', flex: 1 }}>Page {i + 1}</span>
                    <button onClick={() => movePage(p.id, -1)} disabled={i === 0} style={{ opacity: i === 0 ? 0.3 : 1 }}><ChevronUp className="w-3.5 h-3.5 text-gray-400" /></button>
                    <button onClick={() => movePage(p.id, 1)} disabled={i === pages.length - 1} style={{ opacity: i === pages.length - 1 ? 0.3 : 1 }}><ChevronDown className="w-3.5 h-3.5 text-gray-400" /></button>
                    {!p.isPdfOrUpload && <button onClick={() => rotatePage(p.id)}><RotateCw className="w-3.5 h-3.5 text-gray-400" /></button>}
                    <button onClick={() => removePage(p.id)}><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <Button variant="outline" onClick={startCamera} className="flex-1 gap-2"><Plus className="w-4 h-4" /> Add Page</Button>
                <Button onClick={() => runScan()} disabled={!pages.length} className="flex-1 gap-2" style={{ background: GOLD, color: '#0C1A1D' }}>
                  <Check className="w-4 h-4" /> Use Scan
                </Button>
              </div>
            </motion.div>
          )}

          {mode === 'processing' && (
            <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: '20px 0' }}>
              <Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: GOLD }} />
              <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 10 }}>Reading and organizing your document...</p>
            </motion.div>
          )}

          {mode === 'result' && scanResult && (
            <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {scanResult.needs_type_confirmation ? (
                <div>
                  <p style={{ fontSize: 13, color: '#F5F1E8', marginBottom: 8 }}>
                    I scanned this successfully, but I'm not completely sure what type of document this is. What would you like me to save it as?
                  </p>
                  <select
                    value={confirmType}
                    onChange={(e) => setConfirmType(e.target.value)}
                    style={{ width: '100%', padding: 8, borderRadius: 8, background: '#0C1A1D', border: '1px solid #2A3F4A', color: '#F5F1E8', fontSize: 13, marginBottom: 10 }}
                  >
                    {DOC_TYPE_LABELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <Button onClick={() => runScan(confirmType)} className="w-full gap-2" style={{ background: GOLD, color: '#0C1A1D' }}>
                    <Check className="w-4 h-4" /> Save as {LABEL_BY_TYPE[confirmType]}
                  </Button>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#F5F1E8' }}>{label}</span>
                    <span style={{ fontSize: 11, color: '#9CA3AF' }}>{pages.length} page{pages.length !== 1 ? 's' : ''}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10, fontSize: 12, color: '#D1D5DB' }}>
                    <span>{scanResult.quality_status === 'passed' ? '✓ Readable' : `⚠ ${scanResult.quality_issues?.[0] || 'Quality issue detected'}`}</span>
                    <span>{scanResult.is_duplicate_of ? '⚠ Looks like a document you already have on file' : '✓ No duplicate detected'}</span>
                  </div>

                  <VerificationBadge status={scanResult.verification_status} />

                  {scanResult.plain_english_summary && (
                    <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 8 }}>{scanResult.plain_english_summary}</p>
                  )}

                  <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <Button variant="outline" onClick={() => { setScanResult(null); setPages([]); setMode('choose'); }} className="flex-1 gap-2">
                      <RefreshCw className="w-3.5 h-3.5" /> Scan Again
                    </Button>
                    <Button
                      disabled={confirming}
                      onClick={() => {
                        setConfirming(true);
                        finish(`I scanned my ${label.toLowerCase()} and added it to my vault.`);
                      }}
                      className="flex-1 gap-2"
                      style={{ background: GOLD, color: '#0C1A1D' }}
                    >
                      {scanResult.quality_status === 'passed' ? <><Check className="w-4 h-4" /> Add to Vault</> : 'Save Anyway'}
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {mode === 'done' && (
            <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#22C55E', fontSize: 13, fontWeight: 600 }}>
              <Check className="w-4 h-4" /> Added to your vault
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
