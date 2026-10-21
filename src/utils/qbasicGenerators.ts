import { QuantizedResult } from '../types';

const HEX_CHARS = '0123456789ABCDEF';

/**
 * Format raw pixel indices to hex digit string
 */
export function generateRawDigits(
  quant: QuantizedResult,
  lineBreakEveryRow = true
): string {
  const { width, height, indices } = quant;
  const lines: string[] = [];

  for (let y = 0; y < height; y++) {
    let row = '';
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      row += HEX_CHARS[indices[rowOffset + x]];
    }
    lines.push(row);
  }

  return lineBreakEveryRow ? lines.join('\n') : lines.join('');
}

/**
 * Generate QBasic Hex Digits String Loader (.BAS)
 */
export function generateHexStringLoader(
  quant: QuantizedResult,
  screenMode = 'SCREEN 7'
): string {
  const { width, height, indices } = quant;
  const chunkLength = 64; // Max chars per DATA string in QBasic
  const dataLines: string[] = [];

  let currentString = '';
  for (let i = 0; i < indices.length; i++) {
    currentString += HEX_CHARS[indices[i]];
    if (currentString.length >= chunkLength) {
      dataLines.push(`DATA "${currentString}"`);
      currentString = '';
    }
  }
  if (currentString.length > 0) {
    dataLines.push(`DATA "${currentString}"`);
  }

  return `' =========================================================================
' QBASIC 4-BIT EGA IMAGE LOADER (HEX DIGITS FORMAT)
' Generated with EGA Digitizer & QBasic Studio
'
' Image Dimensions: ${width} x ${height} Pixels (Total: ${quant.totalPixels} pixels)
' Video Mode: ${screenMode} (16 Colors EGA/VGA Palette)
' Compatibility: QBasic 1.1, MS-DOS QuickBASIC 4.5, QB64, DOSBox
' =========================================================================

${screenMode}
CLS

CONST IMG.W = ${width}
CONST IMG.H = ${height}
CONST TOTAL.PIXELS = ${quant.totalPixels}

PRINT "Loading ${width}x${height} EGA image...";
RESTORE ImageData

DIM X AS INTEGER, Y AS INTEGER
DIM ReadCount AS LONG
DIM Buffer$
DIM HexCh$
DIM Col AS INTEGER

X = 0: Y = 0: ReadCount = 0

DO WHILE ReadCount < TOTAL.PIXELS
    IF LEN(Buffer$) = 0 THEN
        READ Buffer$
    END IF
    
    HexCh$ = LEFT$(Buffer$, 1)
    Buffer$ = MID$(Buffer$, 2)
    
    ' Convert hex character '0'-'F' to color value 0-15
    Col = VAL("&H" + HexCh$)
    
    PSET (X, Y), Col
    
    X = X + 1
    IF X >= IMG.W THEN
        X = 0
        Y = Y + 1
    END IF
    ReadCount = ReadCount + 1
LOOP

' Wait for key press before exiting
LOCATE 24, 1
PRINT "Done! Press any key to exit...";
DO: LOOP UNTIL INKEY$ <> ""
SCREEN 0
WIDTH 80, 25
CLS
END

' -------------------------------------------------------------------------
' 4-Bit EGA Pixel Data (Hex Strings, 1 digit per pixel: 0-9, A-F)
' -------------------------------------------------------------------------
ImageData:
${dataLines.join('\n')}
`;
}

/**
 * Generate Packed 2-Pixels-Per-Byte Hex DATA Loader (.BAS)
 */
