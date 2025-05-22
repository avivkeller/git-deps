const path = require("path");
const fs = require("fs-extra");
const { execSync } = require("child_process");
const {
  detectPackageManager,
  installPackageDependencies,
  getGitDependencies,
  saveGitDependency,
} = require("../../src/utils/package-manager");

jest.mock("child_process");
jest.mock("fs-extra");

describe("Package Manager Utils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = "development";
  });

  describe("detectPackageManager", () => {
    test("should detect npm from package-lock.json", () => {
      fs.existsSync.mockImplementation((file) => file === "package-lock.json");
      execSync.mockImplementation(() => true);

      const result = detectPackageManager();

      expect(result).toBe("npm");
    });

    test("should detect yarn from yarn.lock", () => {
      fs.existsSync.mockImplementation((file) => file === "yarn.lock");
      execSync.mockImplementation(() => true);

      const result = detectPackageManager();

      expect(result).toBe("yarn");
    });

    test("should detect pnpm from pnpm-lock.yaml", () => {
      fs.existsSync.mockImplementation((file) => file === "pnpm-lock.yaml");
      execSync.mockImplementation(() => true);

      const result = detectPackageManager();

      expect(result).toBe("pnpm");
    });

    test("should fallback to available package manager if no lockfile", () => {
      fs.existsSync.mockReturnValue(false);
      execSync.mockImplementation((cmd) => {
        if (cmd.includes("which pnpm") || cmd.includes("where pnpm")) {
          throw new Error("Not found");
        }
        return true;
      });

      const result = detectPackageManager();

      expect(result).toBe("yarn");
    });

    test("should fallback to npm if no package manager found", () => {
      fs.existsSync.mockReturnValue(false);
      execSync.mockImplementation(() => {
        throw new Error("Not found");
      });

      const result = detectPackageManager();

      expect(result).toBe("npm");
    });
  });

  describe("installPackageDependencies", () => {
    test("should skip if package.json does not exist", async () => {
      const testPath = path.join("/test", "path");
      const packageJsonPath = path.join(testPath, "package.json");

      fs.pathExists.mockImplementation((p) => p !== packageJsonPath);

      await installPackageDependencies(testPath);

      expect(execSync).not.toHaveBeenCalled();
    });

    test("should skip if no dependencies in package.json", async () => {
      const testPath = path.join("/test", "path");

      fs.pathExists.mockResolvedValue(true);
      fs.readJson.mockResolvedValue({ name: "test" });

      await installPackageDependencies(testPath);

      expect(execSync).not.toHaveBeenCalled();
    });

    test("should install dependencies with npm", async () => {
      const testPath = path.join("/test", "path");

      fs.pathExists.mockResolvedValue(true);
      fs.readJson.mockResolvedValue({ dependencies: { lodash: "^4.0.0" } });
      fs.existsSync.mockImplementation((file) => file === "package-lock.json");
      execSync.mockImplementation(() => true);

      await installPackageDependencies(testPath);

      expect(execSync).toHaveBeenCalledWith("npm install --omit=dev", {
        cwd: testPath,
        stdio: "ignore",
      });
    });
  });

  describe("getGitDependencies", () => {
    test("should return gitDependencies from package.json", async () => {
      const mockDeps = {
        "my-lib": "https://github.com/user/repo.git#v1.0.0",
      };

      const packageJsonPath = path.join(process.cwd(), "package.json");
      fs.pathExists.mockImplementation((p) => p === packageJsonPath);
      fs.readFile.mockResolvedValue(
        JSON.stringify({
          gitDependencies: mockDeps,
        }),
      );

      const result = await getGitDependencies();

      expect(result).toEqual(mockDeps);
    });

    test("should return null if no gitDependencies", async () => {
      const packageJsonPath = path.join(process.cwd(), "package.json");
      fs.pathExists.mockImplementation((p) => p === packageJsonPath);
      fs.readFile.mockResolvedValue(JSON.stringify({}));

      const result = await getGitDependencies();

      expect(result).toBeNull();
    });

    test("should handle missing package.json", async () => {
      fs.pathExists.mockResolvedValue(false);

      await expect(getGitDependencies()).rejects.toThrow(
        "package.json not found",
      );
    });
  });

  describe("saveGitDependency", () => {
    test("should add new dependency to existing gitDependencies", async () => {
      const existingPackageJson = {
        name: "test-project",
        gitDependencies: {
          "existing-lib": "https://github.com/user/existing.git",
        },
      };

      const newDeps = {
        "new-lib": "https://github.com/user/new.git#v1.0.0",
      };

      const packageJsonPath = path.join(process.cwd(), "package.json");
      fs.pathExists.mockImplementation((p) => p === packageJsonPath);
      fs.readFile.mockResolvedValue(JSON.stringify(existingPackageJson));

      await saveGitDependency(newDeps);

      expect(fs.writeFile).toHaveBeenCalledWith(
        packageJsonPath,
        expect.stringContaining('"existing-lib"'),
        "utf8",
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        packageJsonPath,
        expect.stringContaining('"new-lib"'),
        "utf8",
      );
    });

    test("should create gitDependencies if it does not exist", async () => {
      const existingPackageJson = {
        name: "test-project",
      };

      const newDeps = {
        "new-lib": "https://github.com/user/new.git#v1.0.0",
      };

      const packageJsonPath = path.join(process.cwd(), "package.json");
      fs.pathExists.mockImplementation((p) => p === packageJsonPath);
      fs.readFile.mockResolvedValue(JSON.stringify(existingPackageJson));

      await saveGitDependency(newDeps);

      expect(fs.writeFile).toHaveBeenCalledWith(
        packageJsonPath,
        expect.stringContaining('"gitDependencies"'),
        "utf8",
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        packageJsonPath,
        expect.stringContaining('"new-lib"'),
        "utf8",
      );
    });
  });
});
