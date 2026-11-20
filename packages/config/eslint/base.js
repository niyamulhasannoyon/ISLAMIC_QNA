module.exports = {
  env: {
    node: true,
    es2022: true,
  },
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
};