export function generatePackedDataLoader(
  quant: QuantizedResult,
  screenMode = 'SCREEN 7'
): string {
  const { width, height, indices } = quant;
  const packedBytes: number[] = [];

  for (let i = 0; i < indices.length; i += 2) {
    const p1 = indices[i];
    const p2 = i + 1 < indices.length ? indices[i + 1] : 0;
    // High nibble = p1, Low nibble = p2
    const packed = (p1 << 4) | (p2 & 0x0f);
    packedBytes.push(packed);
  }

  const bytesPerLine = 16;
  const dataLines: string[] = [];

  for (let i = 0; i < packedBytes.length; i += bytesPerLine) {
    const chunk = packedBytes.slice(i, i + bytesPerLine);
    const hexTokens = chunk.map((b) => {
      const h = b.toString(16).toUpperCase().padStart(2, '0');
      return `&H${h}`;
    });
    dataLines.push(`DATA ${hexTokens.join(', ')}`);
  }

  return `' =========================================================================
' QBASIC 4-BIT EGA PACKED BYTES LOADER (2 PIXELS PER BYTE)
' Generated with EGA Digitizer & QBasic Studio
'
' Image Dimensions: ${width} x ${height} Pixels
' Storage: ${packedBytes.length} Bytes (50% memory savings via 4-bit nibble packing)
' Video Mode: ${screenMode} (16 Colors)
' =========================================================================

${screenMode}
CLS

CONST IMG.W = ${width}
CONST IMG.H = ${height}
CONST TOTAL.BYTES = ${packedBytes.length}

RESTORE PackedData

DIM ByteVal AS INTEGER
DIM P1 AS INTEGER, P2 AS INTEGER
DIM X AS INTEGER, Y AS INTEGER
DIM B AS LONG

X = 0: Y = 0

FOR B = 1 TO TOTAL.BYTES
    READ ByteVal
    
    ' Unpack two 4-bit EGA nibbles from 1 byte (0..255)
    P1 = ByteVal \\ 16        ' High 4 bits: Color of Pixel 1
    P2 = ByteVal AND 15       ' Low 4 bits:  Color of Pixel 2
    
    PSET (X, Y), P1
    X = X + 1
    IF X >= IMG.W THEN
        X = 0
        Y = Y + 1
    END IF
    
    ' Render pixel 2 if still inside image boundaries
    IF Y < IMG.H THEN
        PSET (X, Y), P2
        X = X + 1
        IF X >= IMG.W THEN
            X = 0
            Y = Y + 1
        END IF
    END IF
NEXT B

LOCATE 24, 1
PRINT "Done! Press any key...";
DO: LOOP UNTIL INKEY$ <> ""
SCREEN 0
CLS
END

' -------------------------------------------------------------------------
' Packed 4-Bit EGA Data (2 pixels per byte, 0x00 to 0xFF)
' -------------------------------------------------------------------------
PackedData:
${dataLines.join('\n')}
`;
}

/**
 * Generate Run-Length Encoded (RLE) Loader (.BAS)
 */
