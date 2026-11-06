import type { jsPDF } from 'jspdf';
import autoTableModule from 'jspdf-autotable';
import { parseLogoUrl } from '@/lib/utils/logo';

declare const __non_webpack_require__: any;

let robotoRegularBase64: string | null = null;
let robotoBoldBase64: string | null = null;

/**
 * Universal CJS/ESM/Rolldown interop wrapper for jspdf-autotable.
 * Fixes "(0 , ne.default) is not a function" in Cloudflare Workers / Vite SSR / browser bundles.
 */
export function runAutoTable(doc: jsPDF, options: any): void {
  const mod: any = autoTableModule;
  const fn =
    typeof mod === 'function'
      ? mod
      : typeof mod?.default === 'function'
        ? mod.default
        : typeof mod?.default?.default === 'function'
          ? mod.default.default
          : typeof (doc as any)?.autoTable === 'function'
            ? (d: any, opts: any) => d.autoTable(opts)
            : null;

  if (!fn) {
    throw new Error('jspdf-autotable plugin function could not be resolved');
  }
  fn(doc, options);
}

function loadFontBase64(filename: string): string | null {
  if (typeof window !== 'undefined') return null;
  try {
    // Safe dynamic load only in Node.js server environment (avoid bundling fs/path in client)
    const req = typeof __non_webpack_require__ !== 'undefined' ? __non_webpack_require__ : null;
    if (!req) return null;
    const nodeFs = req('fs');
    const nodePath = req('path');
    const fontPath = nodePath.join(process.cwd(), 'lib', 'fonts', filename);
    if (nodeFs.existsSync(fontPath)) {
      return nodeFs.readFileSync(fontPath).toString('base64');
    }
    const pubPath = nodePath.join(process.cwd(), 'public', 'fonts', filename);
    if (nodeFs.existsSync(pubPath)) {
      return nodeFs.readFileSync(pubPath).toString('base64');
    }
  } catch {
    // Ignore fs errors on edge runtimes or client
  }
  return null;
}

async function fetchFontBase64FromEdge(filename: string): Promise<string | null> {
  // Only fetch font over HTTP when running in the client browser.
  // On Cloudflare Workers edge, making self-requests to blendandbold.com causes recursion and 10ms CPU timeouts (Error 1102).
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch(`/fonts/${filename}`);
    if (res.ok) {
      const ab = await res.arrayBuffer();
      const bytes = new Uint8Array(ab);
      let binary = '';
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return window.btoa(binary);
    }
  } catch {
    // Ignore fetch errors
  }
  return null;
}

export async function ensurePdfFontsLoaded(): Promise<void> {
  if (!robotoRegularBase64) {
    robotoRegularBase64 =
      loadFontBase64('Roboto-Regular.ttf') || (await fetchFontBase64FromEdge('Roboto-Regular.ttf'));
  }
  if (!robotoBoldBase64) {
    robotoBoldBase64 =
      loadFontBase64('Roboto-Bold.ttf') || (await fetchFontBase64FromEdge('Roboto-Bold.ttf'));
  }
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
 * Compatible with Client Browsers, Node.js, and Cloudflare Workers.
 */
export async function loadPdfLogoImage(
  logoUrl: string | null | undefined
): Promise<{ base64: string; isCircle: boolean } | null> {
  if (!logoUrl) return null;
  try {
    const logoConfig = parseLogoUrl(logoUrl);
    const rawPath = logoConfig.cleanUrl || logoUrl.split(/[?#]/)[0];

    // Client Browser: Instant HTML5 Canvas processing (0ms Server CPU)
    if (typeof window !== 'undefined') {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const dim = Math.min(img.naturalWidth || 256, img.naturalHeight || 256, 400);
            canvas.width = dim;
            canvas.height = dim;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve({ base64: img.src, isCircle: false });
              return;
            }

            if (logoConfig.shape === 'circle') {
              ctx.beginPath();
              ctx.arc(dim / 2, dim / 2, dim / 2, 0, Math.PI * 2);
              ctx.closePath();
              ctx.clip();
            }

            ctx.drawImage(img, 0, 0, dim, dim);
            const dataUrl = canvas.toDataURL('image/png');
            resolve({ base64: dataUrl, isCircle: logoConfig.shape === 'circle' });
          } catch {
            resolve(rawPath.startsWith('data:') ? { base64: rawPath, isCircle: false } : null);
          }
        };
        img.onerror = () => {
          resolve(rawPath.startsWith('data:') ? { base64: rawPath, isCircle: false } : null);
        };
        img.src = rawPath;
      });
    }

    // Server Environment (Node.js or Cloudflare Workers)
    let buffer: Buffer | null = null;

    if (rawPath.startsWith('data:image/')) {
      const base64Data = rawPath.split(',')[1];
      if (base64Data) {
        buffer = Buffer.from(base64Data, 'base64');
      }
    } else if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) {
      const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://blendandbold.com').replace(/\/$/, '');
      // Avoid self-requests on edge to prevent recursive CPU consumption
      if (!rawPath.startsWith(baseUrl)) {
        const res = await fetch(rawPath);
        if (res.ok) {
          buffer = Buffer.from(await res.arrayBuffer());
        }
      }
    } else {
      try {
        const req = typeof __non_webpack_require__ !== 'undefined' ? __non_webpack_require__ : null;
        if (req) {
          const nodeFs = req('fs');
          const nodePath = req('path');
          const cleanUrl = rawPath.startsWith('/') ? rawPath.substring(1) : rawPath;
          const localPath = nodePath.join(process.cwd(), 'public', cleanUrl);
          if (nodeFs.existsSync(localPath)) {
            buffer = nodeFs.readFileSync(localPath);
          }
        }
      } catch {
        // Ignore on edge
      }
    }

    if (buffer) {
      try {
        let sharp: any = null;
        try {
          if (typeof window === 'undefined') {
            const req = typeof __non_webpack_require__ !== 'undefined' ? __non_webpack_require__ : undefined;
            if (req) {
              sharp = req('sharp');
            }
          }
        } catch {
          sharp = null;
        }

        if (sharp) {
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
        }

        // Fallback without sharp (Cloudflare Workers / Edge / Browser)
        const ext = rawPath.toLowerCase().endsWith('.png') ? 'png' : 'jpeg';
        return {
          base64: `data:image/${ext};base64,${buffer.toString('base64')}`,
          isCircle: false,
        };
      } catch {
        // Fallback without sharp (Cloudflare Workers / Edge)
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
