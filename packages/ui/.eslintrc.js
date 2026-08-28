module.exports = {
  extends: [
    'plugin:vue/base'
  ],
  rules: {
      'no-console': 'off',
  },
  parser: "vue-eslint-parser",
  parserOptions: {
    parser: "@babel/eslint-parser",
    ecmaVersion: 2020,
    requireConfigFile: false,
    sourceType: "module"
  }
};
