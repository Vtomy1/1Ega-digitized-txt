import React, { useState } from 'react';
import {
  Code,
  Copy,
  Check,
  Download,
  FileText,
  FileCode,
  Binary,
  HardDrive,
  Info,
} from 'lucide-react';
import { QuantizedResult, ExportFormat } from '../types';
import {
  generateHexStringLoader,
  generatePackedDataLoader,
  generateRleLoader,
  generateBsaveBinary,
  generateQBasicSaverRoutine,
  generateRawDigits,
} from '../utils/qbasicGenerators';
import { EGA_PALETTE } from '../utils/egaPalette';

interface CodeExportPanelProps {
  quantizedResult: QuantizedResult | null;
  screenMode: string;
}

export function CodeExportPanel({
  quantizedResult,
  screenMode,
}: CodeExportPanelProps) {
  const [activeTab, setActiveTab] = useState<ExportFormat>('hex-string');
  const [copied, setCopied] = useState(false);

  if (!quantizedResult) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 text-center text-neutral-500">
        Load or convert an image to view QBasic code samples and loaders.
      </div>
    );
  }

  // Generate code based on active tab
  let codeContent = '';
  let filename = 'IMAGE.BAS';
  let mimeType = 'text/plain';
  let binaryData: Uint8Array | null = null;
  let description = '';

  switch (activeTab) {
    case 'hex-string':
      codeContent = generateHexStringLoader(quantizedResult, screenMode);
      filename = 'EGA_HEX.BAS';
      description =
        'Each pixel is stored as a single 4-bit hexadecimal character (0-9, A-F). The QBasic program uses MID$ and VAL("&H" + ch) to decode and PSET onto the screen.';
      break;

    case 'packed-data':
      codeContent = generatePackedDataLoader(quantizedResult, screenMode);
      filename = 'EGA_PACK.BAS';
      description =
        'Two 4-bit EGA pixels are packed into every single byte (0x00 to 0xFF). QBasic unpacks with integer division (\\ 16) and bitwise (AND 15) for 50% memory savings.';
      break;

    case 'rle':
      codeContent = generateRleLoader(quantizedResult, screenMode);
      filename = 'EGA_RLE.BAS';
      description =
        'Compresses contiguous color pixels into (count, color) run spans. Uses QBasic LINE statements for near-instant rendering on vintage MS-DOS machines.';
      break;

    case 'bsave': {
      const bsave = generateBsaveBinary(quantizedResult);
      codeContent = bsave.loaderBas;
      binaryData = bsave.binary;
      filename = 'EGA_PUT.BAS';
      description =
        'Authentic QuickBASIC binary format. Allocates an integer memory array, loads the compiled .BIN binary file with DEF SEG and BLOAD, and renders with PUT (X,Y), Array%, PSET.';
      break;
    }

    case 'qbasic-saver':
      codeContent = generateQBasicSaverRoutine(
        quantizedResult.width,
        quantizedResult.height,
        screenMode
      );
      filename = 'SAVER.BAS';
      description =
        'A complete QBasic program to run inside DOS / QBasic that reads any on-screen artwork with POINT(X,Y) and saves it to disk as Hex Digits, DATA statements, or BSAVE binary files.';
      break;

    case 'raw-digits':
      codeContent = generateRawDigits(quantizedResult, true);
      filename = 'DIGITS.TXT';
      description =
        'Raw matrix of 4-bit hexadecimal digits (0-9, A-F) representing EGA color indices, separated row-by-row.';
      break;
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(codeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadCode = () => {
    const blob = new Blob([codeContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadBinary = () => {
    let rawBytes = binaryData;
    if (!rawBytes) {
      const bsave = generateBsaveBinary(quantizedResult);
      rawBytes = bsave.binary;
    }
    const blob = new Blob([rawBytes.buffer as ArrayBuffer], {
      type: 'application/octet-stream',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'IMAGE.BIN';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPng = () => {
    const offscreen = document.createElement('canvas');
    offscreen.width = quantizedResult.width;
    offscreen.height = quantizedResult.height;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return;
    const imgData = ctx.createImageData(quantizedResult.width, quantizedResult.height);
    imgData.data.set(quantizedResult.rgba);
    ctx.putImageData(imgData, 0, 0);

    const a = document.createElement('a');
    a.href = offscreen.toDataURL('image/png');
    a.download = `ega_${quantizedResult.width}x${quantizedResult.height}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadPalette = () => {
    // Generate Adobe / Paint Shop Pro JASC-PAL palette file format
    const palText = `JASC-PAL\n0100\n16\n${EGA_PALETTE.map((c) => `${c.rgb[0]} ${c.rgb[1]} ${c.rgb[2]}`).join('\n')}\n`;
    const blob = new Blob([palText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'EGA_16COLOR.PAL';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden flex flex-col">
      {/* Header with Format Tabs */}
      <div className="bg-neutral-950 px-4 pt-3 border-b border-neutral-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-neutral-200">
              QBasic Code & Exporters
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs rounded flex items-center gap-1.5 transition-colors font-medium"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
            <button
              onClick={handleDownloadCode}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold rounded flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download {filename}</span>
            </button>
          </div>
        </div>

        {/* Tab Strip */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-none text-xs">
          <button
            onClick={() => setActiveTab('hex-string')}
            className={`px-3 py-1.5 rounded-t font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'hex-string'
                ? 'bg-neutral-900 text-amber-400 border-t border-x border-neutral-800'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Hex Digits Loader</span>
          </button>

          <button
            onClick={() => setActiveTab('packed-data')}
            className={`px-3 py-1.5 rounded-t font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'packed-data'
                ? 'bg-neutral-900 text-amber-400 border-t border-x border-neutral-800'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Binary className="w-3.5 h-3.5" />
            <span>Packed Bytes DATA</span>
          </button>

          <button
            onClick={() => setActiveTab('rle')}
            className={`px-3 py-1.5 rounded-t font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'rle'
                ? 'bg-neutral-900 text-amber-400 border-t border-x border-neutral-800'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Fast RLE Loader</span>
          </button>

          <button
            onClick={() => setActiveTab('bsave')}
            className={`px-3 py-1.5 rounded-t font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'bsave'
                ? 'bg-neutral-900 text-amber-400 border-t border-x border-neutral-800'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Binary className="w-3.5 h-3.5" />
            <span>BSAVE & PUT Sprite</span>
          </button>

          <button
            onClick={() => setActiveTab('qbasic-saver')}
            className={`px-3 py-1.5 rounded-t font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'qbasic-saver'
                ? 'bg-neutral-900 text-amber-400 border-t border-x border-neutral-800'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>QBasic Screen Saver Code</span>
          </button>

          <button
            onClick={() => setActiveTab('raw-digits')}
            className={`px-3 py-1.5 rounded-t font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'raw-digits'
                ? 'bg-neutral-900 text-amber-400 border-t border-x border-neutral-800'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Raw Digits (.TXT)</span>
          </button>
        </div>
      </div>

      {/* Format Description Banner */}
      <div className="bg-neutral-950/70 px-4 py-2 border-b border-neutral-800 flex items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 text-neutral-400">
          <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>{description}</span>
        </div>
        {activeTab === 'bsave' && (
          <button
            onClick={handleDownloadBinary}
            className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-amber-400 rounded text-xs font-mono font-medium flex items-center gap-1.5 shrink-0 transition-colors"
          >
            <Download className="w-3 h-3" />
            <span>Download IMAGE.BIN</span>
          </button>
        )}
      </div>

      {/* Code Text Area with Line Numbers */}
      <div className="relative bg-[#000080]/30 font-mono text-xs text-neutral-200 p-4 max-h-[420px] overflow-auto select-text leading-relaxed">
        <pre className="whitespace-pre-wrap font-mono text-[11px] leading-5 text-neutral-300">
          {codeContent}
        </pre>
      </div>

      {/* Additional Asset Downloads Footer */}
      <div className="bg-neutral-950 px-4 py-2.5 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-400">
        <div className="flex items-center gap-2">
          <span>Extra Assets:</span>
          <button
            onClick={handleDownloadPng}
            className="px-2 py-0.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded border border-neutral-800 hover:border-neutral-700 transition-colors"
          >
            Export PNG
          </button>
          <button
            onClick={handleDownloadPalette}
            className="px-2 py-0.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded border border-neutral-800 hover:border-neutral-700 transition-colors"
          >
            EGA .PAL File
          </button>
          {activeTab !== 'bsave' && (
            <button
              onClick={handleDownloadBinary}
              className="px-2 py-0.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded border border-neutral-800 hover:border-neutral-700 transition-colors"
            >
              Binary .BIN
            </button>
          )}
        </div>
        <div className="text-neutral-500 text-[11px]">
          Runs in DOSBox, QBasic 1.1, QB64, & QuickBASIC 4.5
        </div>
      </div>
    </div>
  );
}
