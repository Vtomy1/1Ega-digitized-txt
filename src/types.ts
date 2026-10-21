export interface EgaColor {
  index: number;
  name: string;
  qbasicName: string;
  hex: string;
  rgb: [number, number, number];
}

export type DitherAlgorithm =
  | 'none'
  | 'floyd-steinberg'
  | 'atkinson'
  | 'bayer4'
  | 'bayer8'
  | 'burkes'
  | 'sierra-lite'
  | 'halftone';

export type ColorDistanceMethod = 'perceptual' | 'euclidean' | 'redmean';

export type AspectRatioMode = 'fit' | 'crop' | 'stretch';

export interface ResolutionPreset {
  id: string;
  name: string;
  width: number;
  height: number;
  screenMode: string;
  description: string;
}

export interface ImageAdjustments {
  brightness: number; // -100 to 100
  contrast: number;   // -100 to 100
  saturation: number; // -100 to 100
  gamma: number;      // 0.5 to 2.5
  invert: boolean;
  ditherStrength: number; // 0 to 100
  colorDistance: ColorDistanceMethod;
  algorithm: DitherAlgorithm;
  fitMode: AspectRatioMode;
  targetWidth: number;
  targetHeight: number;
  targetScreenMode: string;
  enabledColors: boolean[]; // 16 booleans
}

export interface QuantizedResult {
  width: number;
  height: number;
  indices: Uint8Array; // 0..15 per pixel
  rgba: Uint8ClampedArray;
  colorCounts: number[]; // count for each of 16 colors
  totalPixels: number;
  aspectRatio: number;
}

export type ExportFormat =
  | 'hex-string'
  | 'packed-data'
  | 'rle'
  | 'bsave'
  | 'qbasic-saver'
  | 'raw-digits';
