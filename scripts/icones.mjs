import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const pub = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const svg = (t) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${t}" height="${t}" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#0f6e56"/>
  <rect x="128" y="104" width="256" height="304" rx="16" fill="#faf9f7"/>
  <path d="M168 176h176M168 232h176M168 288h120" stroke="#9cc2de" stroke-width="10" stroke-linecap="round"/>
  <path d="M300 360 L392 196" stroke="#f97316" stroke-width="28" stroke-linecap="round"/>
</svg>`);

for (const [nom, t] of [['icone-192.png', 192], ['icone-512.png', 512], ['apple-touch-icon.png', 180]]) {
  await sharp(svg(t)).png().toFile(join(pub, nom));
  console.log('écrit', nom);
}