export function generateRleLoader(
  quant: QuantizedResult,
  screenMode = 'SCREEN 7'
): string {
  const { width, height, indices } = quant;

  // Run-Length encode horizontal runs
  interface RleSpan {
    count: number;
    color: number;
  }
  const runs: RleSpan[] = [];

  let currentRunColor = indices[0];
  let currentRunLength = 1;

  for (let i = 1; i < indices.length; i++) {
    const col = indices[i];
    // Break run at max length 255 or when color changes or at line boundary for cleaner LINE drawing
    if (col === currentRunColor && currentRunLength < 255) {
      currentRunLength++;
    } else {
      runs.push({ count: currentRunLength, color: currentRunColor });
      currentRunColor = col;
      currentRunLength = 1;
    }
  }
  runs.push({ count: currentRunLength, color: currentRunColor });

  const dataLines: string[] = [];
  const runsPerLine = 10;
  for (let i = 0; i < runs.length; i += runsPerLine) {
    const chunk = runs.slice(i, i + runsPerLine);
    const tokens = chunk.map((r) => `${r.count},${r.color}`);
    dataLines.push(`DATA ${tokens.join(', ')}`);
  }

  return `' =========================================================================
' QBASIC FAST RLE (RUN-LENGTH ENCODED) EGA IMAGE LOADER
' Generated with EGA Digitizer & QBasic Studio
'
' Dimensions: ${width} x ${height} | Raw Pixels: ${quant.totalPixels} | RLE Packets: ${runs.length}
' Compression Ratio: ${((1 - (runs.length * 2) / quant.totalPixels) * 100).toFixed(1)}% reduction
' Uses horizontal spans for rapid rendering in DOS
' =========================================================================

${screenMode}
CLS

CONST IMG.W = ${width}
CONST IMG.H = ${height}
CONST TOTAL.RUNS = ${runs.length}

RESTORE RleData

DIM R AS LONG
DIM RunLen AS INTEGER, Col AS INTEGER
DIM X AS INTEGER, Y AS INTEGER
DIM RemainingInRow AS INTEGER
DIM DrawLen AS INTEGER

X = 0: Y = 0

FOR R = 1 TO TOTAL.RUNS
    READ RunLen, Col
    
    DO WHILE RunLen > 0
        RemainingInRow = IMG.W - X
        IF RunLen <= RemainingInRow THEN
            DrawLen = RunLen
        ELSE
            DrawLen = RemainingInRow
        END IF
        
        ' Draw solid color span across scanline
        IF DrawLen = 1 THEN
            PSET (X, Y), Col
        ELSE
            LINE (X, Y)-(X + DrawLen - 1, Y), Col
        END IF
        
        X = X + DrawLen
        IF X >= IMG.W THEN
            X = 0
            Y = Y + 1
        END IF
        RunLen = RunLen - DrawLen
    LOOP
NEXT R

LOCATE 24, 1
PRINT "RLE Render Complete. Press any key...";
DO: LOOP UNTIL INKEY$ <> ""
SCREEN 0
CLS
END

' -------------------------------------------------------------------------
' RLE Data (Count, Color) Pairs
' -------------------------------------------------------------------------
RleData:
${dataLines.join('\n')}
`;
}

/**
 * Generate Authentic QBasic BSAVE Binary File and BLOAD Loader
 */
export function generateBsaveBinary(
  quant: QuantizedResult
): { binary: Uint8Array; loaderBas: string } {
  const { width, height, indices } = quant;

  // QBasic PUT / GET sprite array format:
  // In SCREEN 7 (4-bit EGA):
  // Header: Word 0 = Width in bits (width * 4), Word 1 = Height in scanlines
  // Followed by raw EGA planar or byte stream.
  // Standard raw array byte size: 4 + (width * height / 2)
  const dataSize = Math.ceil((width * height) / 2);
  const totalArrayBytes = 4 + dataSize;

  // Authentic QuickBASIC BSAVE file format:
  // 7-byte Header:
  // Byte 0: 0xFD (Signature)
  // Bytes 1-2: Segment address (0x0000)
  // Bytes 3-4: Offset address (0x0000)
  // Bytes 5-6: Length of data (Little-endian 16-bit word)
  const bsaveHeaderLength = 7;
  const buffer = new Uint8Array(bsaveHeaderLength + totalArrayBytes);

  // 1. Signature
  buffer[0] = 0xfd;

  // 2. Segment = 0
  buffer[1] = 0x00;
  buffer[2] = 0x00;

  // 3. Offset = 0
  buffer[3] = 0x00;
  buffer[4] = 0x00;

  // 4. File data length
  buffer[5] = totalArrayBytes & 0xff;
  buffer[6] = (totalArrayBytes >> 8) & 0xff;

  // 5. Sprite header: width in bits (width * 4 in 16-color mode)
  const widthInBits = width * 4;
  buffer[7] = widthInBits & 0xff;
  buffer[8] = (widthInBits >> 8) & 0xff;

  // Height in scanlines
  buffer[9] = height & 0xff;
  buffer[10] = (height >> 8) & 0xff;

  // 6. Packed nibbles payload
  let bufPtr = 11;
  for (let i = 0; i < indices.length; i += 2) {
    const p1 = indices[i];
    const p2 = i + 1 < indices.length ? indices[i + 1] : 0;
    buffer[bufPtr++] = (p1 << 4) | (p2 & 0x0f);
  }

  // Integer array size needed in QBasic: (totalArrayBytes + 1) \ 2
  const arrayWords = Math.ceil(totalArrayBytes / 2);

  const loaderBas = `' =========================================================================
' QBASIC BINARY BLOAD & PUT SPRITE LOADER (.BIN)
' Generated with EGA Digitizer & QBasic Studio
'
' Target File: "IMAGE.BIN" (Must be in same folder as this .BAS file)
' Array Size: ${arrayWords} Integer Elements (${totalArrayBytes} Bytes)
' Image Resolution: ${width} x ${height} Pixels (EGA 16 Colors)
' =========================================================================

SCREEN 7
CLS

' 1. Allocate integer array in memory for the sprite
DIM ImageArray%(${arrayWords})

' 2. Point segment to our BASIC variable data segment
DEF SEG = VARSEG(ImageArray%(0))

' 3. BLOAD binary file directly from disk into memory
PRINT "Loading IMAGE.BIN from disk...";
BLOAD "IMAGE.BIN", VARPTR(ImageArray%(0))
DEF SEG ' Restore default BASIC segment

CLS

' 4. Display sprite instantly onto screen using QBasic PUT statement
' Syntax: PUT (X, Y), Array, Action (PSET / PRESET / XOR / OR / AND)
PUT (10, 10), ImageArray%, PSET

' Also demonstrate tiling or centering
PUT (10 + ${width} + 10, 10), ImageArray%, PSET

LOCATE 23, 1
PRINT "Loaded via BLOAD and drawn via PUT (X, Y)!";
LOCATE 24, 1
PRINT "Press any key to exit...";

DO: LOOP UNTIL INKEY$ <> ""
SCREEN 0
CLS
END
`;

  return { binary: buffer, loaderBas };
}

