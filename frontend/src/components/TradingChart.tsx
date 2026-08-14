/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { createChart, AreaSeries, CandlestickSeries, HistogramSeries, IChartApi, ISeriesApi } from 'lightweight-charts';
import { useMarketStore } from '../stores/marketStore';
import { marketSimulationService } from '../services/marketSimulationService';
import { BarChart2, TrendingUp } from 'lucide-react';

interface TradingChartProps {
  symbol: string;
  currentPrice: number;
}

export const TradingChartComponent: React.FC<TradingChartProps> = ({ symbol }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<any> | null>(null);

  const { 
    chartType, setChartType, 
    candleTimeframe, setCandleTimeframe,
    getCandles, getVolumes
  } = useMarketStore();

  // Initialize and rebuild chart when symbol or chartType changes
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Destroy existing chart instance
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      mainSeriesRef.current = null;
      volumeSeriesRef.current = null;
    }

    // Create lightweight-chart instance
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight || 280,
      layout: {
        background: { color: '#070B16' },
        textColor: '#848E9C',
        fontSize: 10,
        fontFamily: 'JetBrains Mono, monospace',
      },
      grid: {
        vertLines: { color: 'rgba(30, 41, 59, 0.35)' },
        horzLines: { color: 'rgba(30, 41, 59, 0.35)' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: '#1E2538',
        scaleMargins: { top: 0.1, bottom: 0.25 },
        alignLabels: true,
        autoScale: true,
      },
      timeScale: {
        borderColor: '#1E2538',
        timeVisible: true,
        secondsVisible: true,
        rightOffset: 8,
        barSpacing: 9,
        minBarSpacing: 3,
        fixLeftEdge: false,
        fixRightEdge: false,
      },
      handleScroll: true,
      handleScale: true,
    });

    // Add main series based on selected chart type
    let mainSeries: any = null;
    if (chartType === 'candlestick') {
      mainSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#10b981',
        downColor: '#f43f5e',
        borderVisible: false,
        wickUpColor: '#10b981',
        wickDownColor: '#f43f5e',
      });
    } else {
      mainSeries = chart.addSeries(AreaSeries, {
        lineColor: '#00e5ff',
        topColor: 'rgba(0, 229, 255, 0.35)',
        bottomColor: 'rgba(0, 229, 255, 0.02)',
        lineWidth: 2,
        priceLineColor: '#00e5ff',
        priceLineVisible: true,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        crosshairMarkerBorderColor: '#00e5ff',
        crosshairMarkerBackgroundColor: '#0284c7',
      });
    }

    // Add volume histogram series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volumeScale',
    });

    chart.priceScale('volumeScale').applyOptions({
      scaleMargins: {
        top: 0.78, // volume bars occupy bottom 22% of chart canvas
        bottom: 0,
      },
    });

    // Populate chart with stored candles/volumes
    const initialCandles = getCandles(symbol);
    const initialVolumes = getVolumes(symbol);

    if (initialCandles && initialCandles.length > 0) {
      if (chartType === 'candlestick') {
        mainSeries.setData(initialCandles.map(c => ({
          time: c.time as any,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        })));
      } else {
        mainSeries.setData(initialCandles.map(c => ({
          time: c.time as any,
          value: c.close,
        })));
      }

      volumeSeries.setData(initialVolumes.map(v => ({
        time: v.time as any,
        value: v.value,
        color: v.color,
      })));
    }

    chartRef.current = chart;
    mainSeriesRef.current = mainSeries;
    volumeSeriesRef.current = volumeSeries;

    chart.timeScale().scrollToRealTime();

    // Auto-resize handler with ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0 || !chartContainerRef.current) return;
      const { width, height } = entries[0].contentRect;
      chart.resize(width, height || chartContainerRef.current.clientHeight || 280);
    });

    resizeObserver.observe(chartContainerRef.current);

    // Direct high-performance subscription to continuous live market tick simulation
    const unsubscribe = marketSimulationService.subscribe((_prices, updatedSymbol, _price) => {
      if (updatedSymbol !== symbol || !mainSeriesRef.current) return;

      const candles = useMarketStore.getState().getCandles(symbol);
      const volumes = useMarketStore.getState().getVolumes(symbol);

      if (candles && candles.length > 0) {
        const latestCandle = candles[candles.length - 1];
        const latestVolume = volumes[volumes.length - 1];

        try {
          if (chartType === 'candlestick') {
            mainSeriesRef.current.update({
              time: latestCandle.time as any,
              open: latestCandle.open,
              high: latestCandle.high,
              low: latestCandle.low,
              close: latestCandle.close,
            });
          } else {
            mainSeriesRef.current.update({
              time: latestCandle.time as any,
              value: latestCandle.close,
            });
          }

          if (volumeSeriesRef.current && latestVolume) {
            volumeSeriesRef.current.update({
              time: latestVolume.time as any,
              value: latestVolume.value,
              color: latestVolume.color,
            });
          }
        } catch {
          // Safe catch on initial timestamp sync
        }
      }
    });

    return () => {
      unsubscribe();
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      mainSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, [symbol, chartType]);

  return (
    <div className="relative bg-[#070b16] border border-slate-800 rounded-xl overflow-hidden p-2 w-full h-full min-h-[200px] flex flex-col group">
      {/* Chart Top Control Header */}
      <div className="flex items-center justify-between mb-1.5 px-1 z-10 flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          {/* Chart Type Toggle */}
          <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setChartType('area')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition flex items-center space-x-1 cursor-pointer ${
                chartType === 'area'
                  ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              <span>Area</span>
            </button>
            <button
              onClick={() => setChartType('candlestick')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition flex items-center space-x-1 cursor-pointer ${
                chartType === 'candlestick'
                  ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart2 className="w-3 h-3" />
              <span>Candles</span>
            </button>
          </div>

          {/* Timeframe Selector */}
          <div className="hidden sm:flex bg-slate-900 border border-slate-800 rounded-lg p-0.5 space-x-0.5 text-[10px] font-mono">
            {(['1s', '5s', '1m'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setCandleTimeframe(tf)}
                className={`px-2 py-0.5 rounded transition cursor-pointer ${
                  candleTimeframe === tf
                    ? 'bg-slate-800 text-teal-300 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Live Indicator Badge */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-mono">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
            <span className="font-bold">LIVE STREAM</span>
          </div>
        </div>
      </div>

      {/* Floating Zoom overlay buttons on bottom-left */}
      <div className="absolute bottom-2.5 left-2.5 flex flex-col space-y-1 z-10 opacity-70 group-hover:opacity-100 transition">
        <button
          onClick={() => {
            if (!chartRef.current) return;
            const timeScale = chartRef.current.timeScale();
            const currentSpacing = timeScale.width() > 0 ? 12 : 9;
            timeScale.applyOptions({ barSpacing: currentSpacing + 2 });
          }}
          className="w-5 h-5 bg-slate-900/90 border border-slate-800 hover:bg-slate-800 text-slate-200 font-bold rounded flex items-center justify-center cursor-pointer select-none text-[10px] transition"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={() => {
            if (!chartRef.current) return;
            const timeScale = chartRef.current.timeScale();
            timeScale.applyOptions({ barSpacing: Math.max(3, 7) });
          }}
          className="w-5 h-5 bg-slate-900/90 border border-slate-800 hover:bg-slate-800 text-slate-200 font-bold rounded flex items-center justify-center cursor-pointer select-none text-[10px] transition"
          title="Zoom Out"
        >
          -
        </button>
      </div>

      {/* Chart Canvas */}
      <div ref={chartContainerRef} className="w-full h-full min-h-[170px] flex-1" />
    </div>
  );
};

export const TradingChart = React.memo(TradingChartComponent);
