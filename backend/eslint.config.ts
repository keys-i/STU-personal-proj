import { defineConfig } from 'eslint/config';
import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { fileURLToPath } from 'node:url';
import prettierRecommended from 'eslint-plugin-prettier/recommended';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig([
  // Ignore build artifacts
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },

  // Base JS recommended
  eslint.configs.recommended,

  // Type-aware TS lint ONLY for .ts source files (not this config)
  ...tseslint.configs.recommendedTypeChecked.map((cfg) => ({
    ...cfg,
    files: [
      'src/**/*.ts',
      'test/**/*.ts',
      'prisma/**/*.ts',
      'prisma.config.ts',
      'eslint.config.ts',
    ],
  })),

  // TS project settings only for TS source files
  {
    files: [
      'src/**/*.ts',
      'test/**/*.ts',
      'prisma/**/*.ts',
      'prisma.config.ts',
      'eslint.config.ts',
    ],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },

  // Prettier integration
  prettierRecommended,
]);
