import { defineConfig } from '@rslib/core';

export default defineConfig({
  source: {
    entry: { index: './src/index.ts' },
    tsconfigPath: './tsconfig.lib.json'
  },
  lib: [
    {
      format: 'esm',
      syntax: 'esnext',
      dts: true
    }
  ],
  output: { distPath: { root: './dist' }, target: 'node' }
});
