export default [
  {
    extends: ['expo', 'prettier'],
    plugins: ['prettier', 'unused-imports'],
    rules: {
      'prettier/prettier': 'error',
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
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': [
        'warn',
        {
          enableDangerousAutofixThisMayCauseInfiniteLoops: true,
        },
      ],
    },
  },
]
