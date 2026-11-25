import { describe, expect, it } from '@rstest/core';
import { plugin } from './plugin';

describe('plugin', () => {
  it('should register itself in the recommended config so it can be combined with an explicit registration', () => {
    const recommendedConfig = plugin.configs?.recommended;
    const [config] = Array.isArray(recommendedConfig) ? recommendedConfig : [];
    expect(config?.plugins?.['no-mercy']).toBe(plugin);
  });

  it('should return the same recommended config on every access', () => {
    expect(plugin.configs?.recommended).toBe(plugin.configs?.recommended);
  });
});
