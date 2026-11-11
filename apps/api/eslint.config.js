import { nestConfig } from '../../tooling/eslint/nest.js';

export default [
  ...nestConfig({ tsconfigRootDir: import.meta.dirname }),
  {
    files: ['src/modules/*/cli/**/*.ts', 'prisma/seed.ts', 'prisma/scripts/**/*.mjs'],
    rules: { 'no-console': 'off' },
  },
];
