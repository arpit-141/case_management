#!/bin/bash

# OpenSearch Cases Plugin Build Script
# This script builds the plugin and creates a distributable zip file

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Plugin info
PLUGIN_NAME="opensearch-cases-plugin"
PLUGIN_VERSION="2.19.1"
BUILD_DIR="build"
DIST_DIR="dist"
ZIP_NAME="${PLUGIN_NAME}-${PLUGIN_VERSION}.zip"

echo -e "${GREEN}Starting build process for ${PLUGIN_NAME} v${PLUGIN_VERSION}${NC}"

# Clean previous builds
echo -e "${YELLOW}Cleaning previous builds...${NC}"
rm -rf ${BUILD_DIR}
rm -rf ${DIST_DIR}
mkdir -p ${BUILD_DIR}
mkdir -p ${DIST_DIR}

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
yarn install --frozen-lockfile

# Build the plugin
echo -e "${YELLOW}Building the plugin...${NC}"

# Copy plugin manifest and essential files directly to build directory
cp opensearch_dashboards_plugin.json ${BUILD_DIR}/
cp package.json ${BUILD_DIR}/
cp README.md ${BUILD_DIR}/

# Compile TypeScript files
echo -e "${YELLOW}Compiling TypeScript...${NC}"
npx tsc --build

# Copy built files directly to build directory (not in subdirectory)
cp -r public ${BUILD_DIR}/
cp -r server ${BUILD_DIR}/

# Create the zip file with files at root level
echo -e "${YELLOW}Creating distribution zip...${NC}"
cd ${BUILD_DIR}
zip -r ../${DIST_DIR}/${ZIP_NAME} .
cd ..

# Verify the zip file
echo -e "${GREEN}Build completed successfully!${NC}"
echo -e "${GREEN}Distribution zip created: ${DIST_DIR}/${ZIP_NAME}${NC}"

# Display zip contents
echo -e "${YELLOW}Zip contents:${NC}"
unzip -l ${DIST_DIR}/${ZIP_NAME}

# Display installation instructions
echo -e "${GREEN}Installation Instructions:${NC}"
echo "1. Copy the ${ZIP_NAME} file to your OpenSearch Dashboard server"
echo "2. Run: ./bin/opensearch-dashboards-plugin install file:///path/to/${ZIP_NAME} --allow-root"
echo "3. Restart OpenSearch Dashboard"
echo "4. Access the plugin through OpenSearch Dashboard UI"

echo -e "${GREEN}Build process completed successfully!${NC}"