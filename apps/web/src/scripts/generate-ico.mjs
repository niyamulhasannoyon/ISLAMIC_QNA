import fs from 'fs';
import path from 'path';

function createIco() {
  const width = 32;
  const height = 32;
  const bpp = 32;
  const imageSize = width * height * 4;
  const maskRowBytes = Math.ceil(width / 32) * 4;
  const maskSize = maskRowBytes * height;
  const dibHeaderSize = 40;
  const dibTotalSize = dibHeaderSize + imageSize + maskSize;

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // ICO Type
  header.writeUInt16LE(1, 4); // 1 Image

  const dirEntry = Buffer.alloc(16);
  dirEntry.writeUInt8(width, 0);
  dirEntry.writeUInt8(height, 1);
  dirEntry.writeUInt8(0, 2); // Colors
  dirEntry.writeUInt8(0, 3); // Reserved
  dirEntry.writeUInt16LE(1, 4); // Planes
  dirEntry.writeUInt16LE(bpp, 6); // Bits per pixel
  dirEntry.writeUInt32LE(dibTotalSize, 8); // Size of image data
  dirEntry.writeUInt32LE(22, 12); // Offset (6 + 16)

  const dibHeader = Buffer.alloc(40);
  dibHeader.writeUInt32LE(40, 0); // biSize
  dibHeader.writeInt32LE(width, 4); // biWidth
  dibHeader.writeInt32LE(height * 2, 8); // biHeight (doubled for ICO mask)
  dibHeader.writeUInt16LE(1, 12); // biPlanes
  dibHeader.writeUInt16LE(bpp, 14); // biBitCount
  dibHeader.writeUInt32LE(0, 16); // biCompression (BI_RGB)
  dibHeader.writeUInt32LE(imageSize + maskSize, 20); // biSizeImage
  dibHeader.writeInt32LE(0, 24); // biXPelsPerMeter
  dibHeader.writeInt32LE(0, 28); // biYPelsPerMeter
  dibHeader.writeUInt32LE(0, 32); // biClrUsed
  dibHeader.writeUInt32LE(0, 36); // biClrImportant

  // Draw 32x32 rounded icon with dark background (#09090b), border (#27272a), and emerald accent dot
  const pixels = Buffer.alloc(imageSize);
  const radius = 6;

  // Render from bottom row to top row (BMP order)
  for (let y = 0; y < height; y++) {
    const bmpY = height - 1 - y; // Screen Y: 0 at top, 31 at bottom
    for (let x = 0; x < width; x++) {
      const idx = (bmpY * width + x) * 4;

      // Check rounded corner distance
      let inside = true;
      let isBorder = false;

      const cornerX = x < radius ? radius - x : x >= width - radius ? x - (width - 1 - radius) : 0;
      const cornerY = y < radius ? radius - y : y >= height - radius ? y - (height - 1 - radius) : 0;

      if (cornerX > 0 && cornerY > 0) {
        const dist = Math.sqrt(cornerX * cornerX + cornerY * cornerY);
        if (dist > radius) inside = false;
        else if (dist > radius - 1.5) isBorder = true;
      }

      if (inside) {
        if (x === 0 || x === width - 1 || y === 0 || y === height - 1 || isBorder) {
          // Border color: #3f3f46 (BGR: 70, 63, 63)
          pixels[idx] = 70;      // B
          pixels[idx + 1] = 63;  // G
          pixels[idx + 2] = 63;  // R
          pixels[idx + 3] = 255; // A
        } else if (x >= 24 && x <= 27 && y >= 4 && y <= 7) {
          // Emerald accent dot: #10b981 (BGR: 129, 185, 16)
          pixels[idx] = 129;
          pixels[idx + 1] = 185;
          pixels[idx + 2] = 16;
          pixels[idx + 3] = 255;
        } else {
          // Subtle dark background: #09090b (BGR: 11, 9, 9)
          // Simple Fatwa typographic glyph approximation at center
          const isGlyph = 
            // Horizontal top bar for 'فت'
            (y === 14 && x >= 8 && x <= 22) ||
            (y === 15 && x >= 8 && x <= 23) ||
            // Right vertical stem
            (x >= 21 && x <= 23 && y >= 14 && y <= 21) ||
            // Bottom loop
            (y >= 20 && y <= 22 && x >= 10 && x <= 22) ||
            // Left curve / tail
            (x >= 8 && x <= 10 && y >= 15 && y <= 20) ||
            // Two dots for Ta
            (y === 10 && ((x >= 14 && x <= 15) || (x >= 18 && x <= 19)));

          if (isGlyph) {
            pixels[idx] = 245;     // B
            pixels[idx + 1] = 244; // G
            pixels[idx + 2] = 244; // R
            pixels[idx + 3] = 255; // A
          } else {
            pixels[idx] = 11;
            pixels[idx + 1] = 9;
            pixels[idx + 2] = 9;
            pixels[idx + 3] = 255;
          }
        }
      } else {
        // Transparent
        pixels[idx] = 0;
        pixels[idx + 1] = 0;
        pixels[idx + 2] = 0;
        pixels[idx + 3] = 0;
      }
    }
  }

  const mask = Buffer.alloc(maskSize, 0); // 0 means opaque/use alpha channel

  const icoBuffer = Buffer.concat([header, dirEntry, dibHeader, pixels, mask]);

  const publicDir = path.resolve(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  fs.writeFileSync(path.resolve(process.cwd(), 'src/app/favicon.ico'), icoBuffer);
  console.log('Successfully generated public/favicon.ico and src/app/favicon.ico');
}

createIco();
