import { build } from 'esbuild';
import { cpSync, rmSync } from 'node:fs';

const OUT_DIR = 'dist';

rmSync(OUT_DIR, { recursive: true, force: true });
cpSync('static', OUT_DIR, { recursive: true });

await build({
  entryPoints: {
    content: 'src/content/main.ts',
    popup: 'src/popup/main.ts',
    options: 'src/options/main.ts',
  },
  outdir: OUT_DIR,
  bundle: true,
  format: 'iife',
  target: 'chrome120',
  logLevel: 'info',
});
