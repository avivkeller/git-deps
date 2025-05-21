const path = require("path");
const fs = require("fs-extra");
const {
  parseGitUrl,
  cloneRepo,
  extractFiles,
  isGitUrl,
  getRepoNameFromUrl,
  getPackageName,
} = require("../../src/utils/git");
const {
  getGitDependencies,
  installPackageDependencies,
  saveGitDependency,
} = require("../../src/utils/package-manager");
const install = require("../../src/commands/install");

// Mock the git utility functions
jest.mock("../../src/utils/git");
jest.mock("../../src/utils/package-manager");

describe("Install Command", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    isGitUrl.mockImplementation((str) => str.startsWith("http"));
    parseGitUrl.mockImplementation((url) => ({
      url: url.split("#")[0],
      ref: "HEAD",
      path: "/",
    }));
    cloneRepo.mockResolvedValue(path.join("/tmp", "repo"));
    getGitDependencies.mockResolvedValue({
      "test-pkg": "https://github.com/user/repo.git",
      "other-pkg": "https://github.com/user/other.git",
    });
    getPackageName.mockResolvedValue("detected-pkg-name");
    extractFiles.mockResolvedValue(undefined);
    installPackageDependencies.mockResolvedValue(undefined);
  });

  test("should install all dependencies when no specific dependency provided", async () => {
    await install();

    expect(cloneRepo).toHaveBeenCalledTimes(2);
    expect(extractFiles).toHaveBeenCalledTimes(2);
    expect(installPackageDependencies).toHaveBeenCalledTimes(2);
  });

  test("should install only specified dependency", async () => {
    await install("test-pkg");

    expect(cloneRepo).toHaveBeenCalledTimes(1);
    expect(cloneRepo).toHaveBeenCalledWith(expect.any(String), "HEAD");
    expect(extractFiles).toHaveBeenCalledTimes(1);
  });

  test("should handle Git URL as dependency input", async () => {
    const gitUrl = "https://github.com/user/new.git#v1.0.0";

    await install(gitUrl);

    expect(isGitUrl).toHaveBeenCalledWith(gitUrl);
    expect(cloneRepo).toHaveBeenCalledWith(
      "https://github.com/user/new.git",
      "HEAD",
    );
    expect(getPackageName).toHaveBeenCalled();
    expect(saveGitDependency).toHaveBeenCalledWith({
      "detected-pkg-name": gitUrl,
    });
  });

  test("should fall back to repo name if package name not found", async () => {
    const gitUrl = "https://github.com/user/new.git";
    getPackageName.mockResolvedValue(null);
    getRepoNameFromUrl.mockReturnValue("new");

    await install(gitUrl);

    expect(saveGitDependency).toHaveBeenCalledWith({
      new: gitUrl,
    });
  });

  test("should handle case where gitDependencies does not exist", async () => {
    getGitDependencies.mockResolvedValue(null);

    await install();

    expect(saveGitDependency).toHaveBeenCalledWith({});
  });

  test("should skip existing packages when not forced", async () => {
    fs.pathExists.mockResolvedValue(true); // Package exists

    await install();

    expect(extractFiles).not.toHaveBeenCalled();
    expect(installPackageDependencies).not.toHaveBeenCalled();
  });

  test("should reinstall when forced even if package exists", async () => {
    fs.pathExists.mockResolvedValue(true); // Package exists

    await install(null, { force: true });

    expect(extractFiles).toHaveBeenCalled();
    expect(installPackageDependencies).toHaveBeenCalled();
  });

  test("should handle error and exit process", async () => {
    const mockExit = jest.spyOn(process, "exit").mockImplementation(() => {});
    getGitDependencies.mockRejectedValue(new Error("Test error"));

    await install();

    expect(mockExit).toHaveBeenCalledWith(1);

    mockExit.mockRestore();
  });

  test("should optimize repository reuse for multiple packages", async () => {
    // Mock two packages from the same repo
    getGitDependencies.mockResolvedValue({
      "pkg-a": "https://github.com/user/monorepo.git#main&path:/packages/a",
      "pkg-b": "https://github.com/user/monorepo.git#main&path:/packages/b",
    });

    parseGitUrl.mockImplementation((url) => {
      if (url.includes("packages/a")) {
        return {
          url: "https://github.com/user/monorepo.git",
          ref: "main",
          path: "/packages/a",
        };
      } else {
        return {
          url: "https://github.com/user/monorepo.git",
          ref: "main",
          path: "/packages/b",
        };
      }
    });

    await install();

    // Should only clone the repo once
    expect(cloneRepo).toHaveBeenCalledTimes(1);
  });

  test("should correctly handle node_modules paths with scoped packages", async () => {
    // Setup a test with a scoped package
    getGitDependencies.mockResolvedValue({
      "@scope/pkg": "https://github.com/user/repo.git",
    });

    // Allow the path check to proceed to extraction
    fs.pathExists.mockResolvedValue(false);

    await install();

    // Check that extractFiles was called with the correct node_modules path
    const expectedNodeModulesPath = path.join(
      process.cwd(),
      "node_modules",
      "@scope",
      "pkg",
    );
    expect(extractFiles).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expectedNodeModulesPath,
    );
  });
});
