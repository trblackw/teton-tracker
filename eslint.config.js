import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import unusedImports from 'eslint-plugin-unused-imports';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    ignores: ['public/**/*.js'], // Ignore service worker files for this config
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        // Node.js/Bun globals
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        Bun: 'readonly',
        performance: 'readonly',
        // Browser globals
        document: 'readonly',
        window: 'readonly',
        navigator: 'readonly',
        // Web APIs
        Response: 'readonly',
        Request: 'readonly',
        fetch: 'readonly',
        crypto: 'readonly',
        self: 'readonly',
        caches: 'readonly',
        clients: 'readonly',
        registration: 'readonly',
        skipWaiting: 'readonly',
        ExtendableEvent: 'readonly',
        FetchEvent: 'readonly',
        InstallEvent: 'readonly',
        URL: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      react,
      'react-hooks': reactHooks,
      'unused-imports': unusedImports,
    },
    rules: {
      // Remove unused imports
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
      // TypeScript rules
      '@typescript-eslint/no-unused-vars': 'off', // Handled by unused-imports
      // React rules
      'react/react-in-jsx-scope': 'off', // Not needed in React 17+
      'react/prop-types': 'off', // Using TypeScript
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  // Special rule for polling service - TypeScript interface parameters
  {
    files: ['src/lib/services/polling-service.ts'],
    rules: {
      'unused-imports/no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': 'off',
    },
  },
  // Specific configuration for service worker files
  {
    files: ['public/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script', // Service workers don't use modules
      globals: {
        // Service Worker globals
        self: 'readonly',
        caches: 'readonly',
        clients: 'readonly',
        registration: 'readonly',
        skipWaiting: 'readonly',
        // Web APIs available in service workers
        console: 'readonly',
        fetch: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        URL: 'readonly',
        URLPattern: 'readonly',
        Headers: 'readonly',
        // Events
        ExtendableEvent: 'readonly',
        FetchEvent: 'readonly',
        InstallEvent: 'readonly',
        ActivateEvent: 'readonly',
        // Timers
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        // Other globals
        importScripts: 'readonly',
        performance: 'readonly',
        crypto: 'readonly',
      },
    },
    rules: {
      // Relax some rules for service workers
      'no-unused-vars': ['warn', { 
        vars: 'all', 
        args: 'after-used',
        varsIgnorePattern: '^_',
        argsIgnorePattern: '^_'
      }],
      'no-console': 'off', // Allow console logs in service workers for debugging
    },
  },
  {
    ignores: ['dist/', 'build/', 'node_modules/', '*.min.js'],
  },
];
