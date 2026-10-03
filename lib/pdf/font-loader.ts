import type { jsPDF } from 'jspdf';
import * as fs from 'fs';
import * as path from 'path';
import { parseLogoUrl } from '@/lib/utils/logo';

let robotoRegularBase64: string | null = null;
let robotoBoldBase64: string | null = null;

function loadFontBase64(filename: string): string | null {
  try {
    const fontPath = path.join(process.cwd(), 'lib', 'fonts', filename);
    if (fs.existsSync(fontPath)) {
      return fs.readFileSync(fontPath).toString('base64');
    }
  } catch (err) {
    console.warn(`[font-loader] Could not load ${filename}:`, err);
  }
  return null;
}

/**
 * Registers Roboto Regular and Bold TrueType fonts in jsPDF to ensure
 * native Unicode rendering (such as the Indian Rupee symbol ₹) without
 * WinAnsi character corruption or missing glyph artifacts.
 */
export function registerPdfFonts(doc: jsPDF): boolean {
  try {
    if (!robotoRegularBase64) {
      robotoRegularBase64 = loadFontBase64('Roboto-Regular.ttf');
    }
    if (!robotoBoldBase64) {
      robotoBoldBase64 = loadFontBase64('Roboto-Bold.ttf');
    }

    if (!robotoRegularBase64 || !robotoBoldBase64) {
      return false;
    }

    // Add to jsPDF Virtual File System
    doc.addFileToVFS('Roboto-Regular.ttf', robotoRegularBase64);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'italic');

    doc.addFileToVFS('Roboto-Bold.ttf', robotoBoldBase64);
    doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
    doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bolditalic');

    // Default to Roboto
    doc.setFont('Roboto', 'normal');
    return true;
  } catch (err) {
    console.warn('[font-loader] Error registering Roboto fonts in jsPDF:', err);
    return false;
  }
}

/**
 * Loads a logo image from URL, data URI, or local file and masks it
 * into a circular Instagram-style badge if shape is circle (or default).
 */
export async function loadPdfLogoImage(
  logoUrl: string | null | undefined
): Promise<{ base64: string; isCircle: boolean } | null> {
  if (!logoUrl) return null;
  try {
    const logoConfig = parseLogoUrl(logoUrl);
    const rawPath = logoConfig.cleanUrl || logoUrl.split(/[?#]/)[0];
    let buffer: Buffer | null = null;

    if (rawPath.startsWith('data:image/')) {
      const base64Data = rawPath.split(',')[1];
      if (base64Data) {
        buffer = Buffer.from(base64Data, 'base64');
      }
    } else if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) {
      const res = await fetch(rawPath);
      if (res.ok) {
        buffer = Buffer.from(await res.arrayBuffer());
      }
    } else {
      const cleanUrl = rawPath.startsWith('/') ? rawPath.substring(1) : rawPath;
      const localPath = path.join(process.cwd(), 'public', cleanUrl);
      if (fs.existsSync(localPath)) {
        buffer = fs.readFileSync(localPath);
      }
    }

    if (buffer) {
      try {
        const sharp = (await import('sharp')).default;
        const meta = await sharp(buffer).metadata();
        const dim = Math.min(meta.width || 256, meta.height || 256, 400);

        if (logoConfig.shape === 'circle') {
          const circleMaskSvg = Buffer.from(
            `<svg width="${dim}" height="${dim}"><circle cx="${dim / 2}" cy="${dim / 2}" r="${dim / 2}" fill="#fff" /></svg>`
          );
          const pngBuf = await sharp(buffer)
            .resize(dim, dim, { fit: 'cover' })
            .composite([{ input: circleMaskSvg, blend: 'dest-in' }])
            .png()
            .toBuffer();
          return {
            base64: `data:image/png;base64,${pngBuf.toString('base64')}`,
            isCircle: true,
          };
        } else {
          const pngBuf = await sharp(buffer).png().toBuffer();
          return {
            base64: `data:image/png;base64,${pngBuf.toString('base64')}`,
            isCircle: false,
          };
        }
      } catch (convErr) {
        const ext = rawPath.toLowerCase().endsWith('.png') ? 'png' : 'jpeg';
        return {
          base64: `data:image/${ext};base64,${buffer.toString('base64')}`,
          isCircle: false,
        };
      }
    }
  } catch (err) {
    console.warn('[font-loader] Could not load logo image for PDF:', err);
  }
  return null;
}
