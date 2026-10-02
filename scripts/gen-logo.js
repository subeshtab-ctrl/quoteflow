const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="qfGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4f46e5"/>
      <stop offset="50%" stop-color="#6366f1"/>
      <stop offset="100%" stop-color="#9333ea"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#qfGrad)"/>
  <rect x="8" y="8" width="496" height="496" rx="104" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="12"/>
  <text x="256" y="275" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="290" fill="#ffffff" text-anchor="middle" dominant-baseline="central">Q</text>
  <circle cx="380" cy="375" r="26" fill="#c084fc" stroke="#ffffff" stroke-width="6"/>
</svg>`;

const pubDir = path.join(process.cwd(), 'public');
fs.writeFileSync(path.join(pubDir, 'quoteflow-logo.svg'), svg);

sharp(Buffer.from(svg))
  .resize(512, 512)
  .png()
  .toFile(path.join(pubDir, 'quoteflow-logo.png'))
  .then(() => {
    console.log('Successfully generated public/quoteflow-logo.png and svg');
    // Also copy to public/logo.png
    fs.copyFileSync(path.join(pubDir, 'quoteflow-logo.png'), path.join(pubDir, 'logo.png'));
    console.log('Copied to public/logo.png');
  })
  .catch(console.error);
