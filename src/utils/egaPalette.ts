import { EgaColor, ColorDistanceMethod } from '../types';

/**
 * Standard IBM Enhanced Graphics Adapter (EGA) 16-Color Palette.
 * Used natively by MS-DOS QBasic in SCREEN 7 (320x200), SCREEN 9 (640x350), and SCREEN 12 (640x480 default).
 */
export const EGA_PALETTE: EgaColor[] = [
  { index: 0,  name: 'Black',         qbasicName: '0 - Black',         hex: '#000000', rgb: [0, 0, 0] },
  { index: 1,  name: 'Blue',          qbasicName: '1 - Blue',          hex: '#0000AA', rgb: [0, 0, 170] },
  { index: 2,  name: 'Green',         qbasicName: '2 - Green',         hex: '#00AA00', rgb: [0, 170, 0] },
  { index: 3,  name: 'Cyan',          qbasicName: '3 - Cyan',          hex: '#00AAAA', rgb: [0, 170, 170] },
  { index: 4,  name: 'Red',           qbasicName: '4 - Red',           hex: '#AA0000', rgb: [170, 0, 0] },
  { index: 5,  name: 'Magenta',       qbasicName: '5 - Magenta',       hex: '#AA00AA', rgb: [170, 0, 170] },
  { index: 6,  name: 'Brown',         qbasicName: '6 - Brown',         hex: '#AA5500', rgb: [170, 85, 0] },
  { index: 7,  name: 'Light Gray',    qbasicName: '7 - White/Lt Gray', hex: '#AAAAAA', rgb: [170, 170, 170] },
  { index: 8,  name: 'Dark Gray',     qbasicName: '8 - Dark Gray',     hex: '#555555', rgb: [85, 85, 85] },
  { index: 9,  name: 'Bright Blue',   qbasicName: '9 - Bright Blue',   hex: '#5555FF', rgb: [85, 85, 255] },
  { index: 10, name: 'Bright Green',  qbasicName: '10 - Bright Green', hex: '#55FF55', rgb: [85, 255, 85] },
  { index: 11, name: 'Bright Cyan',   qbasicName: '11 - Bright Cyan',  hex: '#55FFFF', rgb: [85, 255, 255] },
  { index: 12, name: 'Bright Red',    qbasicName: '12 - Bright Red',   hex: '#FF5555', rgb: [255, 85, 85] },
  { index: 13, name: 'Bright Magenta',qbasicName: '13 - Bright Magenta',hex: '#FF55FF', rgb: [255, 85, 255] },
  { index: 14, name: 'Yellow',        qbasicName: '14 - Yellow',       hex: '#FFFF55', rgb: [255, 255, 85] },
  { index: 15, name: 'Bright White',  qbasicName: '15 - Bright White', hex: '#FFFFFF', rgb: [255, 255, 255] },
];

/**
 * Standard resolution presets for QBasic development
 */
export const RESOLUTION_PRESETS = [
  {
    id: 's7-full',
    name: 'SCREEN 7 (320 × 200)',
    width: 320,
    height: 200,
    screenMode: 'SCREEN 7',
    description: 'Standard EGA 16-color fullscreen (DOS classic)',
  },
  {
    id: 's7-half',
    name: 'Quarter Screen (160 × 100)',
    width: 160,
    height: 100,
    screenMode: 'SCREEN 7',
    description: 'Crisp pixel art scaling for sprites & intros',
  },
  {
    id: 's7-sprite-large',
    name: 'Sprite Grid (80 × 50)',
    width: 80,
    height: 50,
    screenMode: 'SCREEN 7 / 12',
    description: 'Optimal for DATA statements (<4KB memory)',
  },
  {
    id: 'icon-64',
    name: 'Game Icon (64 × 64)',
    width: 64,
    height: 64,
    screenMode: 'SCREEN 7 / 12',
    description: 'Square tile / avatar for PUT / GET routines',
  },
  {
    id: 's7-sprite-small',
    name: 'Compact Tile (40 × 25)',
    width: 40,
    height: 25,
    screenMode: 'SCREEN 7',
    description: 'Ultra fast text-matrix or mini-banner',
  },
  {
    id: 's12-full',
    name: 'SCREEN 12 (640 × 480)',
    width: 640,
    height: 480,
    screenMode: 'SCREEN 12',
    description: 'VGA 16-color high resolution',
  },
];

/**
 * Calculate distance between two RGB colors
 */
export function getColorDistance(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number,
  method: ColorDistanceMethod = 'perceptual'
): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;

  if (method === 'euclidean') {
    return dr * dr + dg * dg + db * db;
  }

  if (method === 'redmean') {
    // Redmean color difference approximation
    const rmean = (r1 + r2) / 2;
    return (
      (2 + rmean / 256) * dr * dr +
      4 * dg * dg +
      (2 + (255 - rmean) / 256) * db * db
    );
  }

  // Perceptual weighting based on human retinal sensitivity (approx ITU-R BT.601)
  return 0.299 * dr * dr + 0.587 * dg * dg + 0.114 * db * db;
}

/**
 * Find the closest EGA color index for a given RGB
 */
export function findClosestEgaIndex(
  r: number,
  g: number,
  b: number,
  enabledColors: boolean[] = new Array(16).fill(true),
  method: ColorDistanceMethod = 'perceptual'
): number {
  let closestIndex = 0;
  let minDistance = Infinity;

  for (let i = 0; i < 16; i++) {
    if (!enabledColors[i]) continue;
    const [er, eg, eb] = EGA_PALETTE[i].rgb;
    const dist = getColorDistance(r, g, b, er, eg, eb, method);
    if (dist < minDistance) {
      minDistance = dist;
      closestIndex = i;
    }
  }

  return closestIndex;
}
