import { ESSENTIAL_CONFIG } from '@no-mercy/configs/eslint';

export default ESSENTIAL_CONFIG.map((config) => {
  if (config.languageOptions?.parserOptions?.projectService) {
    return {
      ...config,
      languageOptions: {
        ...config.languageOptions,
        parserOptions: {
          ...config.languageOptions.parserOptions,
          tsconfigRootDir: import.meta.dirname
        }
      }
    };
  }
  return config;
});
