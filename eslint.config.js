import antfu from '@antfu/eslint-config';
import tailwind from 'eslint-plugin-tailwindcss';

export default antfu(
  {
    vue: true,
    typescript: true,
    formatters: true,
    // Airbnb doesn't have a direct flat config, but antfu is very close
    // and highly recommended for Vue/TS.
    // If we MUST have Airbnb, we'd need to manually fix all the deprecated rules.
    stylistic: {
      indent: 2,
      quotes: 'single',
      semi: true,
    },
    imports: true,
    ignores: ['dist/', 'node_modules/', 'artifacts/', 'build/', 'index.html'],
  },
  ...tailwind.configs['flat/recommended'],
  {
    rules: {
      'vue/multi-word-component-names': 'off',
      'no-console': 'off',
      'import/prefer-default-export': 'off',
      'antfu/no-top-level-await': 'off',
      'node/prefer-global/process': 'off',
      'ts/no-empty-object-type': 'off',
      'no-new': 'off',
      'ts/ban-ts-comment': 'off',
      'tailwindcss/no-custom-classname': 'off',
    },
  },
);
