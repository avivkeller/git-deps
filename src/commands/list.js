const fs = require("fs-extra");
const path = require("path");
const { getGitDependencies } = require("../utils/package-manager");
const { parseGitUrl } = require("../utils/git");
const { createLogger } = require("../utils/logger");
const util = require("util");

const logger = createLogger("list");

/**
 * List all git dependencies
 * @param {Object} options - Command options
 */
async function list(options = {}) {
  try {
    const gitDependencies = await getGitDependencies();

    if (!gitDependencies || Object.keys(gitDependencies).length === 0) {
      logger.warn("No git dependencies found in package.json");
      return;
    }

    logger.stopSpinner();
    console.log(util.styleText("bold", "\nGit Dependencies:"));
    console.log(util.styleText("bold", "----------------"));

    // Process each dependency
    for (const [name, gitUrl] of Object.entries(gitDependencies)) {
      const { url, ref, path: subPath } = parseGitUrl(gitUrl);

      console.log(util.styleText("green", `${name}:`));
      console.log(`  Repository: ${util.styleText("blue", url)}`);
      console.log(`  Reference: ${util.styleText("yellow", ref)}`);
      console.log(`  Path: ${subPath}`);

      // Show additional details if requested
      if (options.detail) {
        await showDependencyDetails(name);
      }

      console.log("");
    }
  } catch (error) {
    logger.error(`Failed to list dependencies: ${error.message}`, error);
  }
}

/**
 * Show detailed information about an installed dependency
 * @param {string} name - Package name
 */
async function showDependencyDetails(name) {
  try {
    // Determine package directory
    const nodeModulesDir = path.join(process.cwd(), "node_modules");
    const packageDir = name.startsWith("@")
      ? path.join(nodeModulesDir, ...name.split("/"))
      : path.join(nodeModulesDir, name);

    const packageJsonPath = path.join(packageDir, "package.json");

    // Check if package is installed
    if (!(await fs.pathExists(packageDir))) {
      console.log(`  Status: ${util.styleText("red", "Not installed")}`);
      return;
    }

    console.log(`  Status: ${util.styleText("green", "Installed")}`);

    // Display package information if available
    if (await fs.pathExists(packageJsonPath)) {
      const packageJson = await fs.readJson(packageJsonPath);

      packageJson.version && console.log(`  Version: ${packageJson.version}`);
      packageJson.description &&
        console.log(`  Description: ${packageJson.description}`);

      if (packageJson.dependencies) {
        console.log(
          `  Dependencies: ${Object.keys(packageJson.dependencies).length}`,
        );
      }
    }
  } catch (error) {
    logger.debug(`Failed to get detailed info for ${name}: ${error.message}`);
  }
}

module.exports = list;
