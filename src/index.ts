import { plugin } from "./plugin";

// Import functions for CommonJS compatibility
import {
  sortTaskfileKeys,
  uppercaseVariableNames,
  kebabCaseTaskNames,
  removeTemplateWhitespace,
  processCommands,
  formatTaskfile,
} from "./formatters";

import { getYamlOptions, addEmptyLines } from "./utils";

// Re-export all functions for ES modules
export {
  sortTaskfileKeys,
  uppercaseVariableNames,
  kebabCaseTaskNames,
  removeTemplateWhitespace,
  processCommands,
  formatTaskfile,
  getYamlOptions,
  addEmptyLines,
};

export default plugin;

// CommonJS compatibility - add individual functions to module.exports
module.exports = plugin;
module.exports.default = plugin;
module.exports.sortTaskfileKeys = sortTaskfileKeys;
module.exports.uppercaseVariableNames = uppercaseVariableNames;
module.exports.kebabCaseTaskNames = kebabCaseTaskNames;
module.exports.removeTemplateWhitespace = removeTemplateWhitespace;
module.exports.processCommands = processCommands;
module.exports.formatTaskfile = formatTaskfile;
module.exports.getYamlOptions = getYamlOptions;
module.exports.addEmptyLines = addEmptyLines;
