# Release Process

## Prerequisites

```bash
npm install
```

## Creating a Release

There are two ways to create a release:

### Option 1: GitHub Actions (Recommended)

1. Merge your changes to `main`
2. Push to a `release/*` branch (e.g., `release/0.1.3`)
3. The `release` workflow will automatically:
   - Prompt for release type (patch, minor, major)
   - Update version in all files
   - Create git tag and GitHub release
   - Trigger the publish workflow

Or use `workflow_dispatch` in GitHub Actions to manually trigger.

### Option 2: Local CLI

```bash
npm run release
```

This will:
1. Prompt for release type (patch, minor, major)
2. Update version in all files
3. Regenerate lock files
4. Commit with `[skip ci]`
5. Create and push git tag
6. Create GitHub draft release

The tag push triggers the publish workflow.

## Release Types

- **patch** (0.1.2 → 0.1.3) - Bug fixes
- **minor** (0.1.2 → 0.2.0) - New features (backward compatible)
- **major** (0.1.2 → 1.0.0) - Breaking changes

## Local GitHub Token

release-it needs `GITHUB_TOKEN` for local runs:

```bash
GITHUB_TOKEN=ghp_xxx npm run release
```

## Smoke Tests

The CI runs smoke tests against the built Tauri binary (Linux and Windows) after publish.

To run smoke tests locally:

```bash
# Build the Tauri app first
npm run tauri build

# Run smoke tests against the binary
TEST_PLATFORM=linux TEST_APP_PATH=./src-tauri/target/release/bundle linux npm run test:e2e:tauri
```
