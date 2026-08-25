/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { createChart, AreaSeries, LineSeries, HistogramSeries, IChartApi, ISeriesApi } from 'lightweight-charts';
import { useMarketStore } from '../stores/marketStore';
import { marketSimulationService } from '../services/marketSimulationService';
import { TrendingUp, Activity, Maximize2, Minimize2, ZoomIn, ZoomOut, ChevronDown, BarChart2 } from 'lucide-react';

interface TradingChartProps {
  symbol: string;
  currentPrice: number;
  change24h?: number;
  marketName?: string;
  payoutRate?: number;
  onOpenAssetSelector?: () => void;
}

export const TradingChartComponent: React.FC<TradingChartProps> = ({ 
  symbol, 
  currentPrice, 
  change24h = 0,
  marketName,
  payoutRate = 0.95,
  onOpenAssetSelector 
}) => {
  const chartWrapperRef = useRef<HTMLDivElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<any> | null>(null);

  const [displayMode, setDisplayMode] = useState<'area' | 'line'>('area');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(7);

  const { getCandles, getVolumes } = useMarketStore();

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!chartWrapperRef.current) return;
    if (!document.fullscreenElement) {
      chartWrapperRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleZoom = (delta: number) => {
    if (!chartRef.current) return;
    const newSpacing = Math.min(14, Math.max(3, zoomLevel + delta));
    setZoomLevel(newSpacing);
    chartRef.current.timeScale().applyOptions({ barSpacing: newSpacing });
    chartRef.current.timeScale().scrollToRealTime();
  };

  // Initialize and rebuild chart when symbol or displayMode changes
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Destroy existing chart instance
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      mainSeriesRef.current = null;
      volumeSeriesRef.current = null;
    }

    // Create lightweight-chart instance with strict continuous live viewport constraints
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight || 190,
      layout: {
        background: { color: '#070B16' },
        textColor: '#64748B',
        fontSize: 10,
        fontFamily: 'JetBrains Mono, monospace',
      },
      grid: {
        vertLines: { color: 'rgba(30, 41, 59, 0.25)' },
        horzLines: { color: 'rgba(30, 41, 59, 0.25)' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: 'rgba(20, 184, 166, 0.4)',
          width: 1,
          style: 3,
        },
        horzLine: {
          color: 'rgba(20, 184, 166, 0.4)',
          width: 1,
          style: 3,
        },
      },
      rightPriceScale: {
        borderColor: '#1E293B',
        scaleMargins: { top: 0.18, bottom: 0.15 },
        alignLabels: true,
        autoScale: true,
      },
      timeScale: {
        borderColor: '#1E293B',
        timeVisible: true,
        secondsVisible: true,
        rightOffset: 5,
        barSpacing: zoomLevel,
        minBarSpacing: 3,
        fixLeftEdge: true,
        fixRightEdge: true,
        shiftVisibleRangeOnNewBar: true,
      },
      // Disable manual dragging into past history - continuous live moving waveform
      handleScroll: {
        mouseWheel: false,
        pressedMouseMove: false,
        horzTouchDrag: false,
        vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: false,
        mouseWheel: false,
        pinch: false,
      },
    });

    // Add main continuous series
    let mainSeries: any = null;
    if (displayMode === 'line') {
      mainSeries = chart.addSeries(LineSeries, {
        color: '#14b8a6',
        lineWidth: 2,
        priceLineColor: '#14b8a6',
        priceLineVisible: true,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 3.5,
        crosshairMarkerBorderColor: '#14b8a6',
        crosshairMarkerBackgroundColor: '#0f766e',
      });
    } else {
      mainSeries = chart.addSeries(AreaSeries, {
        lineColor: '#14b8a6',
        topColor: 'rgba(20, 184, 166, 0.22)',
        bottomColor: 'rgba(20, 184, 166, 0.01)',
        lineWidth: 2,
        priceLineColor: '#14b8a6',
        priceLineVisible: true,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 3.5,
        crosshairMarkerBorderColor: '#14b8a6',
        crosshairMarkerBackgroundColor: '#0f766e',
      });
    }

    // Add subtle volume histogram series at the base
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volumeScale',
    });

    chart.priceScale('volumeScale').applyOptions({
      scaleMargins: {
        top: 0.85,
        bottom: 0,
      },
    });

    // Populate initial data points
    const initialCandles = getCandles(symbol);
    const initialVolumes = getVolumes(symbol);

    if (initialCandles && initialCandles.length > 0) {
      mainSeries.setData(initialCandles.map(c => ({
        time: c.time as any,
        value: c.close,
      })));

      volumeSeries.setData(initialVolumes.map(v => ({
        time: v.time as any,
        value: v.value,
        color: v.color || '#10b981',
      })));
    }

    chartRef.current = chart;
    mainSeriesRef.current = mainSeries;
    volumeSeriesRef.current = volumeSeries;

    chart.timeScale().scrollToRealTime();

    // Auto-resize handler
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0 || !chartContainerRef.current) return;
      const { width, height } = entries[0].contentRect;
      chart.resize(width, height || chartContainerRef.current.clientHeight || 190);
      chart.timeScale().scrollToRealTime();
    });

    resizeObserver.observe(chartContainerRef.current);

    // Direct high-performance subscription to live tick simulation
    const unsubscribe = marketSimulationService.subscribe((_prices, updatedSymbol, _price) => {
      if (updatedSymbol !== symbol || !mainSeriesRef.current) return;

      const candles = useMarketStore.getState().getCandles(symbol);
      const volumes = useMarketStore.getState().getVolumes(symbol);

      if (candles && candles.length > 0) {
        const latestCandle = candles[candles.length - 1];
        const latestVolume = volumes[volumes.length - 1];

        try {
          mainSeriesRef.current.update({
            time: latestCandle.time as any,
            value: latestCandle.close,
          });

          if (volumeSeriesRef.current && latestVolume) {
            volumeSeriesRef.current.update({
              time: latestVolume.time as any,
              value: latestVolume.value,
              color: latestVolume.color || '#10b981',
            });
          }

          chart.timeScale().scrollToRealTime();
        } catch {
          // Safe catch
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
  }, [symbol, displayMode]);

  const isPositive = change24h >= 0;

  return (
    <div 
      ref={chartWrapperRef} 
      className={`relative bg-[#070b16] border border-slate-800/90 rounded-2xl overflow-hidden p-1.5 sm:p-2 w-full h-full flex flex-col group ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none p-4 bg-[#070b16]' : ''
      }`}
    >
      {/* Floating Chart Top Control Header (Integrated inside chart card as in reference) */}
      <div className="flex items-center justify-between px-1 mb-1 z-10 gap-1.5 flex-shrink-0">
        
        {/* Left: 1T Timeframe Badge */}
        <div className="flex items-center space-x-1.5">
          <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 text-teal-400 font-mono font-bold text-[10px] rounded-md shadow-sm">
            1T
          </span>

          {/* Center-Left: Integrated Instrument Selector Dropdown Trigger */}
          {onOpenAssetSelector && (
            <button
              type="button"
              onClick={onOpenAssetSelector}
              className="flex items-center space-x-1.5 px-2 py-1 bg-slate-950/90 hover:bg-slate-900 border border-slate-800 hover:border-teal-500/50 rounded-xl transition cursor-pointer text-left shadow-md group"
            >
              <div className="w-5 h-5 bg-teal-500/10 border border-teal-500/20 rounded-md flex items-center justify-center text-teal-400">
                <BarChart2 className="w-3 h-3" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center space-x-1">
                  <span className="text-[11px] font-bold text-slate-100 group-hover:text-teal-300 font-mono truncate max-w-[130px] sm:max-w-[190px]">
                    {marketName || symbol}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-teal-300" />
                </div>
                <div className="flex items-center space-x-1 text-[9px] font-mono">
                  <span className="font-semibold text-slate-300">${currentPrice.toFixed(currentPrice < 10 ? 4 : 2)}</span>
                  <span className={`font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isPositive ? '+' : ''}{change24h.toFixed(2)}%
                  </span>
                </div>
              </div>
            </button>
          )}
        </div>

        {/* Right: Yield Return % Tag & Live Real-Time Price Callout */}
        <div className="flex items-center space-x-1.5">
          {/* Yield Badge */}
          <div className="hidden xs:flex flex-col items-center justify-center px-1.5 py-0.5 bg-slate-950 border border-slate-850 rounded-lg text-center">
            <span className="text-[8px] font-mono text-slate-500 uppercase leading-none">Return</span>
            <span className="text-[10px] font-mono font-bold text-emerald-400 leading-tight">
              +{(payoutRate * 100).toFixed(0)}%
            </span>
          </div>

          {/* Live Price Callout Badge (prominent dark pill with border as in reference) */}
          <div className="flex items-center px-2.5 py-1 bg-slate-950 border border-teal-500/40 rounded-xl shadow-sm">
            <span className="text-xs sm:text-sm font-mono font-black text-slate-100 tracking-tight">
              {currentPrice.toLocaleString(undefined, {
                minimumFractionDigits: currentPrice < 10 ? 4 : 2,
                maximumFractionDigits: currentPrice < 10 ? 4 : 2,
              })}
            </span>
          </div>

          {/* Quick Chart Tools (Area/Line & Fullscreen) */}
          <div className="hidden sm:flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 space-x-0.5">
            <button
              type="button"
              onClick={() => setDisplayMode(displayMode === 'area' ? 'line' : 'area')}
              className="p-1 hover:bg-slate-900 text-slate-400 hover:text-teal-300 rounded transition cursor-pointer"
              title="Toggle Line / Area"
            >
              {displayMode === 'area' ? <TrendingUp className="w-3 h-3 text-teal-400" /> : <Activity className="w-3 h-3 text-teal-400" />}
            </button>
            <button
              type="button"
              onClick={() => handleZoom(2)}
              className="p-1 hover:bg-slate-900 text-slate-400 hover:text-slate-200 rounded transition cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => handleZoom(-2)}
              className="p-1 hover:bg-slate-900 text-slate-400 hover:text-slate-200 rounded transition cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1 hover:bg-slate-900 text-slate-400 hover:text-teal-300 rounded transition cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
            </button>
          </div>
        </div>

      </div>

      {/* Chart Canvas */}
      <div ref={chartContainerRef} className="w-full flex-1 min-h-[140px] sm:min-h-[170px]" />
    </div>
  );
};

export const TradingChart = React.memo(TradingChartComponent);
