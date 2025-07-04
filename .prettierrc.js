module.exports = {
  plugins: ["./dist/index.js"],
  overrides: [
    {
      files: [
        "**/Taskfile.yml",
        "**/Taskfile.yaml",
        "**/taskfile.yml",
        "**/taskfile.yaml",
      ],
      options: {
        parser: "taskfile-yaml",
      },
    },
    {
      files: ["examples/**/*.yml", "examples/**/*.yaml"],
      options: {
        parser: "taskfile-yaml",
      },
    },
  ],
};
