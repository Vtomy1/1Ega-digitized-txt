import {
  Sliders,
  Maximize2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import {
  ImageAdjustments,
  DitherAlgorithm,
  ColorDistanceMethod,
  AspectRatioMode,
} from '../types';
import { RESOLUTION_PRESETS } from '../utils/egaPalette';

interface AdjustmentsPanelProps {
  adjustments: ImageAdjustments;
  onChange: (updater: (prev: ImageAdjustments) => ImageAdjustments) => void;
  onReset: () => void;
}

const ALGORITHMS: { id: DitherAlgorithm; label: string; desc: string }[] = [
  { id: 'floyd-steinberg', label: 'Floyd-Steinberg', desc: 'Standard error diffusion' },
  { id: 'atkinson', label: 'Atkinson', desc: 'Classic retro contrast (1/8 diffusion)' },
  { id: 'bayer4', label: 'Bayer 4×4', desc: 'Ordered matrix dithering' },
  { id: 'bayer8', label: 'Bayer 8×8', desc: 'Fine ordered dot matrix' },
  { id: 'burkes', label: 'Burkes', desc: 'Smooth 7-neighbor diffusion' },
  { id: 'sierra-lite', label: 'Sierra-Lite', desc: 'Fast 3-point diffusion' },
  { id: 'halftone', label: 'Halftone', desc: 'Clustered dot pattern' },
  { id: 'none', label: 'Threshold (None)', desc: 'Nearest color, no dithering' },
];

export function AdjustmentsPanel({
  adjustments,
  onChange,
  onReset,
}: AdjustmentsPanelProps) {
  const currentPreset = RESOLUTION_PRESETS.find(
    (p) =>
      p.width === adjustments.targetWidth &&
      p.height === adjustments.targetHeight
  );

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-neutral-200">
            Dithering & Output Settings
          </h3>
        </div>
        <button
          onClick={onReset}
          className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-neutral-800"
          title="Reset to default settings"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* Target Resolution */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
            Target Resolution
          </label>
          <span className="text-xs font-mono tabular-nums text-amber-400">
            {adjustments.targetWidth} × {adjustments.targetHeight} px
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mb-2.5">
          {RESOLUTION_PRESETS.map((preset) => {
            const isMatch =
              preset.width === adjustments.targetWidth &&
              preset.height === adjustments.targetHeight;
            return (
              <button
                key={preset.id}
                onClick={() =>
                  onChange((prev) => ({
                    ...prev,
                    targetWidth: preset.width,
                    targetHeight: preset.height,
                    targetScreenMode: preset.screenMode,
                  }))
                }
                className={`text-left px-2.5 py-1.5 rounded text-xs transition-colors border ${
                  isMatch
                    ? 'border-amber-400 bg-amber-950/30 text-white font-medium'
                    : 'border-neutral-800 bg-neutral-950/60 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                }`}
              >
                <div className="font-medium truncate">{preset.name}</div>
                <div className="text-[10px] text-neutral-500 truncate">
                  {preset.description}
                </div>
              </button>
            );
          })}
        </div>

        {/* Custom Width & Height Input if desired */}
        <div className="flex items-center gap-2 pt-1">
          <span className="text-[11px] text-neutral-500">Custom Size:</span>
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <input
              type="number"
              min="8"
              max="640"
              value={adjustments.targetWidth}
              onChange={(e) => {
                const w = Math.max(8, Math.min(640, parseInt(e.target.value) || 320));
                onChange((prev) => ({ ...prev, targetWidth: w }));
              }}
              className="w-16 px-2 py-1 bg-neutral-950 border border-neutral-700 rounded text-neutral-200 text-center focus:border-amber-400 focus:outline-none"
            />
            <span className="text-neutral-500">×</span>
            <input
              type="number"
              min="8"
              max="480"
              value={adjustments.targetHeight}
              onChange={(e) => {
                const h = Math.max(8, Math.min(480, parseInt(e.target.value) || 200));
                onChange((prev) => ({ ...prev, targetHeight: h }));
              }}
              className="w-16 px-2 py-1 bg-neutral-950 border border-neutral-700 rounded text-neutral-200 text-center focus:border-amber-400 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Dithering Algorithm */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Dithering Algorithm</span>
          </label>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-3">
          {ALGORITHMS.map((algo) => {
            const isSelected = adjustments.algorithm === algo.id;
            return (
              <button
                key={algo.id}
                onClick={() =>
                  onChange((prev) => ({ ...prev, algorithm: algo.id }))
                }
                className={`text-left p-2 rounded text-xs transition-colors border ${
                  isSelected
                    ? 'border-amber-400 bg-amber-950/30 text-white font-medium'
                    : 'border-neutral-800 bg-neutral-950/60 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                }`}
              >
                <div className="font-medium truncate">{algo.label}</div>
                <div className="text-[10px] text-neutral-500 truncate">
                  {algo.desc}
                </div>
              </button>
            );
          })}
        </div>

        {/* Dither Strength Slider */}
        {adjustments.algorithm !== 'none' && (
          <div className="bg-neutral-950/50 p-2.5 rounded border border-neutral-800 space-y-1.5">
            <div className="flex justify-between text-xs text-neutral-400">
              <span>Diffusion / Dither Strength</span>
              <span className="font-mono text-amber-400 font-semibold tabular-nums">
                {adjustments.ditherStrength}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={adjustments.ditherStrength}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                onChange((prev) => ({ ...prev, ditherStrength: val }));
              }}
              className="w-full accent-amber-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg appearance-none"
            />
          </div>
        )}
      </div>

      {/* Fit Mode & Color Distance Calculation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-neutral-800">
        <div>
          <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block mb-1.5">
            Aspect Fit Mode
          </label>
          <div className="flex gap-1 bg-neutral-950 p-1 rounded border border-neutral-800">
            {(['fit', 'crop', 'stretch'] as AspectRatioMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => onChange((prev) => ({ ...prev, fitMode: mode }))}
                className={`flex-1 py-1 text-xs capitalize rounded transition-colors ${
                  adjustments.fitMode === mode
                    ? 'bg-neutral-800 text-white font-medium shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block mb-1.5">
            Palette Matching Metric
          </label>
          <div className="flex gap-1 bg-neutral-950 p-1 rounded border border-neutral-800">
            {(
              [
                { id: 'perceptual', label: 'Perceptual' },
                { id: 'redmean', label: 'Redmean' },
                { id: 'euclidean', label: 'RGB' },
              ] as { id: ColorDistanceMethod; label: string }[]
            ).map((dist) => (
              <button
                key={dist.id}
                onClick={() =>
                  onChange((prev) => ({ ...prev, colorDistance: dist.id }))
                }
                className={`flex-1 py-1 text-xs rounded transition-colors ${
                  adjustments.colorDistance === dist.id
                    ? 'bg-neutral-800 text-white font-medium shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {dist.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Image Adjustments (Brightness, Contrast, Saturation, Gamma) */}
      <div className="pt-2 border-t border-neutral-800 space-y-3">
        <div className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center justify-between">
          <span>Image Preprocessing</span>
          <label className="flex items-center gap-2 cursor-pointer font-normal normal-case text-neutral-400 text-xs">
            <input
              type="checkbox"
              checked={adjustments.invert}
              onChange={(e) =>
                onChange((prev) => ({ ...prev, invert: e.target.checked }))
              }
              className="rounded border-neutral-700 text-amber-500 focus:ring-0 focus:ring-offset-0 bg-neutral-950"
            />
            <span>Invert Colors</span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Brightness */}
          <div>
            <div className="flex justify-between text-neutral-400 mb-1">
              <span>Brightness</span>
              <span className="font-mono tabular-nums text-neutral-300">
                {adjustments.brightness > 0 ? `+${adjustments.brightness}` : adjustments.brightness}
              </span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={adjustments.brightness}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                onChange((prev) => ({ ...prev, brightness: val }));
              }}
              className="w-full accent-amber-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg appearance-none"
            />
          </div>

          {/* Contrast */}
          <div>
            <div className="flex justify-between text-neutral-400 mb-1">
              <span>Contrast</span>
              <span className="font-mono tabular-nums text-neutral-300">
                {adjustments.contrast > 0 ? `+${adjustments.contrast}` : adjustments.contrast}
              </span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={adjustments.contrast}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                onChange((prev) => ({ ...prev, contrast: val }));
              }}
              className="w-full accent-amber-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg appearance-none"
            />
          </div>

          {/* Saturation */}
          <div>
            <div className="flex justify-between text-neutral-400 mb-1">
              <span>Saturation</span>
              <span className="font-mono tabular-nums text-neutral-300">
                {adjustments.saturation > 0 ? `+${adjustments.saturation}` : adjustments.saturation}
              </span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={adjustments.saturation}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                onChange((prev) => ({ ...prev, saturation: val }));
              }}
              className="w-full accent-amber-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg appearance-none"
            />
          </div>

          {/* Gamma */}
          <div>
            <div className="flex justify-between text-neutral-400 mb-1">
              <span>Gamma</span>
              <span className="font-mono tabular-nums text-neutral-300">
                {adjustments.gamma.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.05"
              value={adjustments.gamma}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onChange((prev) => ({ ...prev, gamma: val }));
              }}
              className="w-full accent-amber-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg appearance-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
