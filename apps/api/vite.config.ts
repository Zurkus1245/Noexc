import { defineConfig } from 'vite';
import swc from 'unplugin-swc';

// Vite (not tsc) builds the server: SWC emits decorator metadata that Nest DI needs, and the
// workspace packages (TypeScript source with .js specifiers) are bundled into one ESM file.
export default defineConfig({
  plugins: [swc.vite()],
  build: {
    ssr: 'src/main.ts',
    outDir: 'dist',
    target: 'node24',
    minify: false,
    sourcemap: true,
    rollupOptions: { output: { entryFileNames: 'main.js' } },
  },
});
