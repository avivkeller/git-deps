const path = require("path");
const fs = require("fs-extra");
const { getGitDependencies } = require("../../src/utils/package-manager");
const { parseGitUrl } = require("../../src/utils/git");
const list = require("../../src/commands/list");

// Mock dependencies
jest.mock("../../src/utils/package-manager");
jest.mock("../../src/utils/git");

describe("List Command", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock console methods
    global.console.log = jest.fn();

    // Setup default mocks
    getGitDependencies.mockResolvedValue({
      "test-pkg": "https://github.com/user/repo.git#v1.0.0",
      "@scope/pkg":
        "https://github.com/user/repo.git#main&path:/packages/scoped",
    });

    parseGitUrl.mockImplementation((url) => {
      if (url === "https://github.com/user/repo.git#v1.0.0") {
        return {
          url: "https://github.com/user/repo.git",
          ref: "v1.0.0",
          path: "/",
        };
      } else {
        return {
          url: "https://github.com/user/repo.git",
          ref: "main",
          path: "/packages/scoped",
        };
      }
    });
  });

  test("should list all dependencies", async () => {
    await list();

    expect(getGitDependencies).toHaveBeenCalled();
    expect(parseGitUrl).toHaveBeenCalledTimes(2);
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("test-pkg"),
    );
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("@scope/pkg"),
    );
  });

  test("should show detailed info when detail option is provided", async () => {
    fs.pathExists = jest.fn().mockImplementation((p) => {
      return p.includes("test-pkg");
    });

    fs.readJson = jest.fn().mockResolvedValue({
      name: "test-pkg",
      version: "1.0.0",
      description: "Test package",
      dependencies: { lodash: "^4.0.0" },
    });

    await list({ detail: true });

    expect(fs.pathExists).toHaveBeenCalled();
    expect(fs.readJson).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("Version: 1.0.0"),
    );
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("Description: Test package"),
    );
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("Dependencies: 1"),
    );
  });

  test("should handle case when no dependencies exist", async () => {
    getGitDependencies.mockResolvedValue(null);

    await list();

    expect(console.log).not.toHaveBeenCalled();
  });

  test("should handle errors during detail fetching", async () => {
    fs.pathExists = jest.fn().mockImplementation(() => {
      throw new Error("Test error");
    });

    await list({ detail: true });

    // Should still display the dependency list
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("test-pkg"),
    );
  });

  test("should properly construct node_modules path for scoped packages", async () => {
    fs.pathExists = jest.fn().mockImplementation(() => true);
    fs.readJson = jest.fn().mockResolvedValue({
      name: "@scope/pkg",
      version: "2.0.0",
    });

    await list({ detail: true });

    // Check path construction for scoped package
    const expectedPath = path.join(
      process.cwd(),
      "node_modules",
      "@scope",
      "pkg",
      "package.json",
    );
    expect(fs.readJson).toHaveBeenCalledWith(
      expect.stringContaining(expectedPath),
    );
  });
});
