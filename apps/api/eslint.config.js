import config from '@noexcuse/config/eslint';

export default [
  { ignores: ['src/generated/**'] },
  ...config,
  {
    // Nest modules and the Clock module are decorated classes whose body is intentionally empty or static-only.
    rules: {
      '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
    },
  },
];
