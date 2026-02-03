import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginPrettier from 'eslint-plugin-prettier/recommended';

/** @type {import('eslint').Linter.Config[]} */
export default [
  // 1. global ignores (replaces .eslintignore)
  { ignores: ['dist', 'node_modules', '.env', 'package-lock.json'] },

  // 2. Base configuration for all files
  {
    files: ['**/*.{js,mjs,cjs,ts}'],
    languageOptions: { globals: globals.node },
  },

  // 3. Load Recommended Configs
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  pluginPrettier, // Connects Prettier to ESLint

  // 4. Custom Rules
  {
    rules: {
      'no-unused-vars': 'off', // Turn off standard JS rule to avoid conflict
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },
];
