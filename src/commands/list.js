const fs = require("fs-extra");
const path = require("path");
const { getGitDependencies } = require("../utils/package-manager");
const { parseGitUrl } = require("../utils/git");
const { createLogger } = require("../utils/logger");
const chalk = require("chalk");

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
    console.log(chalk.bold("\nGit Dependencies:"));
    console.log(chalk.bold("----------------"));

    for (const [name, gitUrl] of Object.entries(gitDependencies)) {
      const { url, ref, path: subPath } = parseGitUrl(gitUrl);

      console.log(chalk.green(`${name}:`));
      console.log(`  Repository: ${chalk.blue(url)}`);
      console.log(`  Reference: ${chalk.yellow(ref)}`);
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
    let packageDir;

    if (name.startsWith("@")) {
      // Scoped package
      const [scope, pkgName] = name.split("/");
      packageDir = path.join(nodeModulesDir, scope, pkgName);
    } else {
      // Regular package
      packageDir = path.join(nodeModulesDir, name);
    }

    const packageJsonPath = path.join(packageDir, "package.json");

    if (!(await fs.pathExists(packageDir))) {
      console.log(`  Status: ${chalk.red("Not installed")}`);
      return;
    }

    console.log(`  Status: ${chalk.green("Installed")}`);

    if (await fs.pathExists(packageJsonPath)) {
      const packageJson = await fs.readJson(packageJsonPath);

      if (packageJson.version) {
        console.log(`  Version: ${packageJson.version}`);
      }

      if (packageJson.description) {
        console.log(`  Description: ${packageJson.description}`);
      }

      if (packageJson.dependencies) {
        const depCount = Object.keys(packageJson.dependencies).length;
        console.log(`  Dependencies: ${depCount}`);
      }
    }
  } catch (error) {
    logger.debug(`Failed to get detailed info for ${name}: ${error.message}`);
  }
}

module.exports = list;
