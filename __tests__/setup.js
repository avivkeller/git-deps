// Mock fs-extra
jest.mock("fs-extra", () => {
  const actualFs = jest.requireActual("fs-extra");
  return {
    ...actualFs,
    pathExists: jest.fn(),
    ensureDir: jest.fn(),
    readJson: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    copy: jest.fn(),
    existsSync: jest.fn(),
  };
});

// Mock simple-git
jest.mock("simple-git", () => {
  const mockGit = {
    clone: jest.fn().mockResolvedValue(undefined),
    fetch: jest.fn().mockResolvedValue(undefined),
    checkout: jest.fn().mockResolvedValue(undefined),
  };

  return jest.fn(() => mockGit);
});

// Mock tmp
jest.mock("tmp", () => {
  return {
    setGracefulCleanup: jest.fn(),
    dirSync: jest.fn().mockReturnValue({
      name: "/tmp/mock-dir",
      removeCallback: jest.fn(),
    }),
  };
});

// Mock child_process
jest.mock("child_process", () => {
  return {
    execSync: jest.fn(),
  };
});

// Mock ora for spinner
jest.mock("ora-classic", () => {
  return jest.fn().mockImplementation(() => ({
    start: jest.fn().mockReturnThis(),
    stop: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
  }));
});

// Global mock for console methods
global.console = {
  ...global.console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};
