import { copyFileSync, existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const buildDir = join(process.cwd(), 'public', 'build');
const publicDir = join(process.cwd(), 'public');
const swSource = join(buildDir, 'sw.js');

if (!existsSync(swSource)) {
    console.warn('[publish-sw] No public/build/sw.js found — skipping.');
    process.exit(0);
}

// Precache entries are relative to the SW location. After moving the SW to
// public/sw.js they must be absolute under /build/ or they 404.
// Workbox minify emits `{url:"assets/..."}` (unquoted keys).
let sw = readFileSync(swSource, 'utf8');
sw = sw.replaceAll('url:"assets/', 'url:"/build/assets/');
sw = sw.replaceAll('url:"fonts-manifest.json"', 'url:"/build/fonts-manifest.json"');
sw = sw.replaceAll('url:"manifest.json"', 'url:"/build/manifest.json"');
writeFileSync(join(publicDir, 'sw.js'), sw);

for (const file of readdirSync(buildDir)) {
    if (file.startsWith('workbox-') && file.endsWith('.js')) {
        copyFileSync(join(buildDir, file), join(publicDir, file));
    }
}

console.log('[publish-sw] Published /sw.js with /build/ precache URLs');
