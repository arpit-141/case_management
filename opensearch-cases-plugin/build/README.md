# OpenSearch Cases Plugin

A comprehensive case management plugin for OpenSearch Dashboard that enables incident response and case tracking capabilities.

## Version Compatibility

- **OpenSearch Dashboard**: 2.19.1
- **OpenSearch**: 2.19.1
- **Node.js**: 18.x
- **Yarn**: Latest stable version

## Features

- **Case Management**: Create, update, and track incident cases
- **Alerts Integration**: Automatic case creation from alerts
- **Visualizations**: Embedded charts and data visualization
- **Dashboard Integration**: Native OpenSearch Dashboard integration
- **Management Interface**: Administrative controls and settings

## Installation

### Option 1: Use Pre-built Package (Recommended)

1. Download the latest release zip file: `opensearch-cases-plugin-2.19.1.zip`
2. Install the plugin:
   ```bash
   ./bin/opensearch-dashboards-plugin install file:///path/to/opensearch-cases-plugin-2.19.1.zip
   ```
3. Restart OpenSearch Dashboard:
   ```bash
   systemctl restart opensearch-dashboards
   ```

### Option 2: Build from Source

#### Prerequisites

- Node.js 18.x
- Yarn package manager
- OpenSearch Dashboard 2.19.1 development environment

#### Manual Build Steps

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd opensearch-cases-plugin
   ```

2. **Install dependencies**:
   ```bash
   yarn install
   ```

3. **Build the plugin**:
   ```bash
   yarn build
   ```

4. **Create distribution package**:
   ```bash
   ./build.sh
   ```

5. **Install the generated package**:
   ```bash
   ./bin/opensearch-dashboards-plugin install file:///path/to/dist/opensearch-cases-plugin-2.19.1.zip
   ```

#### Automated Build Process

Use the provided build script for automated building and packaging:

```bash
./build.sh
```

This script will:
- Clean previous builds
- Install dependencies
- Compile TypeScript sources
- Create the plugin structure
- Generate the distributable zip file
- Display installation instructions

## Development

### Project Structure

```
opensearch-cases-plugin/
├── public/                 # Frontend components
│   ├── components/         # React components
│   ├── context/           # React context providers
│   ├── application.tsx    # Main application entry
│   ├── management.tsx     # Management interface
│   ├── plugin.ts          # Plugin definition
│   └── index.ts           # Public entry point
├── server/                # Backend services
│   ├── routes/            # API routes
│   ├── services/          # Business logic services
│   ├── plugin.ts          # Server plugin setup
│   ├── types.ts           # TypeScript type definitions
│   └── index.ts           # Server entry point
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── webpack.config.js      # Webpack build configuration
├── opensearch_dashboards_plugin.json  # Plugin manifest
└── build.sh               # Build script
```

### Development Commands

```bash
# Install dependencies
yarn install

# Start development server
yarn dev

# Build for production
yarn build

# Run tests
yarn test

# Run linting
yarn lint

# Fix linting issues
yarn lint:fix

# Create distribution package
yarn package

# Clean build artifacts
yarn clean
```

### Environment Setup

1. **Set up OpenSearch Dashboard development environment**:
   ```bash
   git clone https://github.com/opensearch-project/OpenSearch-Dashboards.git
   cd OpenSearch-Dashboards
   git checkout 2.19.1
   yarn osd bootstrap
   ```

2. **Link the plugin**:
   ```bash
   cd plugins
   ln -s /path/to/opensearch-cases-plugin opensearch-cases-plugin
   ```

3. **Start development server**:
   ```bash
   yarn start
   ```

## Configuration

The plugin supports the following configuration options in `opensearch_dashboards.yml`:

```yaml
opensearch_cases:
  enabled: true
  maxFileSize: 10485760  # 10MB
  allowedFileTypes:
    - "image/jpeg"
    - "image/png"
    - "image/gif"
    - "text/plain"
    - "application/pdf"
    - "application/json"
  alerting:
    enabled: true
    autoCreateCases: false
```

## API Endpoints

### Cases API

- `GET /api/cases` - List all cases
- `POST /api/cases` - Create a new case
- `GET /api/cases/{id}` - Get a specific case
- `PUT /api/cases/{id}` - Update a case
- `DELETE /api/cases/{id}` - Delete a case

### Alerts API

- `GET /api/alerts` - List all alerts
- `POST /api/alerts/{id}/create-case` - Create case from alert

### Visualizations API

- `GET /api/visualizations` - List available visualizations
- `POST /api/visualizations/embed` - Embed visualization in case

## Troubleshooting

### Common Issues

1. **Plugin installation fails**:
   - Ensure OpenSearch Dashboard version matches plugin version (2.19.1)
   - Check file permissions on the zip file
   - Verify OpenSearch Dashboard is not running during installation

2. **Build errors**:
   - Ensure Node.js version is 18.x
   - Clear node_modules and reinstall: `rm -rf node_modules && yarn install`
   - Check TypeScript compilation: `npx tsc --noEmit`

3. **Runtime errors**:
   - Check OpenSearch Dashboard logs: `tail -f /var/log/opensearch-dashboards/opensearch-dashboards.log`
   - Verify OpenSearch connection is working
   - Check plugin configuration in `opensearch_dashboards.yml`

### Debug Mode

Enable debug logging by adding to `opensearch_dashboards.yml`:

```yaml
logging:
  loggers:
    - name: opensearch_cases
      level: debug
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

This project is licensed under the Apache-2.0 License - see the LICENSE file for details.

## Support

For issues and support:
- Create an issue in the GitHub repository
- Check the OpenSearch community forums
- Review the OpenSearch Dashboard plugin documentation

## Changelog

### Version 2.19.1
- Updated for OpenSearch Dashboard 2.19.1 compatibility
- Migrated from Elastic UI to OpenSearch UI components
- Updated React to version 18.x
- Added automated build process
- Improved TypeScript configuration
- Enhanced plugin manifest structure