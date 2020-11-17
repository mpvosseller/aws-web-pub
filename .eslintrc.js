module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module',
    project: './tsconfig.json',
  },
  env: {
    node: true,
  },
  rules: {
    // shared JavaScript / TypeScript rules
    'dot-notation': 'error',
  },
  overrides: [
    {
      // JavaScript only config
      files: ['*.js'],
      extends: [
        'eslint:recommended', // recommended javascript rules from eslint
        'plugin:prettier/recommended', // disable eslint's formatting rules with prettier's formatting rules. must be last.
      ],
      rules: {
      },
    },
    {
      // TypeScript only config
      files: ['*.ts'],
      extends: [
        'eslint:recommended', // recommended javascript rules from eslint
        'plugin:@typescript-eslint/recommended', // recommended typescript rules from @typescript-eslint/eslint-plugin
        'prettier/@typescript-eslint', // disable formatting rules of @typescript-eslint/eslint-plugin
        'plugin:prettier/recommended', // disable eslint's formatting rules with prettier's formatting rules. must be last.
      ],
      rules: {
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/no-implicit-any-catch': 'error',
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/ban-types': [
          'error',
          {
            types: {
              object: false,
            },
            extendDefaults: true,
          },
        ],
      },
    },
  ],
}
