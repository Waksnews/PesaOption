/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { createChart, AreaSeries } from 'lightweight-charts';

interface TradingChartProps {
  symbol: string;
  currentPrice: number;
}

export const TradingChartComponent: React.FC<TradingChartProps> = ({ symbol, currentPrice }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any | null>(null);
  const areaSeriesRef = useRef<any | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Generate historical tick data ending 2s before now
  const generateHistory = (basePrice: number) => {
    const data = [];
    const now = Math.floor(Date.now() / 1000);
    let currentVal = basePrice * 0.99; // start a bit lower
    
    // Create 100 historical tick points (spaced by 2 seconds) ending at now - 2
    for (let i = 100; i >= 1; i--) {
      const time = now - i * 2;
      const volatility = basePrice * 0.001;
      
      // Brownian random walk
      currentVal = currentVal + (Math.random() - 0.495) * volatility;
      
      data.push({
        time: time as any,
        value: Number(currentVal.toFixed(2)),
      });
    }
    lastTimeRef.current = now - 2;
    return data;
  };

  // Setup the Lightweight Area Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight || 300,
      layout: {
        background: { color: '#070B16' }, // Dark trading terminal canvas
        textColor: '#848E9C',
        fontSize: 11,
        fontFamily: 'JetBrains Mono, monospace',
      },
      grid: {
        vertLines: { color: 'rgba(30, 41, 59, 0.4)' }, // subtle vertical grid lines
        horzLines: { color: 'rgba(30, 41, 59, 0.4)' }, // subtle horizontal grid lines
      },
      crosshair: {
        mode: 1, // CrosshairMode.Normal
      },
      rightPriceScale: {
        borderColor: '#1E2538',
        scaleMargins: { top: 0.15, bottom: 0.15 },
        alignLabels: true,
      },
      timeScale: {
        borderColor: '#1E2538',
        timeVisible: true,
        secondsVisible: true, // Display seconds like 14:48:11
        rightOffset: 12,
        barSpacing: 8,
        minBarSpacing: 3,
        fixLeftEdge: false,
        fixRightEdge: true,
        lockVisibleTimeRangeOnResize: true,
      },
      // Disable horizontal panning/scrolling so chart always tracks live price at right edge
      handleScroll: false,
      handleScale: false,
    });

    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: '#2563EB', // Deep blue line
      topColor: 'rgba(37, 99, 235, 0.35)', // glowing top gradient
      bottomColor: 'rgba(37, 99, 235, 0.02)', // transparent bottom gradient
      lineWidth: 2,
      priceLineColor: '#2563EB',
      priceLineVisible: true,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 5,
      crosshairMarkerBorderColor: '#3B82F6',
      crosshairMarkerBackgroundColor: '#1D4ED8',
    });

    // Populate with history
    const history = generateHistory(currentPrice);
    areaSeries.setData(history);

    chartRef.current = chart;
    areaSeriesRef.current = areaSeries;

    // Initially scroll to rightmost edge
    chart.timeScale().scrollToRealTime();

    // Use ResizeObserver for full responsiveness
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0 || !chartContainerRef.current) return;
      const { width, height } = entries[0].contentRect;
      chart.resize(width, height || chartContainerRef.current.clientHeight || 300);
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      areaSeriesRef.current = null;
    };
  }, [symbol]); // Rebuild on asset change

  // Append new live tick price smoothly
  useEffect(() => {
    if (areaSeriesRef.current && currentPrice > 0) {
      const nowSec = Math.floor(Date.now() / 1000);
      const tickTime = Math.max(nowSec, lastTimeRef.current);
      lastTimeRef.current = tickTime;
      try {
        areaSeriesRef.current.update({
          time: tickTime as any,
          value: Number(currentPrice.toFixed(2)),
        });
      } catch (e) {
        // Safe skip on unexpected duplicate
      }
    }
  }, [currentPrice]);

  return (
    <div className="relative bg-[#090C15] border border-slate-800 rounded-2xl overflow-hidden p-2 sm:p-4">
      {/* Zoom in/out floating controllers on bottom-left */}
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
      <div ref={chartContainerRef} className="w-full h-[260px] sm:h-[350px] md:h-[400px]" />
    </div>
  );
};

export const TradingChart = React.memo(TradingChartComponent);
