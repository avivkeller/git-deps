const path = require("path");
const fs = require("fs-extra");
const simpleGit = require("simple-git");
const {
  parseGitUrl,
  cloneRepo,
  extractFiles,
  isGitUrl,
  getRepoNameFromUrl,
  getPackageName,
} = require("../../src/utils/git");

describe("Git Utils", () => {
  // Set up mocks
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("parseGitUrl", () => {
    test("should parse URL with no parameters", () => {
      const url = "https://github.com/user/repo.git";
      const result = parseGitUrl(url);

      expect(result).toEqual({
        url: "https://github.com/user/repo.git",
        ref: "HEAD",
        path: "/",
      });
    });

    test("should parse URL with ref", () => {
      const url = "https://github.com/user/repo.git#v1.0.0";
      const result = parseGitUrl(url);

      expect(result).toEqual({
        url: "https://github.com/user/repo.git",
        ref: "v1.0.0",
        path: "/",
      });
    });

    test("should parse URL with path", () => {
      const url = "https://github.com/user/repo.git#path:/packages/lib";
      const result = parseGitUrl(url);

      expect(result).toEqual({
        url: "https://github.com/user/repo.git",
        ref: "HEAD",
        path: "/packages/lib",
      });
    });

    test("should parse URL with both ref and path", () => {
      const url = "https://github.com/user/repo.git#v1.0.0&path:/packages/lib";
      const result = parseGitUrl(url);

      expect(result).toEqual({
        url: "https://github.com/user/repo.git",
        ref: "v1.0.0",
        path: "/packages/lib",
      });
    });
  });

  describe("getRepoNameFromUrl", () => {
    test("should extract name from HTTPS URL", () => {
      const url = "https://github.com/user/my-repo.git";
      const result = getRepoNameFromUrl(url);
      expect(result).toBe("my-repo");
    });

    test("should extract name from SSH URL", () => {
      const url = "git@github.com:user/my-repo.git";
      const result = getRepoNameFromUrl(url);
      expect(result).toBe("my-repo");
    });

    test("should handle URLs without .git extension", () => {
      const url = "https://github.com/user/my-repo";
      const result = getRepoNameFromUrl(url);
      expect(result).toBe("my-repo");
    });
  });

  describe("isGitUrl", () => {
    test("should identify HTTPS Git URLs", () => {
      expect(isGitUrl("https://github.com/user/repo.git")).toBe(true);
    });

    test("should identify SSH Git URLs", () => {
      expect(isGitUrl("git@github.com:user/repo.git")).toBe(true);
    });

    test("should identify git protocol URLs", () => {
      expect(isGitUrl("git://github.com/user/repo.git")).toBe(true);
    });

    test("should not identify regular package names as Git URLs", () => {
      expect(isGitUrl("my-package")).toBe(false);
    });
  });

  describe("cloneRepo", () => {
    test("should clone repository with shallow clone for tags/branches", async () => {
      const mockGit = simpleGit();

      await cloneRepo("https://github.com/user/repo.git", "main");

      expect(mockGit.clone).toHaveBeenCalledWith(
        "https://github.com/user/repo.git",
        "/tmp/mock-dir",
        ["--depth=1", "--single-branch", "--branch", "main"],
      );
    });

    test("should clone repository without shallow clone for commit hashes", async () => {
      const mockGit = simpleGit();

      await cloneRepo(
        "https://github.com/user/repo.git",
        "1234567890123456789012345678901234567890",
      );

      expect(mockGit.clone).toHaveBeenCalledWith(
        "https://github.com/user/repo.git",
        "/tmp/mock-dir",
        [],
      );
      expect(mockGit.checkout).toHaveBeenCalledWith(
        "1234567890123456789012345678901234567890",
      );
    });
  });

  describe("extractFiles", () => {
    test("should extract files from repo to destination", async () => {
      const repoPath = path.join("/repo", "path");
      const subPath = "/src";
      const destPath = path.join("/dest", "path");
      const sourcePath = path.join(repoPath, subPath);

      fs.pathExists.mockResolvedValue(true);

      await extractFiles(repoPath, subPath, destPath);

      expect(fs.pathExists).toHaveBeenCalledWith(sourcePath);
      expect(fs.ensureDir).toHaveBeenCalledWith(destPath);
      expect(fs.copy).toHaveBeenCalledWith(sourcePath, destPath, {
        overwrite: true,
      });
    });

    test("should handle root path correctly", async () => {
      const repoPath = path.join("/repo", "path");
      const subPath = "/";
      const destPath = path.join("/dest", "path");

      fs.pathExists.mockResolvedValue(true);

      await extractFiles(repoPath, subPath, destPath);

      expect(fs.pathExists).toHaveBeenCalledWith(repoPath);
      expect(fs.ensureDir).toHaveBeenCalledWith(destPath);
      expect(fs.copy).toHaveBeenCalledWith(repoPath, destPath, {
        overwrite: true,
      });
    });

    test("should throw error if source path does not exist", async () => {
      const repoPath = "/repo/path";
      const subPath = "/src";
      const destPath = "/dest/path";

      fs.pathExists.mockResolvedValue(false);

      await expect(extractFiles(repoPath, subPath, destPath)).rejects.toThrow(
        /Source path.*does not exist/,
      );
    });
  });

  describe("getPackageName", () => {
    test("should get package name from package.json", async () => {
      const repoPath = "/repo/path";
      const subPath = "/";
      const packageJsonPath = path.join(repoPath, "package.json");

      fs.pathExists.mockResolvedValue(true);
      fs.readJson.mockResolvedValue({ name: "test-package" });

      const result = await getPackageName(repoPath, subPath);

      expect(result).toBe("test-package");
      expect(fs.readJson).toHaveBeenCalledWith(packageJsonPath);
    });

    test("should get package name from subdirectory", async () => {
      const repoPath = "/repo/path";
      const subPath = "/packages/lib";
      const packageJsonPath = path.join(
        repoPath,
        "packages",
        "lib",
        "package.json",
      );

      fs.pathExists.mockResolvedValue(true);
      fs.readJson.mockResolvedValue({ name: "test-package" });

      const result = await getPackageName(repoPath, subPath);

      expect(result).toBe("test-package");
      expect(fs.readJson).toHaveBeenCalledWith(packageJsonPath);
    });

    test("should return null if package.json does not exist", async () => {
      fs.pathExists.mockResolvedValue(false);

      const result = await getPackageName("/repo/path", "/");

      expect(result).toBeNull();
    });

    test("should return null if package.json does not have name", async () => {
      fs.pathExists.mockResolvedValue(true);
      fs.readJson.mockResolvedValue({ version: "1.0.0" });

      const result = await getPackageName("/repo/path", "/");

      expect(result).toBeNull();
    });
  });
});
