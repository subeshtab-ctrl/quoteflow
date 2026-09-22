/**
 * Extracts the dominant vibrant brand color from an image File or image URL using an HTML5 Canvas.
 */
export async function extractDominantColor(imageSource: File | string): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve('#4f46e5');
      return;
    }

    const img = new Image();
    img.crossOrigin = 'Anonymous';

    let objectUrl: string | null = null;
    if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else {
      objectUrl = URL.createObjectURL(imageSource);
      img.src = objectUrl;
    }

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve('#4f46e5');
          return;
        }

        // Downscale to 64x64 for speed
        const width = 64;
        const height = 64;
        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(img, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        const colorCounts: Record<string, { count: number; r: number; g: number; b: number; score: number }> = {};

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          // Skip transparent pixels
          if (a < 128) continue;

          // Skip near-white or near-black
          if (r > 240 && g > 240 && b > 240) continue;
          if (r < 25 && g < 25 && b < 25) continue;

          // Check saturation (skip washed out grays)
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const delta = max - min;
          if (delta < 25) continue;

          // Quantize color (reduce to multiples of 16 for grouping)
          const qr = Math.round(r / 16) * 16;
          const qg = Math.round(g / 16) * 16;
          const qb = Math.round(b / 16) * 16;
          const key = `${qr},${qg},${qb}`;

          // Calculate vibrancy score (favor colors with good saturation and medium lightness)
          const lightness = (max + min) / (2 * 255);
          const saturation = lightness <= 0.5 ? delta / (max + min) : delta / (2 * 255 - max - min);
          const vibrancyScore = saturation * 1.5 + (1 - Math.abs(lightness - 0.5));

          if (!colorCounts[key]) {
            colorCounts[key] = { count: 1, r: qr, g: qg, b: qb, score: vibrancyScore };
          } else {
            colorCounts[key].count += 1;
            colorCounts[key].score += vibrancyScore;
          }
        }

        let bestColor = '';
        let highestScore = -1;

        for (const key in colorCounts) {
          const item = colorCounts[key];
          // Combined frequency and vibrancy score
          const totalScore = item.count * item.score;
          if (totalScore > highestScore) {
            highestScore = totalScore;
            const hex = '#' + [item.r, item.g, item.b].map((x) => Math.min(255, Math.max(0, x)).toString(16).padStart(2, '0')).join('');
            bestColor = hex;
          }
        }

        if (objectUrl) URL.revokeObjectURL(objectUrl);
        resolve(bestColor || '#4f46e5');
      } catch (err) {
        console.warn('Color extraction error, using fallback:', err);
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        resolve('#4f46e5');
      }
    };

    img.onerror = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve('#4f46e5');
    };
  });
}
