// Metro precisa enxergar o monorepo para resolver @sentinela/shared.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
// Evita duplicar react/react-native quando o pnpm hoista de forma diferente.
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
