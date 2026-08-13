/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { marketSimulationService } from '../services/marketSimulationService';
import { useMarketStore } from '../stores/marketStore';

/**
 * Hook to initialize and manage live market simulation ticking engine
 */
export function useMarketSimulation() {
  const selectedSymbol = useMarketStore((state) => state.selectedSymbol);

  useEffect(() => {
    // Start simulation engine on mount
    marketSimulationService.start();

    // Subscribe to live tick updates
    const unsubscribe = marketSimulationService.subscribe((_prices, _symbol, _price) => {
      // Ticks automatically trigger Zustand state updates
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return {
    selectedSymbol,
    service: marketSimulationService,
  };
}
