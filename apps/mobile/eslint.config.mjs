import config from '@noexcuse/config/eslint';

// CommonJS tool configs (metro, jest) are loaded by their tools, not bundled as app code.
export default [{ ignores: ['.expo/**', 'web-build/**', 'metro.config.js', 'jest.config.js'] }, ...config];
