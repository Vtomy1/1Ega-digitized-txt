import React from 'react';
import { Palette, Check, Eye } from 'lucide-react';
import { EGA_PALETTE } from '../utils/egaPalette';
import { QuantizedResult } from '../types';

interface PaletteInspectorProps {
  quantizedResult: QuantizedResult | null;
  enabledColors: boolean[];
  highlightedColor: number | null;
  onToggleColor: (index: number) => void;
  onHighlightColor: (index: number | null) => void;
  onEnableAllColors: () => void;
}

export function PaletteInspector({
  quantizedResult,
  enabledColors,
  highlightedColor,
  onToggleColor,
  onHighlightColor,
  onEnableAllColors,
}: PaletteInspectorProps) {
  const totalPixels = quantizedResult?.totalPixels || 1;

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-neutral-200">
            IBM 4-Bit EGA Palette (16 Colors)
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onEnableAllColors}
            className="text-xs text-neutral-400 hover:text-white px-2 py-0.5 rounded hover:bg-neutral-800 transition-colors"
          >
            Enable All
          </button>
        </div>
      </div>

      <p className="text-xs text-neutral-400">
        Click a color chip to isolate and highlight where it appears on the image. Toggle checkboxes to allow or restrict specific colors from quantization.
      </p>

      {/* Grid of 16 colors */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {EGA_PALETTE.map((color) => {
          const count = quantizedResult ? quantizedResult.colorCounts[color.index] : 0;
          const percentage = ((count / totalPixels) * 100).toFixed(1);
          const isEnabled = enabledColors[color.index];
          const isHighlighted = highlightedColor === color.index;

          return (
            <div
              key={color.index}
              onMouseEnter={() => onHighlightColor(color.index)}
              onMouseLeave={() => {
                if (highlightedColor === color.index) {
                  onHighlightColor(null);
                }
              }}
              onClick={() => {
                if (highlightedColor === color.index) {
                  onHighlightColor(null);
                } else {
                  onHighlightColor(color.index);
                }
              }}
              className={`p-2 rounded-md border text-left cursor-pointer transition-all flex flex-col justify-between ${
                isHighlighted
                  ? 'border-amber-400 bg-amber-950/30 ring-1 ring-amber-400/50'
                  : isEnabled
                  ? 'border-neutral-800 bg-neutral-950/60 hover:border-neutral-700 hover:bg-neutral-950'
                  : 'border-neutral-800/60 bg-neutral-950/20 opacity-50'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5 mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-4 h-4 rounded shadow-inner border border-neutral-700/80 shrink-0"
                    style={{ backgroundColor: color.hex }}
                  />
                  <span className="font-mono text-xs font-bold text-neutral-300">
                    #{color.index.toString(16).toUpperCase()}
                  </span>
                  <span className="text-xs font-medium text-neutral-200 truncate">
                    {color.name}
                  </span>
                </div>

                {/* Enable / Disable toggle button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleColor(color.index);
                  }}
                  className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${
                    isEnabled
                      ? 'bg-neutral-800 text-amber-400 hover:bg-neutral-700'
                      : 'bg-neutral-900 border border-neutral-700 text-neutral-600'
                  }`}
                  title={isEnabled ? 'Disable color from palette' : 'Enable color in palette'}
                >
                  {isEnabled && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </button>
              </div>

              {/* RGB and Usage bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-neutral-500 font-mono">
                  <span>{color.hex}</span>
                  <span className="tabular-nums text-neutral-400">
                    {count.toLocaleString()} px ({percentage}%)
                  </span>
                </div>

                {/* Progress mini bar */}
                <div className="w-full h-1 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.max(count > 0 ? 3 : 0, parseFloat(percentage)))}%`,
                      backgroundColor: color.hex,
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
