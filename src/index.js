const { Command } = require("commander");
const path = require("path");
const fs = require("fs-extra");

const installCommand = require("./commands/install");
const listCommand = require("./commands/list");

// Get package version from package.json
const packageJsonPath = path.join(__dirname, "..", "package.json");
const { version } = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

// Create a new command program
const program = new Command();

// Set program metadata
program
  .name("git-deps")
  .description("CLI tool for managing Git-based dependencies")
  .version(version)
  .option("-v, --verbose", "Enable verbose output")
  .hook("preAction", (thisCommand) => {
    // Set global verbose flag
    global.verbose = thisCommand.opts().verbose;
  });

// Register commands
program
  .command("install")
  .description("Install git dependencies")
  .argument("[dep]", "Optional dependency name or git URL")
  .option("-f, --force", "Force reinstallation even if dependency exists")
  .action(installCommand);

program
  .command("list")
  .description("List all git dependencies")
  .option("-d, --detail", "Show detailed information")
  .action(listCommand);

module.exports = { program };
