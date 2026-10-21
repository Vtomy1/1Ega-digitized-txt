/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TopBar } from './components/TopBar';
import { SamplePicker } from './components/SamplePicker';
import { AdjustmentsPanel } from './components/AdjustmentsPanel';
import { PaletteInspector } from './components/PaletteInspector';
import { QBasicEmulator } from './components/QBasicEmulator';
import { CodeExportPanel } from './components/CodeExportPanel';
import { ImageAdjustments, QuantizedResult } from './types';
import { quantizeImageToEga } from './utils/dithering';
import { Terminal, Cpu, Layers, HelpCircle, ArrowRight } from 'lucide-react';

const DEFAULT_IMAGE_PATH = '/src/assets/images/retro_game_knight_1792552341073.jpg';

const DEFAULT_ADJUSTMENTS: ImageAdjustments = {
  brightness: 0,
  contrast: 12,
  saturation: 15,
  gamma: 1.0,
  invert: false,
  ditherStrength: 90,
  colorDistance: 'perceptual',
  algorithm: 'floyd-steinberg',
  fitMode: 'fit',
  targetWidth: 80,
  targetHeight: 50,
  targetScreenMode: 'SCREEN 7',
  enabledColors: new Array(16).fill(true),
};

export default function App() {
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>('knight');
  const [imageSrc, setImageSrc] = useState<string>(DEFAULT_IMAGE_PATH);
  const [adjustments, setAdjustments] = useState<ImageAdjustments>(DEFAULT_ADJUSTMENTS);
  const [quantizedResult, setQuantizedResult] = useState<QuantizedResult | null>(null);
  const [highlightedColor, setHighlightedColor] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<string>('converter');

  // Loaded image element cache
  const loadedImageRef = useRef<HTMLImageElement | null>(null);

  // Load and quantize image
  const processImage = useCallback(() => {
    if (!loadedImageRef.current) return;
    try {
      const result = quantizeImageToEga(
        loadedImageRef.current,
        loadedImageRef.current.naturalWidth || loadedImageRef.current.width,
        loadedImageRef.current.naturalHeight || loadedImageRef.current.height,
        adjustments
      );
      setQuantizedResult(result);
    } catch (err) {
      console.error('Quantization error:', err);
    }
  }, [adjustments]);

  // Load image when imageSrc changes
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      loadedImageRef.current = img;
      processImage();
    };
    img.src = imageSrc;
  }, [imageSrc, processImage]);

  // Re-run when adjustments change
  useEffect(() => {
    if (loadedImageRef.current) {
      processImage();
    }
  }, [adjustments, processImage]);

  const handleSelectSample = (path: string, id: string) => {
    setSelectedSampleId(id);
    setImageSrc(path);
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setSelectedSampleId(null);
        setImageSrc(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleToggleColor = (index: number) => {
    setAdjustments((prev) => {
      const newEnabled = [...prev.enabledColors];
      newEnabled[index] = !newEnabled[index];
      // Keep at least one color enabled
      if (!newEnabled.some(Boolean)) {
        newEnabled[index] = true;
      }
      return { ...prev, enabledColors: newEnabled };
    });
  };

  const handleEnableAllColors = () => {
    setAdjustments((prev) => ({
      ...prev,
      enabledColors: new Array(16).fill(true),
    }));
  };

  const handleResetAdjustments = () => {
    setAdjustments((prev) => ({
      ...DEFAULT_ADJUSTMENTS,
      targetWidth: prev.targetWidth,
      targetHeight: prev.targetHeight,
      targetScreenMode: prev.targetScreenMode,
    }));
  };

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-neutral-200 font-['Plus_Jakarta_Sans',sans-serif] selection:bg-amber-500/30 selection:text-amber-300">
      {/* Top Header Contract */}
      <TopBar
        activeSection={activeSection}
        onScrollToSection={scrollToSection}
        onRunEmulator={() => scrollToSection('emulator')}
      />

      {/* Hero / Introduction Bar */}
      <section className="border-b border-neutral-800 bg-neutral-950/60 py-6 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-neutral-400 mb-1.5 font-mono">
              <span className="text-amber-400 font-semibold">IBM EGA / VGA 4-BIT REDUCTION</span>
              <span aria-hidden="true">·</span>
              <span>16-COLOR PALETTE</span>
              <span aria-hidden="true">·</span>
              <span>SCREEN 7 / 9 / 12</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              Image to QBasic 4-Bit EGA Digits & Dithering Studio
            </h1>
            <p className="text-sm text-neutral-400 mt-1 max-w-3xl">
              Convert any graphic into 4-bit EGA nibbles and pixel digits with authentic Floyd-Steinberg, Atkinson, or Bayer ordered dithering. Export runnable QBasic loaders, DATA statements, BSAVE binary files, and screen saver routines.
            </p>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-6 text-xs text-neutral-400 border-t md:border-t-0 md:border-l border-neutral-800 pt-3 md:pt-0 md:pl-6 shrink-0">
            <div>
              <div className="text-[11px] text-neutral-500 uppercase tracking-wider">Resolution</div>
              <div className="font-mono text-sm text-white font-semibold">
                {adjustments.targetWidth} × {adjustments.targetHeight}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-neutral-500 uppercase tracking-wider">Total Digits</div>
              <div className="font-mono text-sm text-white font-semibold">
                {quantizedResult ? quantizedResult.totalPixels.toLocaleString() : '0'}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-neutral-500 uppercase tracking-wider">Packed Size</div>
              <div className="font-mono text-sm text-amber-400 font-semibold">
                {quantizedResult ? `${Math.ceil(quantizedResult.totalPixels / 2).toLocaleString()} B` : '0 B'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Workspace Grid */}
      <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Section 1: Source & Adjustments */}
        <section id="converter" className="space-y-4">
          <SamplePicker
            selectedSampleId={selectedSampleId}
            onSelectSample={handleSelectSample}
            onFileUpload={handleFileUpload}
          />

          <AdjustmentsPanel
            adjustments={adjustments}
            onChange={setAdjustments}
            onReset={handleResetAdjustments}
          />
        </section>

        {/* Section 2: Virtual QBasic Screen Emulator Viewport */}
        <section id="emulator" className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-amber-400" />
              <h2 className="text-base font-semibold text-white">
                Simulated QBasic CRT Screen
              </h2>
            </div>
            <div className="text-xs text-neutral-500 font-mono">
              Press F5 or click RUN to watch raster drawing
            </div>
          </div>

          <QBasicEmulator
            quantizedResult={quantizedResult}
            originalImageSrc={imageSrc}
            highlightedColor={highlightedColor}
            screenMode={adjustments.targetScreenMode}
          />
        </section>

        {/* Section 3: EGA 16-Color Palette Inspector */}
        <section id="palette" className="space-y-2">
          <PaletteInspector
            quantizedResult={quantizedResult}
            enabledColors={adjustments.enabledColors}
            highlightedColor={highlightedColor}
            onToggleColor={handleToggleColor}
            onHighlightColor={setHighlightedColor}
            onEnableAllColors={handleEnableAllColors}
          />
        </section>

        {/* Section 4: QBasic Code & Binary Exporters */}
        <section id="export" className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-amber-400" />
              <h2 className="text-base font-semibold text-white">
                QBasic Loaders & Screen Saver Programs
              </h2>
            </div>
            <div className="text-xs text-neutral-500">
              Compatible with MS-DOS QBasic 1.1, QuickBASIC 4.5, QB64 & DOSBox
            </div>
          </div>

          <CodeExportPanel
            quantizedResult={quantizedResult}
            screenMode={adjustments.targetScreenMode}
          />
        </section>

        {/* Section 5: Technical Reference & QBasic Guide */}
        <section className="bg-neutral-900 border border-neutral-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">
              QBasic 4-Bit EGA Technical Primer & Reference
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-neutral-400 leading-relaxed">
            <div className="space-y-2 bg-neutral-950/60 p-3 rounded border border-neutral-800/80">
              <h4 className="font-semibold text-neutral-200 flex items-center gap-1.5">
                <span className="font-mono text-amber-400">01.</span>
                <span>The 4-Bit Hex Digits Approach</span>
              </h4>
              <p>
                In 4-bit EGA mode, each pixel is a number from 0 to 15. Storing this as hexadecimal characters (<code className="text-amber-300 font-mono">0-9, A-F</code>) produces ultra-clean DATA lines. In QBasic:
              </p>
              <pre className="bg-neutral-900 p-2 rounded font-mono text-[11px] text-neutral-300 overflow-x-auto">
{`HexChar$ = MID$(RowData$, X + 1, 1)
ColorVal = VAL("&H" + HexChar$)
PSET (X, Y), ColorVal`}
              </pre>
            </div>

            <div className="space-y-2 bg-neutral-950/60 p-3 rounded border border-neutral-800/80">
              <h4 className="font-semibold text-neutral-200 flex items-center gap-1.5">
                <span className="font-mono text-amber-400">02.</span>
                <span>Packed Bytes (2 Pixels / Byte)</span>
              </h4>
              <p>
                Two 4-bit pixels fit into one standard 8-bit byte. High nibble is pixel 1, low nibble is pixel 2. This cuts QBasic source file size in half and avoids memory overflow errors:
              </p>
              <pre className="bg-neutral-900 p-2 rounded font-mono text-[11px] text-neutral-300 overflow-x-auto">
{`P1 = ByteVal \\ 16
P2 = ByteVal AND 15
PSET (X, Y), P1
PSET (X + 1, Y), P2`}
              </pre>
            </div>

            <div className="space-y-2 bg-neutral-950/60 p-3 rounded border border-neutral-800/80">
              <h4 className="font-semibold text-neutral-200 flex items-center gap-1.5">
                <span className="font-mono text-amber-400">03.</span>
                <span>BSAVE & Screen Saver Routines</span>
              </h4>
              <p>
                Use <code className="text-amber-300 font-mono">POINT(X, Y)</code> to read any active game screen in QBasic and write it directly to a file. Or allocate a memory array, call <code className="text-amber-300 font-mono">BLOAD</code>, and blast it to screen via <code className="text-amber-300 font-mono">PUT</code> instantly!
              </p>
              <pre className="bg-neutral-900 p-2 rounded font-mono text-[11px] text-neutral-300 overflow-x-auto">
{`' Read active pixel on screen
PixelColor = POINT(X, Y)
' Blit memory sprite onto screen
PUT (X, Y), SpriteArray%, PSET`}
              </pre>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-neutral-800 py-6 px-6 text-center text-xs text-neutral-500 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span>EGA Digitizer & QBasic Studio</span>
            <span aria-hidden="true">·</span>
            <span>Standard IBM EGA 16-Color Palette</span>
          </div>
          <div className="text-neutral-500">
            Exported .BAS files run natively in DOSBox, QBasic 1.1, and QB64
          </div>
        </div>
      </footer>
    </div>
  );
}