/**
 * Generate QBasic Screen Saver Routine (.BAS)
 * This is a complete QBasic program that runs on DOS/QBasic, reads the active screen,
 * and saves it to disk as either Hex Digits, DATA statements, or BSAVE binary!
 */
export function generateQBasicSaverRoutine(
  width = 80,
  height = 50,
  screenMode = 'SCREEN 7'
): string {
  return `' =========================================================================
' QBASIC ON-SCREEN GRAPHIC SAVER ROUTINE
' Run this program inside MS-DOS QBasic / QB64 to capture screen artwork
' and export it to disk in 3 standard formats:
'   1. "SCREEN.HEX"  - Plain 4-Bit EGA Hex Digits
'   2. "EXPORT.BAS"  - Ready-to-include QBasic DATA statements
'   3. "SPRITE.BIN"  - Binary BSAVE file ready for BLOAD
' =========================================================================

${screenMode}
CLS

' --- DEMO DRAWING (Replace this block with your actual game/artwork) ---
PRINT "Drawing sample graphic on ${screenMode}..."
FOR Y = 0 TO ${height} - 1
    FOR X = 0 TO ${width} - 1
        ' Draw concentric color patterns for demonstration
        Col = ((X \\ 4) + (Y \\ 4)) MOD 16
        PSET (X, Y), Col
    NEXT X
NEXT Y
' ---------------------------------------------------------------------

LOCATE 20, 1
PRINT "Choose Export Format to Save:"
PRINT "1. Save as Hex Digits Text File (SCREEN.HEX)"
PRINT "2. Save as QBasic DATA statements (EXPORT.BAS)"
PRINT "3. Save as Binary BSAVE file (SPRITE.BIN)"
PRINT "Press 1, 2, or 3..."

DO
    K$ = INKEY$
LOOP UNTIL K$ = "1" OR K$ = "2" OR K$ = "3"

CONST CAP.W = ${width}
CONST CAP.H = ${height}

IF K$ = "1" THEN
    ' -------------------------------------------------------------
    ' METHOD 1: Save as Hex Digits (1 character per pixel: 0-9, A-F)
    ' -------------------------------------------------------------
    CLS
    PRINT "Saving SCREEN.HEX..."
    OPEN "SCREEN.HEX" FOR OUTPUT AS #1
    
    HexLookup$ = "0123456789ABCDEF"
    
    FOR Y = 0 TO CAP.H - 1
        RowOut$ = ""
        FOR X = 0 TO CAP.W - 1
            ColVal% = POINT(X, Y)  ' Read color from current screen
            IF ColVal% < 0 OR ColVal% > 15 THEN ColVal% = 0
            HexChar$ = MID$(HexLookup$, ColVal% + 1, 1)
            RowOut$ = RowOut$ + HexChar$
        NEXT X
        PRINT #1, RowOut$
    NEXT Y
    
    CLOSE #1
    PRINT "Successfully saved SCREEN.HEX! (" + STR$(CAP.W) + "x" + STR$(CAP.H) + ")"

ELSEIF K$ = "2" THEN
    ' -------------------------------------------------------------
    ' METHOD 2: Save as Packed DATA statements (2 pixels per byte)
    ' -------------------------------------------------------------
    CLS
    PRINT "Generating EXPORT.BAS with DATA statements..."
    OPEN "EXPORT.BAS" FOR OUTPUT AS #1
    
    PRINT #1, "' QBasic Packed DATA Statements Export"
    PRINT #1, "' Dimensions: "; CAP.W; "x"; CAP.H
    
    LineBuffer$ = "DATA "
    ItemsInLine = 0
    
    FOR Y = 0 TO CAP.H - 1
        X = 0
        DO WHILE X < CAP.W
            P1% = POINT(X, Y)
            X = X + 1
            IF X < CAP.W THEN
                P2% = POINT(X, Y)
                X = X + 1
            ELSE
                P2% = 0
                X = X + 1
            END IF
            
            PackedByte% = (P1% * 16) + (P2% AND 15)
            ByteHex$ = "&H" + HEX$(PackedByte%)
            IF LEN(ByteHex$) = 3 THEN ByteHex$ = "&H0" + RIGHT$(ByteHex$, 1)
            
            IF ItemsInLine = 0 THEN
                LineBuffer$ = "DATA " + ByteHex$
            ELSE
                LineBuffer$ = LineBuffer$ + ", " + ByteHex$
            END IF
            
            ItemsInLine = ItemsInLine + 1
            IF ItemsInLine >= 16 THEN
                PRINT #1, LineBuffer$
                ItemsInLine = 0
            END IF
        LOOP
    NEXT Y
    
    IF ItemsInLine > 0 THEN PRINT #1, LineBuffer$
    CLOSE #1
    PRINT "Successfully generated EXPORT.BAS!"

ELSEIF K$ = "3" THEN
    ' -------------------------------------------------------------
    ' METHOD 3: Capture Sprite via GET and BSAVE to disk
    ' -------------------------------------------------------------
    CLS
    PRINT "Saving SPRITE.BIN via GET & BSAVE..."
    
    ' Array size calculation for SCREEN 7 (4 planes / 4-bit)
    ' Formula: 4 + INT(((CAP.W * 4 + 7) \\ 8) * CAP.H)
    ArrayBytes% = 4 + INT(((CAP.W * 4 + 7) \\ 8) * CAP.H)
    ArrayWords% = (ArrayBytes% + 1) \\ 2
    
    DIM SpriteBuffer%(ArrayWords%)
    
    ' Capture graphic into array
    GET (0, 0)-(CAP.W - 1, CAP.H - 1), SpriteBuffer%
    
    ' BSAVE array directly to disk
    DEF SEG = VARSEG(SpriteBuffer%(0))
    BSAVE "SPRITE.BIN", VARPTR(SpriteBuffer%(0)), ArrayBytes%
    DEF SEG
    
    PRINT "Successfully saved SPRITE.BIN! (" + STR$(ArrayBytes%) + " bytes)"
END IF

LOCATE 24, 1
PRINT "Done! Press any key to quit...";
DO: LOOP UNTIL INKEY$ <> ""
SCREEN 0
CLS
END
`;
}
