import { defineConfig } from 'eslint/config';
import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { fileURLToPath } from 'node:url';
import prettierRecommended from 'eslint-plugin-prettier/recommended';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig([
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**'] },

  eslint.configs.recommended,

  ...tseslint.configs.recommendedTypeChecked.map((cfg) => ({
    ...cfg,
    files: ['src/**/*.ts', 'test/**/*.ts', 'prisma/**/*.ts', '*.ts'],
  })),

  {
    files: ['src/**/*.ts', 'test/**/*.ts', 'prisma/**/*.ts', '*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      globals: { ...globals.node, ...globals.jest },
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },

  prettierRecommended,
]);
