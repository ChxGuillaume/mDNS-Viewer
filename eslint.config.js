import antfu from '@antfu/eslint-config';

export default antfu(
  {
    vue: true,
    typescript: true,
    formatters: true,
    stylistic: {
      indent: 2,
      quotes: 'single',
      semi: true,
    },
    ignores: ['dist/', 'src-tauri/', 'src/auto-imports.d.ts', 'src/components.d.ts'],
  },
  {
    rules: {
      'vue/multi-word-component-names': 'off',
      'no-console': 'off',
      'antfu/no-top-level-await': 'off',
      'node/prefer-global/process': 'off',
    },
  },
);
