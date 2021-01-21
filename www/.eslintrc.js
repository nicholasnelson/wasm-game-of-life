module.exports = {
  env: {
    browser: true,
    es2021: true,
    jquery: true,
  },
  globals: {
    THREE: 'readonly',
    d3: 'readonly',
  },
  extends: [
    'airbnb-base',
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  rules: {
    'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],
  },
};
