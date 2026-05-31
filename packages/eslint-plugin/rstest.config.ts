import { defineConfig } from '@rstest/core';

export default defineConfig({
  include: ['src/**/*.spec.ts'],
  setupFiles: ['./tests/setup.ts']
});
