# git-deps

A Node.js CLI tool for managing Git-based dependencies specified in your package.json.

## Features

- Install dependencies directly from Git repositories
- Support for specific branches, tags, or commit references
- Extract packages from subdirectories within repositories
- Support for scoped packages
- Intelligent dependency resolution to avoid redundant operations
- Works with npm, yarn, and pnpm

## Installation

```bash
npm install -g git-deps
```

Or as a project dependency:

```bash
npm install --save-dev git-deps
```

## Usage

Add a `gitDependencies` field to your package.json:

```json
{
  "gitDependencies": {
    "my-lib": "https://github.com/example/repo.git#v1.0.0&path:/packages/my-lib",
    "@scope/utils": "https://github.com/example/repo.git#main&path:/packages/utils"
  }
}
```

### Commands

#### Install all dependencies

```bash
git-deps install
```

#### Install a specific dependency

```bash
git-deps install my-lib
```

#### Install directly from a Git URL

```bash
git-deps install https://github.com/example/repo.git#v1.0.0&path:/packages/my-lib
```

The tool will:

1. Determine the package name from the package's package.json, or use the repository name if not available
2. Add it to gitDependencies in your package.json
3. Install the package to your node_modules directory

#### Force reinstallation

```bash
git-deps install --force
```

#### List dependencies

```bash
git-deps list
```

#### Show detailed dependency info

```bash
git-deps list --detail
```

#### Enable verbose output

```bash
git-deps --verbose install
```

### Automatic installation

Add to your package.json scripts:

```json
{
  "scripts": {
    "postinstall": "git-deps install"
  }
}
```

## Git Dependency Format

Each entry in `gitDependencies` follows the format:

```
"https://your.git.repo#ref&path:/subdir"
```

- `ref` is optional and defaults to `HEAD`.
- `path` is optional and refers to a subdirectory within the repository.

Examples:

- `https://github.com/example/repo.git` (uses HEAD, installs from repo root)
- `https://github.com/example/repo.git#v1.2.3` (uses tag v1.2.3)
- `https://github.com/example/repo.git#path:/packages/lib-a` (uses HEAD, installs from subdirectory)
- `https://github.com/example/repo.git#v2.0.0&path:/tools/cli` (uses tag v2.0.0, installs from subdirectory)

## Repository Optimization

One of the key features of git-deps is its ability to intelligently handle multiple packages that come from the same Git repository:

1. When multiple dependencies come from the same repository and ref (for example, in a monorepo setup), git-deps will:
   - Clone the repository only once
   - Extract each package from the appropriate subdirectory
   - Clean up the clone only after all packages have been processed

This optimization significantly improves installation speed when working with monorepo-based dependencies.

## How It Works

1. **Reads Dependencies**: Parses the `gitDependencies` field from package.json. Creates it if it doesn't exist.
2. **Dependency Grouping**: Groups dependencies by repository to avoid redundant operations.
3. **Temporary Cloning**: Clones repositories to temporary directories which are automatically cleaned up.
4. **Smart Installation**: Extracts only the necessary files to the appropriate locations in node_modules.
5. **Dependency Installation**: Automatically runs the appropriate package manager to install each package's dependencies.
