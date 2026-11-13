// Render ulang ikon karung (mis. setelah foto baru ditaruh di src/assets/sacks dan didaftarkan di src/lib/sack3d.js):
//   cd matprep-app && npx vite tools/sack-icons --config tools/sack-icons/vite.config.js
// lalu buka http://localhost:5198 — ikon tersimpan otomatis ke src/assets/material-icons/.
import { defineConfig } from 'vite';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Buffer } from 'node:buffer';

const outDir = fileURLToPath(new URL('../../src/assets/material-icons/', import.meta.url));

export default defineConfig({
  plugins: [{
    name: 'save-icon',
    configureServer(server) {
      server.middlewares.use('/save', (req, res) => {
        const name = new URL(req.url, 'http://x').searchParams.get('name') ?? '';
        if (req.method !== 'POST' || !/^[a-z0-9-]+$/.test(name)) { res.statusCode = 400; return res.end(); }
        const chunks = [];
        req.on('data', c => chunks.push(c));
        req.on('end', () => {
          try {
            mkdirSync(outDir, { recursive: true });
            writeFileSync(`${outDir}${name}.webp`, Buffer.concat(chunks));
            res.end('ok');
          } catch (e) { // mis. file dikunci Windows saat halaman reload — laporkan, jangan matikan server
            res.statusCode = 500; res.end(String(e.code ?? e));
          }
        });
      });
    },
  }],
  server: { port: 5198, strictPort: true },
});
