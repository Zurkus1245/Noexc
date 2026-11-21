// Expo's monorepo setup: watch the workspace root so linked packages (@noexcuse/*) are bundled from source.
// Hierarchical lookup stays on, which pnpm's symlinked store relies on to resolve sibling dependencies.
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);
config.watchFolders = [workspaceRoot];

module.exports = config;
