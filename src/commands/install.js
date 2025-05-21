const path = require("path");
const fs = require("fs-extra");
const {
  parseGitUrl,
  cloneRepo,
  extractFiles,
  isGitUrl,
  getRepoNameFromUrl,
  getPackageName,
} = require("../utils/git");
const {
  getGitDependencies,
  installPackageDependencies,
  saveGitDependency,
} = require("../utils/package-manager");
const { createLogger } = require("../utils/logger");

const logger = createLogger("install");

/**
 * Install git dependencies
 * @param {string} [depArg] - Optional dependency name or git URL
 * @param {Object} options - Command options
 */
async function install(depArg, options = {}) {
  try {
    let gitDependencies = await getGitDependencies();

    // If no gitDependencies field exists, create it
    if (!gitDependencies) {
      gitDependencies = {};
      await saveGitDependency({});
    }

    let depsToInstall = {};

    // Handle Git URL provided directly
    if (depArg && isGitUrl(depArg)) {
      const gitUrl = depArg;
      const { url, ref, path: subPath } = parseGitUrl(gitUrl);

      // Clone the repository to get the package name
      const repo = await cloneRepo(url, ref);

      try {
        // Try to get the package name from package.json
        // If package.json doesn't exist or doesn't have a name, use repo name
        const packageName =
          (await getPackageName(repo, subPath)) || getRepoNameFromUrl(url);

        // Add the dependency to gitDependencies
        gitDependencies[packageName] = gitUrl;
        await saveGitDependency({ [packageName]: gitUrl });

        // Add to the list of dependencies to install
        depsToInstall[packageName] = gitUrl;
      } finally {
        // The temp directory will be cleaned up automatically
      }
    }
    // Handle existing dependency name
    else if (depArg) {
      if (gitDependencies[depArg]) {
        depsToInstall[depArg] = gitDependencies[depArg];
      } else {
        logger.error(`Dependency '${depArg}' not found in gitDependencies`);
        return;
      }
    }
    // Install all dependencies if no specific one is provided
    else {
      depsToInstall = gitDependencies;
    }

    // If there are no dependencies to install, exit early
    if (Object.keys(depsToInstall).length === 0) {
      logger.info("No git dependencies to install");
      return;
    }

    // Group dependencies by repository to avoid redundant cloning
    const groupedDeps = groupDependenciesByRepo(depsToInstall);

    // Process each repository group
    for (const [repoKey, deps] of Object.entries(groupedDeps)) {
      const { url, ref } = deps[0].parsed;

      logger.info(`Processing repository: ${url}#${ref}`);

      // Clone the repository once
      const repo = await cloneRepo(url, ref);

      // Process each dependency from this repo
      for (const dep of deps) {
        await installDependency(dep.name, dep.parsed.path, repo, options.force);
      }
    }

    logger.success("All git dependencies installed successfully");
  } catch (error) {
    logger.error(`Installation failed: ${error.message}`, error);
    process.exit(1);
  }
}

/**
 * Group dependencies by repository URL and reference
 * @param {Object} dependencies - Dependencies object from package.json
 * @returns {Object} Dependencies grouped by repository
 */
function groupDependenciesByRepo(dependencies) {
  const groups = {};

  for (const [name, gitUrl] of Object.entries(dependencies)) {
    const parsed = parseGitUrl(gitUrl);
    const key = `${parsed.url}#${parsed.ref}`;

    if (!groups[key]) {
      groups[key] = [];
    }

    groups[key].push({ name, gitUrl, parsed });
  }

  return groups;
}

/**
 * Install a single dependency
 * @param {string} name - Package name
 * @param {string} subPath - Path within the repository
 * @param {string} repoPath - Path to the cloned repository
 * @param {boolean} force - Force reinstallation even if package exists
 */
async function installDependency(name, subPath, repoPath, force = false) {
  // Determine destination directory based on package name
  const nodeModulesDir = path.join(process.cwd(), "node_modules");
  let destDir;

  if (name.startsWith("@")) {
    // Scoped package
    const [scope, pkgName] = name.split("/");
    destDir = path.join(nodeModulesDir, scope, pkgName);
  } else {
    // Regular package
    destDir = path.join(nodeModulesDir, name);
  }

  // Check if package already exists and skip if not forced
  if (!force && (await fs.pathExists(destDir))) {
    logger.info(`${name} already exists, skipping (use --force to reinstall)`);
    return;
  }

  // Extract files from the repository
  await extractFiles(repoPath, subPath, destDir);

  // Install dependencies for the extracted package
  await installPackageDependencies(destDir);

  logger.success(`Installed ${name} successfully`);
}

module.exports = install;
