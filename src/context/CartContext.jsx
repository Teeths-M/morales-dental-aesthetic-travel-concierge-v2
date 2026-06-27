// @ts-nocheck — pre-existing type gaps in utility
import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();
const STORAGE_KEY = 'morales_consultation_cart';
const COUNTRY_KEY = 'morales_procedure_country';
const CITY_KEY = 'morales_procedure_city';

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
    <CartContext.Provider value={{ items, addItem, removeItem, clearCart, getTotalCount, procedureCountry, setProcedureCountry, procedureCity, setProcedureCity }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};
