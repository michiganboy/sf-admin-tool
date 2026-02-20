import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  // Context/hook files and module entry points export both component and non-component; allow for clarity.
  {
    files: [
      'src/contexts/ColorModeContext.tsx',
      'src/contexts/ToastContext.tsx',
      'src/modules/connected-apps/module.tsx',
      'src/modules/permissions/module.tsx',
    ],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
])
