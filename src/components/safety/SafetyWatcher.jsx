// @ts-nocheck
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/context/CartContext';

/**
 * SafetyWatcher — zero-render global reactive validation layer.
 *
 * Monitors the cart's combined risk profile on every change. When the
 * Safety Watcher detects a transition from a Safe/Review state to a
 * High Risk (RED) state, it immediately locks the cart and redirects
 * the client to professional consultation — enforcing the Golden M
 * certification safety threshold before any procedure can be finalised.
 *
 * Mount once inside <Router> + <CartProvider> (see App.jsx).
 * Renders nothing — pure side-effects only.
 */
export default function SafetyWatcher() {
  const { safetyStatus } = useCart();
  const navigate = useNavigate();
  const prevLevelRef = useRef(safetyStatus?.level ?? 'GREEN');

  useEffect(() => {
    const prev = prevLevelRef.current;
    const curr = safetyStatus?.level ?? 'GREEN';
    prevLevelRef.current = curr;

    if (prev !== 'RED' && curr === 'RED') {
      // Safe → High Risk transition detected.
      // Cart is already locked (addItem is gated in CartContext).
      // Redirect to professional consultation.
      navigate('/consultation', { state: { safetyLock: true, fromLevel: prev } });
    }
  }, [safetyStatus?.level, navigate]);

  return null;
}
