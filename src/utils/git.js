const simpleGit = require("simple-git");
const path = require("path");
const fs = require("fs-extra");
const { createLogger } = require("./logger");
const tmp = require("tmp");
const { URL } = require("url");

const logger = createLogger("git");

// Make tmp directory cleanup recursive and automatic
tmp.setGracefulCleanup();

/**
 * Parse a git dependency URL
 * @param {string} url - Git URL with optional ref and path
 * @returns {Object} Parsed URL with ref and path
 */
function parseGitUrl(url) {
  const [baseUrl, params] = url.split("#");

  if (!params) {
    return { url: baseUrl, ref: "HEAD", path: "/" };
  }

  const paramParts = params.split("&");
  let ref = "HEAD";
  let subPath = "/";

  paramParts.forEach((part) => {
    if (part.startsWith("path:")) {
      subPath = part.replace("path:", "");
    } else {
      ref = part;
    }
  });

  return { url: baseUrl, ref, path: subPath };
}

/**
 * Extract repository name from Git URL
 * @param {string} gitUrl - Git repository URL
 * @returns {string} Repository name
 */
function getRepoNameFromUrl(gitUrl) {
  try {
    // Try to parse as a standard URL
    let url;
    try {
      url = new URL(gitUrl);
    } catch (e) {
      // Handle SSH URLs (git@github.com:user/repo.git)
      if (gitUrl.includes("@") && gitUrl.includes(":")) {
        const match = gitUrl.match(/:([^/]+\/[^/]+?)(?:\.git)?$/);
        if (match && match[1]) {
          const parts = match[1].split("/");
          return parts[parts.length - 1].replace(/\.git$/, "");
        }
      }

      // If all else fails, just take the last part of the path
      const parts = gitUrl.split("/");
      return parts[parts.length - 1].replace(/\.git$/, "");
    }

    // For standard URLs
    const pathname = url.pathname;
    const parts = pathname.split("/").filter(Boolean);

    if (parts.length >= 2) {
      let repoName = parts[parts.length - 1];
      return repoName.replace(/\.git$/, "");
    }

    return "unknown-repo";
  } catch (error) {
    logger.debug(`Failed to parse repository name from URL: ${error.message}`);
    return "unknown-repo";
  }
}

/**
 * Check if a string is a Git URL
 * @param {string} str - String to check
 * @returns {boolean} True if the string is a Git URL
 */
function isGitUrl(str) {
  // Git URLs can be in various formats
  return (
    // HTTPS format
    str.startsWith("https://") ||
    str.startsWith("http://") ||
    // Git protocol
    str.startsWith("git://") ||
    // SSH format
    /^git@[a-zA-Z0-9_.-]+:.+\.git$/.test(str) ||
    // Relative local path with .git extension
    /^\.\.?\/.*\.git$/.test(str) ||
    // Absolute local path with .git extension
    /^\/.*\.git$/.test(str)
  );
}

/**
 * Clone a git repository to a temporary directory
 * @param {string} url - Git repository URL
 * @param {string} ref - Git reference (branch, tag, commit)
 * @returns {Promise<Object>} Repository info including path and cleanup function
 */
async function cloneRepo(url, ref) {
  try {
    // Create a temporary directory that will be automatically cleaned up
    const tempDir = tmp.dirSync({
      unsafeCleanup: true, // Remove directory even if it contains files
      prefix: "git-deps-",
    });

    const git = simpleGit();

    // Use shallow clone when ref is a branch or tag to improve performance
    // For specific commits, we need a full clone
    const useShallow = !ref.match(/^[0-9a-f]{40}$/); // Not a full commit hash

    // Shallow cloning options to speed up the process
    const cloneOptions = useShallow ? ["--depth=1", "--single-branch"] : [];

    if (ref !== "HEAD" && useShallow) {
      cloneOptions.push("--branch", ref);
    }

    await git.clone(url, tempDir.name, cloneOptions);

    // If ref wasn't specified during clone or is a commit hash, checkout now
    if (
      (ref !== "HEAD" && !useShallow) ||
      (useShallow && !cloneOptions.includes("--branch"))
    ) {
      await simpleGit(tempDir.name).checkout(ref);
    }

    return tempDir.name;
  } catch (error) {
    throw new Error(`Git clone failed: ${error.message}`);
  }
}

/**
 * Extract files from a repository at the given path
 * @param {string} repoDir - Path to the repository
 * @param {string} subPath - Subdirectory path to extract
 * @param {string} destDir - Destination directory
 */
async function extractFiles(repoDir, subPath, destDir) {
  const sourcePath = path.join(repoDir, subPath === "/" ? "" : subPath);

  if (!(await fs.pathExists(sourcePath))) {
    throw new Error(`Source path ${subPath} does not exist in the repository`);
  }

  await fs.ensureDir(destDir);
  await fs.copy(sourcePath, destDir, { overwrite: true });
}

/**
 * Get package name from package.json
 * @param {string} repoDir - Path to the repository
 * @param {string} subPath - Subdirectory path
 * @returns {Promise<string|null>} Package name or null if not found
 */
async function getPackageName(repoDir, subPath) {
  try {
    const packageJsonPath = path.join(
      repoDir,
      subPath === "/" ? "" : subPath,
      "package.json",
    );

    if (await fs.pathExists(packageJsonPath)) {
      const packageJson = await fs.readJson(packageJsonPath);
      if (packageJson.name) {
        return packageJson.name;
      }
    }

    return null;
  } catch (error) {
    logger.debug(`Failed to read package.json: ${error.message}`);
    return null;
  }
}

module.exports = {
  parseGitUrl,
  cloneRepo,
  extractFiles,
  isGitUrl,
  getRepoNameFromUrl,
  getPackageName,
};
