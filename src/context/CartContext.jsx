import React, { createContext, useContext, useState } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);

  const addItem = (procedure) => {
    setItems(prev => {
      const existing = prev.find(item => item.name === procedure.name);
      if (existing) {
        return prev.map(item =>
          item.name === procedure.name
            ? { ...item, quantity: item.quantity + 1 }
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
  };

  const getTotalCount = () => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  };

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clearCart, getTotalCount }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};