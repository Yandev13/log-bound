// @ts-check
const fs = require("fs");
const path = require("path");
const tseslint = require("typescript-eslint");
const angular = require("angular-eslint");

// QR-MA-01 (frontend rule 6): a feature folder must not import a different feature folder.
// One override for each folder in src/app/features. A new feature folder gets the rule automatically.
const featuresDir = path.join(__dirname, "src", "app", "features");
const features = fs.existsSync(featuresDir)
  ? fs.readdirSync(featuresDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
  : [];
const featureBoundaries = features.map((feature) => ({
  files: [`src/app/features/${feature}/**/*.ts`],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: features
          .filter((other) => other !== feature)
          .map((other) => ({
            group: [`**/features/${other}`, `**/features/${other}/**`, `../${other}`, `../${other}/**`],
            message: "Do not import a different feature folder. Use core/, data/, or shared/ (QR-MA-01).",
          })),
      },
    ],
  },
}));

module.exports = tseslint.config(
  {
    files: ["**/*.ts"],
    ignores: ["projects/**/*"],
    extends: [...angular.configs.tsRecommended],
    processor: angular.processInlineTemplates,
    rules: {
      "@angular-eslint/component-class-suffix": [
        "error",
        { suffixes: ["Page", "Component"] },
      ],
      "@angular-eslint/component-selector": [
        "error",
        { type: "element", prefix: "app", style: "kebab-case" },
      ],
      "@angular-eslint/directive-selector": [
        "error",
        { type: "attribute", prefix: "app", style: "camelCase" },
      ],
      // QR-MA-04: cyclomatic complexity 10 or less for each function.
      complexity: ["error", 10],
    },
  },
  ...featureBoundaries,
  {
    files: ["**/*.html"],
    extends: [...angular.configs.templateRecommended],
    rules: {},
  }
);
