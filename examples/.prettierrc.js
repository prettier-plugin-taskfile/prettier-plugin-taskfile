/**
 * @see https://prettier.io/docs/configuration
 * @type {import("prettier").Config}
 */
const config = {
  plugins: ["../dist/index.js"],
  overrides: [
    {
      files: "./*.yml",
      options: {
        parser: "taskfile-yaml",
      },
    },
  ],
};

module.exports = config;
