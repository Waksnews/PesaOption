/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { createChart, AreaSeries } from 'lightweight-charts';

interface TradingChartProps {
  symbol: string;
  currentPrice: number;
}

export const TradingChart: React.FC<TradingChartProps> = ({ symbol, currentPrice }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any | null>(null);
  const areaSeriesRef = useRef<any | null>(null);

  // Generate historical tick data
  const generateHistory = (basePrice: number) => {
    const data = [];
    const now = new Date();
    let currentVal = basePrice * 0.99; // start a bit lower
    
    // Create 100 historical tick points (spaced by 2 seconds)
    for (let i = 100; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 2000);
      const volatility = basePrice * 0.001;
      
      // Brownian random walk
      currentVal = currentVal + (Math.random() - 0.495) * volatility;
      
      data.push({
        time: Math.floor(time.getTime() / 1000) as any,
        value: Number(currentVal.toFixed(2)),
      });
    }
    return data;
  };

  // Setup the Lightweight Area Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { color: '#090C15' }, // Deep solid midnight blue
        textColor: '#848E9C',
      },
      grid: {
        vertLines: { color: '#131825' }, // subtle vertical grid lines
        horzLines: { color: '#131825' }, // subtle horizontal grid lines
      },
      crosshair: {
        mode: 1, // CrosshairMode.Normal
      },
      rightPriceScale: {
        borderColor: '#1E2538',
      },
      timeScale: {
        borderColor: '#1E2538',
        timeVisible: true,
        secondsVisible: true, // Display seconds like 14:48:11
      },
    });

    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: '#2563EB', // Deep blue line
      topColor: 'rgba(37, 99, 235, 0.25)', // glowing top gradient
      bottomColor: 'rgba(37, 99, 235, 0)', // transparent bottom gradient
      lineWidth: 2,
      priceLineColor: '#2563EB',
      priceLineVisible: true,
    });

    // Populate with history
    const history = generateHistory(currentPrice);
    areaSeries.setData(history);

    chartRef.current = chart;
    areaSeriesRef.current = areaSeries;

    // Use ResizeObserver for full responsiveness
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0 || !chartContainerRef.current) return;
      const { width } = entries[0].contentRect;
      chart.resize(width, 400);
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [symbol]); // Rebuild on asset change

  // Append new live tick price
  useEffect(() => {
    if (areaSeriesRef.current) {
      const now = new Date();
      const currentTickTime = Math.floor(now.getTime() / 1000);
      try {
        areaSeriesRef.current.update({
          time: currentTickTime as any,
          value: Number(currentPrice.toFixed(2)),
        });
      } catch (e) {
        // Safe skip on duplicate timestamp updates
      }
    }
  }, [currentPrice]);

  return (
    <div className="relative bg-[#090C15] border border-slate-800 rounded-2xl overflow-hidden p-4">
      {/* Zoom in/out floating controllers on bottom-left, matching the screenshot layout */}
      <div className="absolute bottom-16 left-6 flex flex-col space-y-1.5 z-10">
        <button 
          onClick={() => chartRef.current?.timeScale().zoomIn(1)}
          className="w-7 h-7 bg-slate-900/90 border border-slate-800 hover:bg-slate-800 text-slate-200 font-bold rounded flex items-center justify-center cursor-pointer select-none text-sm transition"
          title="Zoom In"
        >
          +
        </button>
        <button 
          onClick={() => chartRef.current?.timeScale().zoomOut(1)}
          className="w-7 h-7 bg-slate-900/90 border border-slate-800 hover:bg-slate-800 text-slate-200 font-bold rounded flex items-center justify-center cursor-pointer select-none text-sm transition"
          title="Zoom Out"
        >
          -
        </button>
      </div>

      {/* Chart Canvas */}
      <div ref={chartContainerRef} className="w-full h-[400px]" />
    </div>
  );
};
