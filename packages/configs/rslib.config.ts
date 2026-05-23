import { defineConfig } from '@rslib/core';

export default defineConfig({
  lib: [
    {
      bundle: false,
      format: 'esm',
      syntax: 'esnext',
      dts: { build: true, abortOnError: true },
      source: {
        entry: { eslint: './src/eslint.ts', prettier: './src/prettier.ts' },
        tsconfigPath: './tsconfig.lib.json'
      },
      output: {
        distPath: { root: './' },
        cleanDistPath: false
      }
    }
  ],
  output: {
    target: 'node',
    legalComments: 'none',
    minify: true
  },
  tools: {
    rspack: {
      optimization: {
        runtimeChunk: false,
        moduleIds: 'deterministic'
      }
    }
  }
});
