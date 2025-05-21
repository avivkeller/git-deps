#!/usr/bin/env node

const { program } = require("../src/index.js");

// Execute the program
program.parse(process.argv);

// If no arguments, display help
if (process.argv.length === 2) {
  program.help();
}
