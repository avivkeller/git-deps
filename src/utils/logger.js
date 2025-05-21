const ora = require("ora-classic");
const chalk = require("chalk");

/**
 * Create a logger instance for a specific component
 * @param {string} component - Component name for prefixing logs
 * @returns {Object} Logger object with various log methods
 */
function createLogger(component) {
  let spinner = null;

  return {
    info: (message) => {
      if (global.verbose || !spinner) {
        if (spinner) spinner.stop();
        spinner = ora(`${chalk.blue(`[${component}]`)} ${message}`).start();
      }
    },

    success: (message) => {
      if (spinner) {
        spinner.succeed(`${chalk.blue(`[${component}]`)} ${message}`);
        spinner = null;
      } else {
        console.log(
          `${chalk.green("✓")} ${chalk.blue(`[${component}]`)} ${message}`,
        );
      }
    },

    error: (message, error = null) => {
      if (spinner) {
        spinner.fail(`${chalk.blue(`[${component}]`)} ${message}`);
        spinner = null;
      } else {
        console.error(
          `${chalk.red("✗")} ${chalk.blue(`[${component}]`)} ${message}`,
        );
      }

      // Log detailed error if verbose mode is enabled
      if (global.verbose && error) {
        console.error(chalk.red(error.stack || error));
      }
    },

    warn: (message) => {
      if (spinner) spinner.stop();
      console.warn(
        `${chalk.yellow("⚠")} ${chalk.blue(`[${component}]`)} ${message}`,
      );
      if (spinner) spinner.start();
    },

    debug: (message) => {
      if (global.verbose) {
        if (spinner) spinner.stop();
        console.debug(
          `${chalk.gray("•")} ${chalk.blue(`[${component}]`)} ${chalk.gray(message)}`,
        );
        if (spinner) spinner.start();
      }
    },

    stopSpinner: () => {
      if (spinner) {
        spinner.stop();
        spinner = null;
      }
    },
  };
}

module.exports = { createLogger };
