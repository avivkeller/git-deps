const { execSync } = require("child_process");
const fs = require("fs-extra");
const path = require("path");
const { createLogger } = require("./logger");

const logger = createLogger("package-manager");

/**
 * Check if a command exists in PATH
 * @param {string} cmd - Command to check
 * @returns {boolean} True if command exists
 */
function commandExists(cmd) {
  try {
    const isWin = process.platform === "win32";
    const whichCmd = isWin ? "where" : "which";
    execSync(`${whichCmd} ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Detect the package manager being used in the project
 * @returns {string} Package manager command (npm, yarn, or pnpm)
 */
function detectPackageManager() {
  // First check for lockfiles
  if (fs.existsSync("pnpm-lock.yaml") && commandExists("pnpm")) {
    return "pnpm";
  } else if (fs.existsSync("yarn.lock") && commandExists("yarn")) {
    return "yarn";
  } else if (fs.existsSync("package-lock.json") && commandExists("npm")) {
    return "npm";
  }

  // Then check for available commands
  if (commandExists("pnpm")) {
    return "pnpm";
  } else if (commandExists("yarn")) {
    return "yarn";
  } else if (commandExists("npm")) {
    return "npm";
  }

  // Default to npm if nothing else is found
  return "npm";
}

/**
 * Install dependencies for a package
 * @param {string} packageDir - Directory of the package
 */
async function installPackageDependencies(packageDir) {
  const packageJsonPath = path.join(packageDir, "package.json");

  if (await fs.pathExists(packageJsonPath)) {
    const packageJson = await fs.readJson(packageJsonPath);

    // Skip if there are no dependencies to install
    if (!packageJson.dependencies && !packageJson.devDependencies) {
      logger.success("No dependencies to install, skipping");
      return;
    }

    const packageManager = detectPackageManager();
    logger.info(`Installing dependencies using ${packageManager}...`);

    // Prepare the install command based on the package manager
    let installCmd = `${packageManager} install`;

    if (packageManager === "npm") {
      installCmd += " --omit=dev";
    } else if (packageManager === "pnpm") {
      installCmd += " --prod";
    } else if (packageManager === "yarn") {
      installCmd += " --production";
    }

    execSync(installCmd, {
      cwd: packageDir,
      stdio: global.verbose ? "inherit" : "ignore",
    });

    logger.success("Dependencies installed successfully");
  }
}

/**
 * Get the gitDependencies from package.json
 * @returns {Promise<Object|null>} Git dependencies object or null if not found
 */
async function getGitDependencies() {
  const packageJsonPath = path.join(process.cwd(), "package.json");

  if (!(await fs.pathExists(packageJsonPath))) {
    throw new Error("package.json not found in the current directory");
  }

  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf8"));

  return packageJson.gitDependencies || null;
}

/**
 * Save a git dependency to package.json
 * @param {Object} dependencies - Dependencies to add/update
 * @returns {Promise<void>}
 */
async function saveGitDependency(dependencies) {
  const packageJsonPath = path.join(process.cwd(), "package.json");

  if (!(await fs.pathExists(packageJsonPath))) {
    throw new Error("package.json not found in the current directory");
  }

  // Read the current package.json
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf8"));

  // Create gitDependencies if it doesn't exist
  if (!packageJson.gitDependencies) {
    packageJson.gitDependencies = {};
  }

  // Add/update the dependencies
  for (const [name, url] of Object.entries(dependencies)) {
    packageJson.gitDependencies[name] = url;
  }

  // Write the updated package.json
  await fs.writeFile(
    packageJsonPath,
    JSON.stringify(packageJson, null, 2) + "\n", // Pretty print with newline
    "utf8",
  );
}

module.exports = {
  detectPackageManager,
  installPackageDependencies,
  getGitDependencies,
  saveGitDependency,
};
