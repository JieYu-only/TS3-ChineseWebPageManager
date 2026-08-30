module.exports = {
  env: {
    node: true,
    browser: true,
  },
  extends: [
    'plugin:vue/base'
  ],
  rules: {
    // Server-query and service-worker error paths use console.error. Allow the
    // error level only so accidental debug logging (log/info/warn) is caught.
    'no-console': ['error', { allow: ['error'] }],
  },
  parser: "vue-eslint-parser",
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module"
  }
};
