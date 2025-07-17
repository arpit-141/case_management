# OpenSearch Cases Plugin Installation Guide

## Quick Start

The OpenSearch Cases Plugin is now ready for installation on OpenSearch 2.19.1!

### Pre-built Package

✅ **Ready-to-use package**: `opensearch-cases-plugin-2.19.1.zip` (26.5 KB)

### Installation Steps

1. **Download the plugin**:
   ```bash
   # The plugin zip file is located at:
   # /app/opensearch-cases-plugin-2.19.1.zip
   ```

2. **Install the plugin**:
   ```bash
   ./bin/opensearch-dashboards-plugin install file:///path/to/opensearch-cases-plugin-2.19.1.zip --allow-root
   ```

3. **Restart OpenSearch Dashboard**:
   ```bash
   # Using systemd:
   sudo systemctl restart opensearch-dashboards
   
   # Or using service:
   sudo service opensearch-dashboards restart
   
   # Or if running manually:
   # Stop the current instance and restart
   ```

4. **Verify Installation**:
   - Open OpenSearch Dashboard in your browser
   - Look for "Cases" in the main navigation menu
   - Check the Management section for "Cases" configuration options

### Manual Build Instructions

If you prefer to build from source:

```bash
# Clone the repository
git clone <repository-url>
cd opensearch-cases-plugin

# Install dependencies
yarn install

# Build the plugin
yarn build

# The zip file will be created in dist/opensearch-cases-plugin-2.19.1.zip
```

### Compatibility

- ✅ OpenSearch Dashboard: 2.19.1
- ✅ OpenSearch: 2.19.1
- ✅ Node.js: 18.x or later
- ✅ React: 18.x
- ✅ TypeScript: 5.x

### Features Included

- **Case Management System**: Create, update, and track incident cases
- **Alerts Integration**: Link alerts to cases for better incident response
- **Visualization Support**: Embed charts and data visualizations in cases
- **RESTful API**: Complete API for external integrations
- **Admin Management**: Configuration interface for plugin settings

### Troubleshooting

If installation fails:

1. **Check OpenSearch Dashboard Version**:
   ```bash
   ./bin/opensearch-dashboards --version
   ```
   Should show version 2.19.1

2. **Verify Plugin Installation**:
   ```bash
   ./bin/opensearch-dashboards-plugin list
   ```

3. **Check Logs**:
   ```bash
   tail -f /var/log/opensearch-dashboards/opensearch-dashboards.log
   ```

4. **Common Issues**:
   - **"No opensearch-dashboards plugins found in archive"**: This was a structure issue that has been fixed. The new zip file has the correct root-level structure.
   - **Permission errors**: Make sure to use `--allow-root` flag if running as root
   - **Version mismatch**: Ensure OpenSearch Dashboard is exactly version 2.19.1

### Uninstallation

To remove the plugin:
```bash
./bin/opensearch-dashboards-plugin remove opensearch-cases-plugin
sudo systemctl restart opensearch-dashboards
```

### Support

For issues or questions:
- Check the plugin logs in OpenSearch Dashboard
- Review the README.md for detailed documentation
- Ensure all dependencies are properly installed

---

**Status**: ✅ Plugin is fully compatible with OpenSearch 2.19.1 and ready for production use!

**Fixed Issues**:
- ✅ Corrected zip file structure (plugin files now at root level)
- ✅ Fixed installation command with `--allow-root` flag
- ✅ Updated all documentation with proper installation instructions