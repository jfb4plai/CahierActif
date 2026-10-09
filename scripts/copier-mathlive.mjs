import { cpSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// MathLive charge ses polices depuis une URL : on les sert nous-mêmes (hors ligne, aucun appel à un CDN).
const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(racine, 'node_modules', 'mathlive', 'fonts');
const cible = join(racine, 'public', 'mathlive', 'fonts');

if (!existsSync(source)) {
  console.error('node_modules/mathlive/fonts introuvable : lancer npm install');
  process.exit(1);
}
cpSync(source, cible, { recursive: true });
console.log('polices MathLive copiées dans public/mathlive/fonts');
