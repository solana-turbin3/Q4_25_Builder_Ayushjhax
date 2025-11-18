"use client";

import { useState, useEffect } from 'react';

interface GoldPriceResponse {
  success: boolean;
  base: string;
  timestamp: number;
  rates: {
    INRXAU: number;
    XAU: number;
  };
}

export const useGoldPrice = () => {
  const [goldPrice, setGoldPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGoldPrice = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Check if we have a recent price in localStorage (within 12 hours)
        const lastFetchKey = 'goldPrice_lastFetch';
        const priceKey = 'goldPrice_value';
        const lastFetch = localStorage.getItem(lastFetchKey);
        const now = Date.now();
        const twelveHours = 12 * 60 * 60 * 1000; // 12 hours in milliseconds
        
        // If we have a recent price, use it instead of fetching
        if (lastFetch && (now - parseInt(lastFetch)) < twelveHours) {
          const cachedPrice = localStorage.getItem(priceKey);
          if (cachedPrice) {
            setGoldPrice(parseFloat(cachedPrice));
            setLoading(false);
            return;
          }
        }
        
        // Fetch live gold price from API
        const response = await fetch(
          'https://api.metalpriceapi.com/v1/latest?api_key=cb87369c9b7bd74e68189669ec449035&base=INR&currencies=XAU'
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch gold price');
        }
        
        const data: GoldPriceResponse = await response.json();
        
        if (data.success && data.rates.INRXAU) {
          // Convert from per ounce to per gram (1 ounce = 31.1035 grams)
          const pricePerGram = data.rates.INRXAU / 31.1035;
          setGoldPrice(pricePerGram);
          
          // Cache the price and timestamp
          localStorage.setItem(priceKey, pricePerGram.toString());
          localStorage.setItem(lastFetchKey, now.toString());
        } else {
          throw new Error('Invalid API response');
        }
      } catch (err) {
        console.error('Error fetching gold price:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch gold price');
        
        // Try to use cached price if available
        const cachedPrice = localStorage.getItem('goldPrice_value');
        if (cachedPrice) {
          setGoldPrice(parseFloat(cachedPrice));
        } else {
          // Fallback to default price if no cache and API fails
          setGoldPrice(12000);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchGoldPrice();
    
    // Check for updates every hour (but only fetch if 12+ hours have passed)
    const interval = setInterval(fetchGoldPrice, 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return { goldPrice, loading, error };
};
