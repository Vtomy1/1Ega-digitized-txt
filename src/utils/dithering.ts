import { ImageAdjustments, QuantizedResult } from '../types';
import { EGA_PALETTE, findClosestEgaIndex } from './egaPalette';

// 4x4 Bayer Matrix normalized to 0..15
const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

// 8x8 Bayer Matrix normalized to 0..63
const BAYER_8X8 = [
  [ 0, 32,  8, 40,  2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44,  4, 36, 14, 46,  6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [ 3, 35, 11, 43,  1, 33,  9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47,  7, 39, 13, 45,  5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
];

// Halftone 4x4 cluster matrix
const HALFTONE_4X4 = [
  [ 6,  7,  8,  9],
  [ 5,  0,  1, 10],
  [ 4,  3,  2, 11],
  [15, 14, 13, 12],
];

function clamp(v: number, min = 0, max = 255): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * Preprocess an RGB pixel using user adjustments (brightness, contrast, saturation, gamma, invert)
 */
function applyAdjustments(
  r: number,
  g: number,
  b: number,
  adj: ImageAdjustments
): [number, number, number] {
  // 1. Invert
  if (adj.invert) {
    r = 255 - r;
    g = 255 - g;
    b = 255 - b;
  }

  // 2. Brightness (-100 to +100)
  if (adj.brightness !== 0) {
    const bOffset = (adj.brightness / 100) * 128;
    r += bOffset;
    g += bOffset;
    b += bOffset;
  }

  // 3. Contrast (-100 to +100)
  if (adj.contrast !== 0) {
    const factor = (259 * (adj.contrast + 100)) / (100 * (259 - adj.contrast));
    r = factor * (r - 128) + 128;
    g = factor * (g - 128) + 128;
    b = factor * (b - 128) + 128;
  }

  // 4. Saturation (-100 to +100)
  if (adj.saturation !== 0) {
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    const satFactor = 1 + adj.saturation / 100;
    r = gray + (r - gray) * satFactor;
    g = gray + (g - gray) * satFactor;
    b = gray + (b - gray) * satFactor;
  }

  // 5. Gamma (0.5 to 2.5)
  if (adj.gamma !== 1) {
    const invGamma = 1 / adj.gamma;
    r = 255 * Math.pow(Math.max(0, r) / 255, invGamma);
    g = 255 * Math.pow(Math.max(0, g) / 255, invGamma);
    b = 255 * Math.pow(Math.max(0, b) / 255, invGamma);
  }

  return [clamp(r), clamp(g), clamp(b)];
}

/**
 * Quantize and dither an image to the 16-color EGA palette.
 */
export function quantizeImageToEga(
  sourceImage: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  adjustments: ImageAdjustments
): QuantizedResult {
  const targetW = Math.max(1, Math.round(adjustments.targetWidth));
  const targetH = Math.max(1, Math.round(adjustments.targetHeight));

  // Create an offscreen canvas to scale and sample image
  const offscreen = document.createElement('canvas');
  offscreen.width = targetW;
  offscreen.height = targetH;
  const ctx = offscreen.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Fill canvas with EGA black (0) as background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, targetW, targetH);

  // Compute drawing destination based on fit mode
  if (adjustments.fitMode === 'stretch') {
    ctx.drawImage(sourceImage, 0, 0, targetW, targetH);
  } else if (adjustments.fitMode === 'crop') {
    // Fill container, cropping overflow
    const scale = Math.max(targetW / sourceWidth, targetH / sourceHeight);
    const sw = targetW / scale;
    const sh = targetH / scale;
    const sx = (sourceWidth - sw) / 2;
    const sy = (sourceHeight - sh) / 2;
    ctx.drawImage(sourceImage, sx, sy, sw, sh, 0, 0, targetW, targetH);
  } else {
    // Fit within container, letterbox
    const scale = Math.min(targetW / sourceWidth, targetH / sourceHeight);
    const dw = sourceWidth * scale;
    const dh = sourceHeight * scale;
    const dx = (targetW - dw) / 2;
    const dy = (targetH - dh) / 2;
    ctx.drawImage(sourceImage, 0, 0, sourceWidth, sourceHeight, dx, dy, dw, dh);
  }

  const rawImgData = ctx.getImageData(0, 0, targetW, targetH);
  const src = rawImgData.data;

  // Working float buffers for RGB to hold error diffusion without clamping prematurely
  const floatR = new Float32Array(targetW * targetH);
  const floatG = new Float32Array(targetW * targetH);
  const floatB = new Float32Array(targetW * targetH);

  // Preprocess source pixels
  for (let i = 0; i < targetW * targetH; i++) {
    const idx = i * 4;
    const [ar, ag, ab] = applyAdjustments(src[idx], src[idx + 1], src[idx + 2], adjustments);
    floatR[i] = ar;
    floatG[i] = ag;
    floatB[i] = ab;
  }

  const indices = new Uint8Array(targetW * targetH);
  const outRgba = new Uint8ClampedArray(targetW * targetH * 4);
  const colorCounts = new Array(16).fill(0);
  const strength = Math.max(0, Math.min(1, adjustments.ditherStrength / 100));

  const algo = adjustments.algorithm;
  const enabled = adjustments.enabledColors;
  const distMethod = adjustments.colorDistance;

  // Dithering loop
  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const idx = y * targetW + x;
      let currR = floatR[idx];
      let currG = floatG[idx];
      let currB = floatB[idx];

      // Ordered / pattern dithering adjustments prior to quantization
      if (algo === 'bayer4') {
        const matrixVal = BAYER_4X4[y % 4][x % 4];
        // Center around 0 and scale by strength: range approx -32..+32
        const offset = ((matrixVal - 7.5) / 7.5) * 32 * strength;
        currR = clamp(currR + offset);
        currG = clamp(currG + offset);
        currB = clamp(currB + offset);
      } else if (algo === 'bayer8') {
        const matrixVal = BAYER_8X8[y % 8][x % 8];
        const offset = ((matrixVal - 31.5) / 31.5) * 36 * strength;
        currR = clamp(currR + offset);
        currG = clamp(currG + offset);
        currB = clamp(currB + offset);
      } else if (algo === 'halftone') {
        const matrixVal = HALFTONE_4X4[y % 4][x % 4];
        const offset = ((matrixVal - 7.5) / 7.5) * 28 * strength;
        currR = clamp(currR + offset);
        currG = clamp(currG + offset);
        currB = clamp(currB + offset);
      }

      // Find closest EGA color
      const egaIndex = findClosestEgaIndex(
        clamp(currR),
        clamp(currG),
        clamp(currB),
        enabled,
        distMethod
      );

      indices[idx] = egaIndex;
      colorCounts[egaIndex]++;

      const [targetR, targetG, targetB] = EGA_PALETTE[egaIndex].rgb;

      // Write to RGBA output
      const rgbaIdx = idx * 4;
      outRgba[rgbaIdx] = targetR;
      outRgba[rgbaIdx + 1] = targetG;
      outRgba[rgbaIdx + 2] = targetB;
      outRgba[rgbaIdx + 3] = 255;

      // Error Diffusion algorithms
      if (strength > 0) {
        const errR = (currR - targetR) * strength;
        const errG = (currG - targetG) * strength;
        const errB = (currB - targetB) * strength;

        const distribute = (dx: number, dy: number, factor: number) => {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < targetW && ny >= 0 && ny < targetH) {
            const nIdx = ny * targetW + nx;
            floatR[nIdx] += errR * factor;
            floatG[nIdx] += errG * factor;
            floatB[nIdx] += errB * factor;
          }
        };

        if (algo === 'floyd-steinberg') {
          distribute(1, 0, 7 / 16);
          distribute(-1, 1, 3 / 16);
          distribute(0, 1, 5 / 16);
          distribute(1, 1, 1 / 16);
        } else if (algo === 'atkinson') {
          // Atkinson distributes 1/8 to 6 neighbors (keeps 2/8 = high contrast vintage aesthetic)
          distribute(1, 0, 1 / 8);
          distribute(2, 0, 1 / 8);
          distribute(-1, 1, 1 / 8);
          distribute(0, 1, 1 / 8);
          distribute(1, 1, 1 / 8);
          distribute(0, 2, 1 / 8);
        } else if (algo === 'burkes') {
          distribute(1, 0, 8 / 32);
          distribute(2, 0, 4 / 32);
          distribute(-2, 1, 2 / 32);
          distribute(-1, 1, 4 / 32);
          distribute(0, 1, 8 / 32);
          distribute(1, 1, 4 / 32);
          distribute(2, 1, 2 / 32);
        } else if (algo === 'sierra-lite') {
          distribute(1, 0, 2 / 4);
          distribute(-1, 1, 1 / 4);
          distribute(0, 1, 1 / 4);
        }
      }
    }
  }

  return {
    width: targetW,
    height: targetH,
    indices,
    rgba: outRgba,
    colorCounts,
    totalPixels: targetW * targetH,
    aspectRatio: targetW / targetH,
  };
}
