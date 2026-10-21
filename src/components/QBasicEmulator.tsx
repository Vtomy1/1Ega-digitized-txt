import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Tv,
  Grid,
  Columns,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Pause,
} from 'lucide-react';
import { QuantizedResult } from '../types';
import { EGA_PALETTE } from '../utils/egaPalette';
import {
  playScanlineTick,
  playCompletionChime,
  setAudioEnabled,
  isAudioEnabled,
} from '../utils/audio';

interface QBasicEmulatorProps {
  quantizedResult: QuantizedResult | null;
  originalImageSrc: string | null;
  highlightedColor: number | null;
  screenMode: string;
}

export function QBasicEmulator({
  quantizedResult,
  originalImageSrc,
  highlightedColor,
  screenMode,
}: QBasicEmulatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // CRT & Display options
  const [showScanlines, setShowScanlines] = useState(true);
  const [showCrtGlow, setShowCrtGlow] = useState(true);
  const [showPixelGrid, setShowPixelGrid] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(0); // 0 = fit, 1 = 1x, 2 = 2x, 3 = 3x, 4 = 4x
  const [showCompareSlider, setShowCompareSlider] = useState(false);
  const [sliderPos, setSliderPos] = useState(50); // percentage 0..100
  const [soundOn, setSoundOn] = useState(false);

  // Playback / Execution state
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progressPixel, setProgressPixel] = useState(0);
  const [executionSpeed, setExecutionSpeed] = useState<'instant' | 'fast' | 'dos' | 'slow'>('instant');
  const [currentCoord, setCurrentCoord] = useState<{ x: number; y: number; color: number } | null>(null);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setAudioEnabled(next);
  };

  // Draw full quantized image or animated state
  const renderToCanvas = useCallback(
    (pixelLimit?: number) => {
      const canvas = canvasRef.current;
      if (!canvas || !quantizedResult) return;

      const { width, height, indices } = quantizedResult;
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const imgData = ctx.createImageData(width, height);
      const data = imgData.data;

      const maxPixels = pixelLimit !== undefined ? pixelLimit : width * height;

      for (let i = 0; i < width * height; i++) {
        const pixelIdx = i * 4;
        if (i < maxPixels) {
          const colIndex = indices[i];
          const [r, g, b] = EGA_PALETTE[colIndex].rgb;

          // If a color is isolated/highlighted, dim all others
          if (highlightedColor !== null && colIndex !== highlightedColor) {
            data[pixelIdx] = Math.round(r * 0.2);
            data[pixelIdx + 1] = Math.round(g * 0.2);
            data[pixelIdx + 2] = Math.round(b * 0.2);
            data[pixelIdx + 3] = 255;
          } else {
            data[pixelIdx] = r;
            data[pixelIdx + 1] = g;
            data[pixelIdx + 2] = b;
            data[pixelIdx + 3] = 255;
          }
        } else {
          // Unrendered area in QBasic black
          data[pixelIdx] = 0;
          data[pixelIdx + 1] = 0;
          data[pixelIdx + 2] = 0;
          data[pixelIdx + 3] = 255;
        }
      }

      ctx.putImageData(imgData, 0, 0);
    },
    [quantizedResult, highlightedColor]
  );

  // Sync render on input change if not actively running animation
  useEffect(() => {
    if (!isRunning) {
      renderToCanvas();
    }
  }, [quantizedResult, highlightedColor, isRunning, renderToCanvas]);

  // Start animated QBasic program execution
  const runProgram = (mode: 'instant' | 'fast' | 'dos' | 'slow' = executionSpeed) => {
    if (!quantizedResult) return;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (mode === 'instant') {
      setIsRunning(false);
      setIsPaused(false);
      setProgressPixel(quantizedResult.totalPixels);
      renderToCanvas();
      playCompletionChime();
      return;
    }

    setIsRunning(true);
    setIsPaused(false);
    setProgressPixel(0);

    const total = quantizedResult.totalPixels;
    const w = quantizedResult.width;
    let current = 0;

    // Step size based on speed
    const step = mode === 'slow' ? 2 : mode === 'dos' ? Math.max(1, Math.round(w / 2)) : Math.max(4, w * 2);

    const stepFn = () => {
      current = Math.min(total, current + step);
      setProgressPixel(current);
      renderToCanvas(current);

      const curY = Math.floor((current - 1) / w);
      const curX = (current - 1) % w;
      if (current > 0 && current <= total) {
        setCurrentCoord({
          x: curX,
          y: curY,
          color: quantizedResult.indices[current - 1],
        });
      }

      // Audio tick every row
      if (curX < step && soundOn) {
        playScanlineTick(1 + (curY / quantizedResult.height) * 0.5);
      }

      if (current < total) {
        animationFrameRef.current = requestAnimationFrame(stepFn);
      } else {
        setIsRunning(false);
        playCompletionChime();
      }
    };

    animationFrameRef.current = requestAnimationFrame(stepFn);
  };

  const pauseResume = () => {
    if (!isRunning) return;
    if (isPaused) {
      setIsPaused(false);
      // Resume loop
      if (!quantizedResult) return;
      const total = quantizedResult.totalPixels;
      const w = quantizedResult.width;
      let current = progressPixel;
      const step =
        executionSpeed === 'slow'
          ? 2
          : executionSpeed === 'dos'
          ? Math.max(1, Math.round(w / 2))
          : Math.max(4, w * 2);

      const stepFn = () => {
        current = Math.min(total, current + step);
        setProgressPixel(current);
        renderToCanvas(current);
        if (current < total) {
          animationFrameRef.current = requestAnimationFrame(stepFn);
        } else {
          setIsRunning(false);
          setIsPaused(false);
          playCompletionChime();
        }
      };
      animationFrameRef.current = requestAnimationFrame(stepFn);
    } else {
      setIsPaused(true);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  };

  const resetRender = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setIsRunning(false);
    setIsPaused(false);
    setProgressPixel(0);
    renderToCanvas(0);
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden shadow-xl flex flex-col">
      {/* MS-DOS / QBASIC Window Title Bar */}
      <div className="bg-[#0000AA] text-white px-3 py-1.5 flex items-center justify-between select-none border-b border-neutral-700 font-mono text-xs font-bold">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-neutral-200 border border-neutral-900 inline-block"></span>
          <span>MS-DOS QBasic - [EGA_VIEW.BAS]</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] font-normal text-neutral-300">
          <span>{screenMode}</span>
          <span>
            {quantizedResult ? `${quantizedResult.width}×${quantizedResult.height}` : '0×0'}
          </span>
        </div>
      </div>

      {/* QBasic Menu Strip */}
      <div className="bg-[#AAAAAA] text-black px-3 py-0.5 flex items-center gap-5 text-xs font-mono font-medium select-none border-b border-neutral-400">
        <span className="hover:bg-black hover:text-white px-1 cursor-pointer">File</span>
        <span className="hover:bg-black hover:text-white px-1 cursor-pointer">Edit</span>
        <span className="hover:bg-black hover:text-white px-1 cursor-pointer">View</span>
        <span className="hover:bg-black hover:text-white px-1 cursor-pointer">Search</span>
        <span
          onClick={() => runProgram()}
          className="hover:bg-black hover:text-white px-1 cursor-pointer font-bold text-blue-900"
        >
          Run (F5)
        </span>
        <span className="hover:bg-black hover:text-white px-1 cursor-pointer">Debug</span>
        <span className="hover:bg-black hover:text-white px-1 cursor-pointer">Options</span>
        <span className="hover:bg-black hover:text-white px-1 cursor-pointer">Help</span>
      </div>

      {/* Emulator Toolbar Controls */}
      <div className="bg-neutral-950 px-3 py-2 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Playback action group */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => runProgram()}
            disabled={!quantizedResult || (isRunning && !isPaused)}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-semibold rounded flex items-center gap-1.5 shadow-sm transition-colors font-mono"
            title="Execute QBasic Program (F5)"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>RUN</span>
          </button>

          {isRunning && (
            <button
              onClick={pauseResume}
              className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded flex items-center gap-1 transition-colors"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>{isPaused ? 'Resume' : 'Pause'}</span>
            </button>
          )}

          <button
            onClick={resetRender}
            disabled={!quantizedResult}
            className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded flex items-center gap-1 transition-colors"
            title="Clear screen and restart"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>CLS</span>
          </button>

          {/* Speed selector */}
          <div className="flex items-center gap-1 ml-2 bg-neutral-900 p-0.5 rounded border border-neutral-800">
            {(
              [
                { id: 'instant', label: 'Instant' },
                { id: 'fast', label: 'Fast' },
                { id: 'dos', label: '286 PC' },
                { id: 'slow', label: 'Slow' },
              ] as const
            ).map((spd) => (
              <button
                key={spd.id}
                onClick={() => {
                  setExecutionSpeed(spd.id);
                  if (isRunning) runProgram(spd.id);
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                  executionSpeed === spd.id
                    ? 'bg-neutral-800 text-amber-400 font-semibold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {spd.label}
              </button>
            ))}
          </div>
        </div>

        {/* View / CRT Display toggles */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSound}
            className={`p-1.5 rounded transition-colors ${
              soundOn
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'bg-neutral-800 text-neutral-400 hover:text-white'
            }`}
            title={soundOn ? 'PC Speaker Sound: ON' : 'PC Speaker Sound: OFF'}
          >
            {soundOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => setShowScanlines((v) => !v)}
            className={`p-1.5 rounded transition-colors ${
              showScanlines
                ? 'bg-neutral-800 text-amber-400 border border-neutral-700'
                : 'bg-neutral-900 text-neutral-500'
            }`}
            title="Toggle CRT Scanlines"
          >
            <Tv className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowPixelGrid((v) => !v)}
            className={`p-1.5 rounded transition-colors ${
              showPixelGrid
                ? 'bg-neutral-800 text-amber-400 border border-neutral-700'
                : 'bg-neutral-900 text-neutral-500'
            }`}
            title="Toggle Pixel Grid (Visible at high zoom)"
          >
            <Grid className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowCompareSlider((v) => !v)}
            className={`p-1.5 rounded transition-colors ${
              showCompareSlider
                ? 'bg-neutral-800 text-amber-400 border border-neutral-700'
                : 'bg-neutral-900 text-neutral-500'
            }`}
            title="Compare with Original Source Image"
          >
            <Columns className="w-3.5 h-3.5" />
          </button>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-neutral-900 p-0.5 rounded border border-neutral-800 text-[11px] font-mono">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0, z - 1))}
              className="p-1 hover:text-white text-neutral-400"
              title="Zoom Out"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="px-1 text-neutral-300">
              {zoomLevel === 0 ? 'FIT' : `${zoomLevel}×`}
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(4, z + 1))}
              className="p-1 hover:text-white text-neutral-400"
              title="Zoom In"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Main CRT Screen Viewport */}
      <div className="relative bg-black flex-1 min-h-[380px] max-h-[560px] overflow-auto flex items-center justify-center p-4">
        {/* CRT Curved Frame Bezel effect */}
        <div
          className={`relative max-w-full rounded-md overflow-hidden shadow-2xl transition-all ${
            showCrtGlow ? 'shadow-[0_0_40px_rgba(30,144,255,0.15)] ring-1 ring-neutral-800' : ''
          }`}
          style={{
            imageRendering: 'pixelated',
          }}
        >
          {/* Canvas container */}
          <div
            className="relative overflow-hidden flex items-center justify-center bg-black"
            style={{
              width: zoomLevel === 0 ? 'auto' : `${(quantizedResult?.width || 320) * zoomLevel}px`,
              height:
                zoomLevel === 0 ? 'auto' : `${(quantizedResult?.height || 200) * zoomLevel}px`,
            }}
          >
            {/* The primary EGA Canvas */}
            <canvas
              ref={canvasRef}
              className={`max-w-full max-h-[480px] object-contain transition-all ${
                zoomLevel > 0 ? 'w-full h-full' : 'w-auto h-auto'
              }`}
              style={{
                imageRendering: 'pixelated',
              }}
            />

            {/* Split Comparison Slider (Overlay Original Image) */}
            {showCompareSlider && originalImageSrc && (
              <div
                className="absolute inset-0 overflow-hidden pointer-events-none"
                style={{ width: `${sliderPos}%` }}
              >
                <img
                  src={originalImageSrc}
                  alt="Original"
                  className="absolute top-0 left-0 max-w-none w-full h-full object-contain"
                  style={{
                    width: canvasRef.current?.clientWidth || '100%',
                    height: canvasRef.current?.clientHeight || '100%',
                  }}
                />
                <div className="absolute top-0 right-0 bottom-0 w-[2px] bg-amber-400 shadow-[0_0_8px_#f59e0b]">
                  <div className="absolute top-2 -left-12 bg-neutral-900/90 text-amber-400 text-[10px] px-1.5 py-0.5 rounded font-mono border border-amber-500/50">
                    ORIGINAL
                  </div>
                </div>
              </div>
            )}

            {/* Split Slider Interactive Handle */}
            {showCompareSlider && (
              <input
                type="range"
                min="0"
                max="100"
                value={sliderPos}
                onChange={(e) => setSliderPos(parseInt(e.target.value))}
                className="absolute inset-x-0 bottom-3 mx-auto w-3/4 opacity-70 hover:opacity-100 z-30 cursor-ew-resize accent-amber-400"
              />
            )}

            {/* Pixel Grid lines overlay */}
            {showPixelGrid && zoomLevel >= 2 && quantizedResult && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundSize: `${zoomLevel}px ${zoomLevel}px`,
                  backgroundImage:
                    'linear-gradient(to right, rgba(255, 255, 255, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.08) 1px, transparent 1px)',
                }}
              />
            )}

            {/* Authentic CRT Scanlines overlay */}
            {showScanlines && (
              <div
                className="absolute inset-0 pointer-events-none opacity-45 mix-blend-overlay"
                style={{
                  background:
                    'repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.35) 1px, transparent 1px, transparent 2px)',
                }}
              />
            )}

            {/* Subtle CRT Phosphor vignette */}
            {showCrtGlow && (
              <div
                className="absolute inset-0 pointer-events-none opacity-40"
                style={{
                  boxShadow: 'inset 0 0 40px rgba(0, 0, 0, 0.8), inset 0 0 10px rgba(0, 0, 0, 0.9)',
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Bottom QBasic Status Line */}
      <div className="bg-[#0000AA] text-white px-3 py-1 flex items-center justify-between font-mono text-[11px] select-none border-t border-neutral-700">
        <div className="flex items-center gap-4">
          <span className="text-amber-300 font-bold">
            {isRunning ? 'RUNNING...' : isPaused ? 'PAUSED' : 'READY'}
          </span>
          {currentCoord && (
            <span>
              X: <span className="text-amber-300">{String(currentCoord.x).padStart(3, '0')}</span>{' '}
              Y: <span className="text-amber-300">{String(currentCoord.y).padStart(3, '0')}</span>{' '}
              COL: <span className="text-amber-300">{currentCoord.color}</span> (
              {EGA_PALETTE[currentCoord.color]?.name})
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-neutral-300">
          <span>
            Pixels: {progressPixel.toLocaleString()} /{' '}
            {(quantizedResult?.totalPixels || 0).toLocaleString()}
          </span>
          <span className="text-neutral-400">
            Est. Size:{' '}
            {quantizedResult ? `${Math.ceil(quantizedResult.totalPixels / 2).toLocaleString()} B` : '0 B'}
          </span>
        </div>
      </div>
    </div>
  );
}
