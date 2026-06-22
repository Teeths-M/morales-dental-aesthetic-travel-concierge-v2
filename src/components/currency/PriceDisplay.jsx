import React, { useState, useEffect } from 'react';
import { useCurrency } from '@/hooks/useCurrency';

/**
 * PriceDisplay - Displays a USD price converted to the user's selected currency
 * 
 * @param {number} usdAmount - The base price in USD
 * @param {string} className - Optional CSS classes for styling
 * @param {boolean} showOriginal - Whether to show the original USD price
 */
export default function PriceDisplay({ usdAmount, className = '', showOriginal = false }) {
  const { currency, getExchangeRate } = useCurrency();
  const [convertedPrice, setConvertedPrice] = useState(usdAmount);
  const [rate, setRate] = useState(1);

  useEffect(() => {
    const convertPrice = async () => {
      if (currency === 'USD') {
        setConvertedPrice(usdAmount);
        setRate(1);
        return;
      }

      const exchangeRate = await getExchangeRate(currency);
      setRate(exchangeRate);
      setConvertedPrice(usdAmount * exchangeRate);
    };

    convertPrice();
  }, [usdAmount, currency]);

  const formatCurrency = (amount, curr) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr,
    }).format(amount);
  };

  return (
    <div className={className}>
      <span className="text-lg font-semibold">
        {formatCurrency(convertedPrice, currency)}
      </span>
      {showOriginal && currency !== 'USD' && (
        <span className="text-sm text-muted-foreground ml-2">
          ({formatCurrency(usdAmount, 'USD')})
        </span>
      )}
      {rate !== 1 && (
        <p className="text-xs text-muted-foreground mt-1">
          Exchange rate: 1 USD = {rate.toFixed(4)} {currency}
        </p>
      )}
    </div>
  );
}