const { createLogger } = require("../../src/utils/logger");
const ora = require("ora-classic");

jest.mock("ora-classic");

describe("Logger", () => {
  let logger;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create a new logger instance
    logger = createLogger("test");

    // Set verbose mode on
    global.verbose = true;
  });

  test("info should create spinner with correct message", () => {
    const message = "Test info message";
    logger.info(message);

    expect(ora).toHaveBeenCalledWith(expect.stringContaining(message));
    expect(ora().start).toHaveBeenCalled();
  });

  test("success should call succeed on spinner", () => {
    const message = "Test success message";
    logger.info("Starting"); // Create spinner first
    logger.success(message);

    expect(ora().succeed).toHaveBeenCalledWith(
      expect.stringContaining(message),
    );
  });

  test("error should call fail on spinner", () => {
    const message = "Test error message";
    logger.info("Starting"); // Create spinner first
    logger.error(message);

    expect(ora().fail).toHaveBeenCalledWith(expect.stringContaining(message));
  });

  test("warn should log warning message", () => {
    const message = "Test warning message";
    logger.warn(message);

    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining(message));
  });

  test("debug should log debug message in verbose mode", () => {
    const message = "Test debug message";
    logger.debug(message);

    expect(console.debug).toHaveBeenCalledWith(
      expect.stringContaining(message),
    );
  });

  test("debug should not log in non-verbose mode", () => {
    global.verbose = false;
    const message = "Test debug message";
    logger.debug(message);

    expect(console.debug).not.toHaveBeenCalled();
  });

  test("stopSpinner should stop the spinner", () => {
    logger.info("Starting");
    logger.stopSpinner();

    expect(ora().stop).toHaveBeenCalled();
  });
});
