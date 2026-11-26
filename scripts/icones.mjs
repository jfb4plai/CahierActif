import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Tablette en paysage : cadre sombre, écran clair avec trois lignes de cahier et un crayon orange, sur fond vert PLAI.
// `rx` : coins arrondis du fond. L'icône Apple est en carré plein (iOS applique lui-même son arrondi).
const pub = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const svg = (t, rx) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${t}" height="${t}" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${rx}" fill="#0f6e56"/>
  <rect x="86" y="121" width="340" height="270" rx="34" fill="#1e293b"/>
  <rect x="110" y="145" width="292" height="222" rx="14" fill="#faf9f7"/>
  <circle cx="98" cy="256" r="4" fill="#475569"/>
  <path d="M134 189h244M134 233h244M134 277h244M134 321h122" stroke="#9fc2de" stroke-width="12" stroke-linecap="round"/>
  <path d="M360 190 L292 320" stroke="#f97316" stroke-width="18" stroke-linecap="round"/>
</svg>`);

for (const [nom, t, rx] of [['icone-192.png', 192, 97], ['icone-512.png', 512, 97], ['apple-touch-icon.png', 180, 0]]) {
  await sharp(svg(t, rx)).png().toFile(join(pub, nom));
  console.log('écrit', nom);
}
