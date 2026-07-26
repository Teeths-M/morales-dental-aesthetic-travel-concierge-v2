// @ts-nocheck — pre-existing type gaps in utility
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { analyseCompatibility, getViolations } from '@/lib/procedureCompatibility';

const CartContext = createContext();
const STORAGE_KEY = 'morales_consultation_cart';
const COUNTRY_KEY = 'morales_procedure_country';
const CITY_KEY = 'morales_procedure_city';
const CONDITIONS_KEY = 'morales_procedure_conditions';

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [procedureCountry, setProcedureCountryState] = useState(() => {
    try { return localStorage.getItem(COUNTRY_KEY) || ''; } catch { return ''; }
  });

  const [procedureCity, setProcedureCityState] = useState(() => {
    try { return localStorage.getItem(CITY_KEY) || ''; } catch { return ''; }
  });

  // Disclosed medical conditions (Section4MedicalHistory / ConditionsPickStep
  // labels) — collected in a different step than procedures in every real
  // flow, but the safety verdict below must react to whichever arrives last.
  const [medicalConditions, setMedicalConditionsState] = useState(() => {
    try {
      const saved = localStorage.getItem(CONDITIONS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Callers (e.g. ConciergeIntake) re-assert the current answer on every
  // render via a useEffect keyed on this function reference — bail out to
  // the SAME array when content hasn't actually changed, or that effect's own
  // dependency on this (otherwise-new-every-render) function would re-fire
  // forever: new reference → effect runs → setState → new reference → ...
  const setMedicalConditions = (conditions) => {
    const next = conditions || [];
    setMedicalConditionsState(prev => {
      const unchanged = prev.length === next.length && prev.every((c, i) => c === next[i]);
      if (unchanged) return prev;
      try { localStorage.setItem(CONDITIONS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // ── Safety Watcher: reactive risk profile ────────────────────────────────────
  // Re-evaluated on every cart OR condition change. `locked` is true when the
  // combined risk profile reaches RED (Golden M certification threshold
  // exceeded) — which a disclosed high-risk condition can now trigger on its
  // own, even for a procedure pair that would otherwise sit at YELLOW.
  const [safetyStatus, setSafetyStatus] = useState(() => ({ ...analyseCompatibility([]), violations: [] }));

  useEffect(() => {
    const analysis   = analyseCompatibility(items, medicalConditions);
    const { violations } = getViolations(items, medicalConditions);
    setSafetyStatus({ ...analysis, violations });
  }, [items, medicalConditions]);

  const locked = safetyStatus.level === 'RED';

  // ── Pivot state — open when Safety Watcher detects a Safe→RED transition ──
  const [pivotViolations, setPivotViolations] = useState([]);

  const openPivot = (vs) => setPivotViolations(vs && vs.length > 0 ? vs : safetyStatus.violations);
  // useCallback: this is in useAndroidBackButton's effect deps — an unstable
  // reference here tears down and re-adds the native back-button listener on
  // nearly every cart-state change.
  const closePivot = useCallback(() => setPivotViolations([]), []);

  // Accept the recommendation: remove the conflicting procedure(s) from the cart.
  // Each violation's pairLabel encodes "ProcA + ProcB"; `recommended` names which
  // to KEEP, so we derive which to remove.
  const acceptRecommendation = () => {
    const toRemove = pivotViolations
      .filter(v => v.recommended && v.pairLabel)
      .map(v => {
        const [a, b] = v.pairLabel.split(' + ');
        return a === v.recommended ? b : a;
      })
      .filter(Boolean);

    if (toRemove.length > 0) {
      setItems(prev => prev.filter(item => !toRemove.includes(item.name || item.title)));
    }
    setPivotViolations([]);
  };

  const setProcedureCountry = (country) => {
    setProcedureCountryState(country);
    try { localStorage.setItem(COUNTRY_KEY, country); } catch {}
  };

  const setProcedureCity = (city) => {
    setProcedureCityState(city);
    try { localStorage.setItem(CITY_KEY, city); } catch {}
  };

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  const addItem = (procedure) => {
    // Cart is locked when risk profile is RED — additions are blocked.
    // The SafetyWatcher component handles the redirect to consultation.
    if (locked) return;
    setItems(prev => {
      const existing = prev.find(item => item.name === procedure.name);
      if (existing) {
        return prev.map(item =>
          item.name === procedure.name
            ? { ...item, quantity: item.quantity + 1, patient_custom_note: procedure.patient_custom_note || item.patient_custom_note }
            : item
        );
      }
      return [...prev, { ...procedure, quantity: 1 }];
    });
  };

  const removeItem = (procedureName) => {
    setItems(prev => prev.filter(item => item.name !== procedureName));
  };

  const clearCart = () => {
    setItems([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  };

  const getTotalCount = () => items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clearCart, getTotalCount, procedureCountry, setProcedureCountry, procedureCity, setProcedureCity, medicalConditions, setMedicalConditions, safetyStatus, locked, pivotViolations, openPivot, closePivot, acceptRecommendation }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};
