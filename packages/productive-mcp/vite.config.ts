import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      external: [
        '@modelcontextprotocol/sdk',
        '@studiometa/productive-cli',
        /^node:/,
      ],
    },
    target: 'node24',
    minify: false,
    sourcemap: true,
    outDir: 'dist',
  },
});
