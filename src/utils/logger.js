const ora = require("ora-classic");
const util = require("util");

/**
 * Create a logger instance for a specific component
 * @param {string} component - Component name for prefixing logs
 * @returns {Object} Logger object with log methods
 */
function createLogger(component) {
  let spinner = null;
  const prefix = util.styleText("blue", `[${component}]`);

  // Helper functions
  const format = (message) => `${prefix} ${message}`;

  const handleSpinner = (action, message = null) => {
    if (!spinner) return false;

    if (action === "stop") {
      spinner.stop();
      return true;
    } else if (action === "clear") {
      spinner.stop();
      spinner = null;
      return false;
    } else if (action === "succeed") {
      spinner.succeed(message);
      spinner = null;
    } else if (action === "fail") {
      spinner.fail(message);
      spinner = null;
    }
  };

  // Logger object
  return {
    info: (message) => {
      if (!global.verbose && spinner) return;

      handleSpinner("clear");
      if (spinner) console.log();
      spinner = ora(format(message)).start();
    },

    success: (message) => {
      const formattedMsg = format(message);

      if (spinner) {
        handleSpinner("succeed", formattedMsg);
      } else {
        console.log(`${util.styleText("green", "✓")} ${formattedMsg}`);
      }
    },

    error: (message, error = null) => {
      const formattedMsg = format(message);

      if (spinner) {
        handleSpinner("fail", formattedMsg);
      } else {
        console.error(`${util.styleText("red", "✗")} ${formattedMsg}`);
      }

      if (global.verbose && error) {
        console.error(util.styleText("red", error.stack || error));
      }
    },

    warn: (message) => {
      const wasActive = handleSpinner("stop");
      console.warn(`${util.styleText("yellow", "⚠")} ${format(message)}`);
      if (wasActive) spinner.start();
    },

    debug: (message) => {
      if (!global.verbose) return;

      const wasActive = handleSpinner("stop");
      console.debug(
        `${util.styleText("gray", "•")} ${prefix} ${util.styleText("gray", message)}`,
      );
      if (wasActive) spinner.start();
    },

    stopSpinner: () => handleSpinner("clear"),
  };
}

module.exports = { createLogger };
