#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PLUGIN_NAME = 'opensearch-cases-plugin';
const PLUGIN_VERSION = '2.19.1';
const BUILD_DIR = 'build';
const DIST_DIR = 'dist';

function log(message, color = 'white') {
  const colors = {
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    white: '\x1b[37m',
    reset: '\x1b[0m'
  };
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function executeCommand(command) {
  try {
    execSync(command, { stdio: 'inherit' });
  } catch (error) {
    log(`Error executing command: ${command}`, 'red');
    process.exit(1);
  }
}

function main() {
  log(`Starting build process for ${PLUGIN_NAME} v${PLUGIN_VERSION}`, 'green');

  // Clean previous builds
  log('Cleaning previous builds...', 'yellow');
  if (fs.existsSync(BUILD_DIR)) {
    fs.rmSync(BUILD_DIR, { recursive: true, force: true });
  }
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
  }
  
  fs.mkdirSync(BUILD_DIR, { recursive: true });
  fs.mkdirSync(DIST_DIR, { recursive: true });

  // Install dependencies
  log('Installing dependencies...', 'yellow');
  executeCommand('yarn install --frozen-lockfile');

  // Build the plugin
  log('Building the plugin...', 'yellow');
  
  // Create build directory structure
  const buildPluginDir = path.join(BUILD_DIR, PLUGIN_NAME);
  fs.mkdirSync(buildPluginDir, { recursive: true });

  // Copy essential files
  const filesToCopy = [
    'opensearch_dashboards_plugin.json',
    'package.json',
    'README.md'
  ];

  filesToCopy.forEach(file => {
    if (fs.existsSync(file)) {
      fs.copyFileSync(file, path.join(buildPluginDir, file));
    }
  });

  // Copy directories
  const dirsToCopy = ['public', 'server'];
  dirsToCopy.forEach(dir => {
    if (fs.existsSync(dir)) {
      fs.cpSync(dir, path.join(buildPluginDir, dir), { recursive: true });
    }
  });

  // Create the zip file
  log('Creating distribution zip...', 'yellow');
  const zipName = `${PLUGIN_NAME}-${PLUGIN_VERSION}.zip`;
  const currentDir = process.cwd();
  
  process.chdir(BUILD_DIR);
  executeCommand(`zip -r ../${DIST_DIR}/${zipName} ${PLUGIN_NAME}/`);
  process.chdir(currentDir);

  log('Build completed successfully!', 'green');
  log(`Distribution zip created: ${DIST_DIR}/${zipName}`, 'green');

  // Display installation instructions
  log('Installation Instructions:', 'green');
  log(`1. Copy the ${zipName} file to your OpenSearch Dashboard server`);
  log(`2. Run: ./bin/opensearch-dashboards-plugin install file:///path/to/${zipName}`);
  log('3. Restart OpenSearch Dashboard');
  log('4. Access the plugin through OpenSearch Dashboard UI');
}

if (require.main === module) {
  main();
}

module.exports = { main };