# OpenSearch Cases Plugin

A comprehensive case management system for OpenSearch Dashboard that enables incident response, case tracking, and alert management with integrated visualizations.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Development Setup](#development-setup)
- [Production Deployment](#production-deployment)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## Overview

The OpenSearch Cases Plugin provides a professional case management system that integrates seamlessly with OpenSearch Dashboard. It enables teams to:

- Create and manage cases for incident response
- Link cases to OpenSearch alerts automatically
- Attach files and add comments to cases
- Track SLA metrics and performance
- Generate comprehensive reports and analytics
- Integrate with existing OpenSearch visualizations

## Features

### Core Case Management
- ✅ Full CRUD operations for cases
- ✅ Comment system with user and system comments
- ✅ File attachment management
- ✅ Case status tracking (Open, In Progress, Closed)
- ✅ Priority levels (Low, Medium, High, Critical)
- ✅ Case assignment and tagging

### Alert Integration
- ✅ Auto-create cases from OpenSearch alerts
- ✅ Link existing alerts to cases
- ✅ Alert acknowledgment and completion
- ✅ Alert severity mapping

### Analytics & Reporting
- ✅ Case statistics and metrics
- ✅ SLA tracking and compliance
- ✅ Performance analytics
- ✅ Time-series reporting
- ✅ Priority-based analytics

### Advanced Features
- ✅ OpenSearch query integration
- ✅ Visualization embedding
- ✅ Advanced search and filtering
- ✅ Bulk operations
- ✅ Audit logging

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 OpenSearch Dashboard                         │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Cases Plugin UI                            │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐   │ │
│  │  │ Cases       │ │   Alerts    │ │  Visualizations │   │ │
│  │  │ Dashboard   │ │ Management  │ │   Integration   │   │ │
│  │  └─────────────┘ └─────────────┘ └─────────────────┘   │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ REST API
                              │
┌─────────────────────────────────────────────────────────────┐
│                 Plugin Server                               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │   Cases     │ │   Alerts    │ │   Visualizations    │   │
│  │   Service   │ │   Service   │ │      Service        │   │
│  └─────────────┘ └─────────────┘ └─────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │
┌─────────────────────────────────────────────────────────────┐
│                   OpenSearch Cluster                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │   Cases     │ │  Comments   │ │       Files         │   │
│  │   Index     │ │    Index    │ │       Index         │   │
│  └─────────────┘ └─────────────┘ └─────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

### System Requirements
- **OpenSearch**: 2.8.0 or later
- **OpenSearch Dashboard**: 2.8.0 or later
- **Node.js**: 18.x or later
- **npm/yarn**: Latest version
- **Java**: 11 or later (for OpenSearch)

### OpenSearch Configuration
Ensure your OpenSearch cluster has the following plugins installed:
- `opensearch-alerting` (for alert integration)
- `opensearch-security` (for authentication)

### System Resources
- **Memory**: Minimum 4GB RAM (8GB recommended)
- **Storage**: Minimum 10GB free space
- **Network**: Accessible network connectivity between components

## Installation

### Option 1: Pre-built Plugin Installation

1. **Download the plugin archive**:
   ```bash
   # Replace with actual release URL
   wget https://github.com/your-org/opensearch-cases-plugin/releases/latest/opensearch-cases-plugin-2.8.0.zip
   ```

2. **Install the plugin**:
   ```bash
   # Navigate to your OpenSearch Dashboard installation
   cd /usr/share/opensearch-dashboards

   # Install the plugin
   bin/opensearch-dashboards-plugin install file:///path/to/opensearch-cases-plugin-2.8.0.zip
   ```

3. **Restart OpenSearch Dashboard**:
   ```bash
   sudo systemctl restart opensearch-dashboards
   ```

### Option 2: Development Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-org/opensearch-cases-plugin.git
   cd opensearch-cases-plugin
   ```

2. **Install dependencies**:
   ```bash
   cd opensearch-cases-plugin
   npm install
   ```

3. **Build the plugin**:
   ```bash
   npm run build
   ```

4. **Install in OpenSearch Dashboard**:
   ```bash
   # Create symbolic link for development
   ln -s /path/to/opensearch-cases-plugin /usr/share/opensearch-dashboards/plugins/opensearch-cases-plugin
   ```

5. **Restart OpenSearch Dashboard**:
   ```bash
   sudo systemctl restart opensearch-dashboards
   ```

## Development Setup

### 1. Environment Setup

```bash
# Clone the repository
git clone https://github.com/your-org/opensearch-cases-plugin.git
cd opensearch-cases-plugin

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
```

### 2. OpenSearch Dashboard Development

```bash
# Clone OpenSearch Dashboard (if not already available)
git clone https://github.com/opensearch-project/OpenSearch-Dashboards.git
cd OpenSearch-Dashboards

# Switch to compatible version
git checkout 2.8.0

# Install dependencies
npm install

# Bootstrap the project
npm run bootstrap

# Link the plugin
cd plugins
ln -s /path/to/opensearch-cases-plugin opensearch-cases-plugin
```

### 3. Start Development Environment

```bash
# Terminal 1: Start OpenSearch
cd /path/to/opensearch
./bin/opensearch

# Terminal 2: Start OpenSearch Dashboard with plugin
cd /path/to/OpenSearch-Dashboards
npm start
```

### 4. Development Commands

```bash
# Build plugin
npm run build

# Run tests
npm test

# Run linting
npm run lint

# Watch for changes
npm run watch

# Type checking
npm run type-check
```

## Production Deployment

### 1. OpenSearch Cluster Setup

```bash
# Install OpenSearch
wget https://artifacts.opensearch.org/releases/bundle/opensearch/2.8.0/opensearch-2.8.0-linux-x64.tar.gz
tar -zxf opensearch-2.8.0-linux-x64.tar.gz
cd opensearch-2.8.0

# Configure opensearch.yml
vim config/opensearch.yml
```

**opensearch.yml configuration**:
```yaml
cluster.name: opensearch-cases-cluster
node.name: opensearch-cases-node
path.data: /var/lib/opensearch
path.logs: /var/log/opensearch
network.host: 0.0.0.0
http.port: 9200
discovery.type: single-node

# Security configuration
plugins.security.ssl.transport.enforce_hostname_verification: false
plugins.security.ssl.http.enabled: true
plugins.security.ssl.http.pemcert_filepath: certs/opensearch.pem
plugins.security.ssl.http.pemkey_filepath: certs/opensearch-key.pem
plugins.security.ssl.http.pemtrustedcas_filepath: certs/root-ca.pem

# Cases plugin configuration
opensearch_cases.enabled: true
opensearch_cases.maxFileSize: 10485760
opensearch_cases.allowedFileTypes: ["image/jpeg", "image/png", "image/gif", "text/plain", "application/pdf"]
opensearch_cases.alerting.enabled: true
opensearch_cases.alerting.autoCreateCases: false
```

### 2. OpenSearch Dashboard Setup

```bash
# Install OpenSearch Dashboard
wget https://artifacts.opensearch.org/releases/bundle/opensearch-dashboards/2.8.0/opensearch-dashboards-2.8.0-linux-x64.tar.gz
tar -zxf opensearch-dashboards-2.8.0-linux-x64.tar.gz
cd opensearch-dashboards-2.8.0

# Configure opensearch_dashboards.yml
vim config/opensearch_dashboards.yml
```

**opensearch_dashboards.yml configuration**:
```yaml
server.port: 5601
server.host: 0.0.0.0
opensearch.hosts: ["https://localhost:9200"]
opensearch.ssl.verificationMode: none
opensearch.username: admin
opensearch.password: admin

# Cases plugin configuration
opensearch_cases.enabled: true
opensearch_cases.alerting.enabled: true
```

### 3. Plugin Installation

```bash
# Install the plugin
cd /path/to/opensearch-dashboards
bin/opensearch-dashboards-plugin install https://github.com/your-org/opensearch-cases-plugin/releases/latest/download/opensearch-cases-plugin-2.8.0.zip

# Verify installation
bin/opensearch-dashboards-plugin list
```

### 4. Service Configuration

**systemd service for OpenSearch** (`/etc/systemd/system/opensearch.service`):
```ini
[Unit]
Description=OpenSearch
Documentation=https://opensearch.org
Wants=network-online.target
After=network-online.target

[Service]
Type=notify
RuntimeDirectory=opensearch
PrivateTmp=true
Environment=OPENSEARCH_HOME=/usr/share/opensearch
Environment=OPENSEARCH_PATH_CONF=/etc/opensearch
ExecStart=/usr/share/opensearch/bin/opensearch
ExecReload=/bin/kill -HUP $MAINPID
User=opensearch
Group=opensearch
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

**systemd service for OpenSearch Dashboard** (`/etc/systemd/system/opensearch-dashboards.service`):
```ini
[Unit]
Description=OpenSearch Dashboard
Documentation=https://opensearch.org
Requires=opensearch.service
After=opensearch.service

[Service]
Type=simple
Environment=OPENSEARCH_DASHBOARDS_HOME=/usr/share/opensearch-dashboards
ExecStart=/usr/share/opensearch-dashboards/bin/opensearch-dashboards
ExecReload=/bin/kill -HUP $MAINPID
User=opensearch-dashboards
Group=opensearch-dashboards
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### 5. Start Services

```bash
# Enable and start services
sudo systemctl enable opensearch
sudo systemctl enable opensearch-dashboards

sudo systemctl start opensearch
sudo systemctl start opensearch-dashboards

# Check status
sudo systemctl status opensearch
sudo systemctl status opensearch-dashboards
```

## Configuration

### Plugin Configuration

The plugin can be configured through the OpenSearch Dashboard configuration file:

```yaml
# opensearch_dashboards.yml
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
  sla:
    critical: 14400000  # 4 hours in milliseconds
    high: 86400000      # 24 hours in milliseconds
    medium: 259200000   # 72 hours in milliseconds
    low: 604800000      # 1 week in milliseconds
```

### Index Templates

The plugin automatically creates the following indices:
- `cases` - Store case information
- `comments` - Store case comments
- `files` - Store file attachments
- `alerts` - Store alert information
- `case_visualizations` - Store case-specific visualizations

### Security Configuration

```yaml
# roles.yml
cases_admin:
  reserved: false
  cluster_permissions:
    - cluster:admin/opensearch/cases/*
  index_permissions:
    - index_patterns:
        - "cases*"
        - "comments*"
        - "files*"
        - "alerts*"
      allowed_actions:
        - indices:data/read/*
        - indices:data/write/*
        - indices:admin/create
        - indices:admin/delete

cases_user:
  reserved: false
  cluster_permissions:
    - cluster:admin/opensearch/cases/read
    - cluster:admin/opensearch/cases/write
  index_permissions:
    - index_patterns:
        - "cases*"
        - "comments*"
        - "files*"
      allowed_actions:
        - indices:data/read/*
        - indices:data/write/*
```

## Usage

### Accessing the Plugin

1. **Open OpenSearch Dashboard** in your browser: `https://your-domain:5601`
2. **Login** with your credentials
3. **Navigate** to the Cases application from the main menu
4. **Start creating cases** and managing your incidents

### Creating Your First Case

1. Click **"Create Case"** button
2. Fill in the case details:
   - **Title**: Brief description of the issue
   - **Description**: Detailed information
   - **Priority**: Select appropriate priority level
   - **Tags**: Add relevant tags for categorization
   - **Assigned To**: Select team member
3. Click **"Create Case"** to save

### Managing Cases

- **View Cases**: Browse all cases in the dashboard
- **Filter Cases**: Use filters to find specific cases
- **Update Cases**: Edit case details and change status
- **Add Comments**: Collaborate with team members
- **Attach Files**: Upload relevant documents
- **Link Alerts**: Connect cases to OpenSearch alerts

### Alert Integration

1. **Configure Alerting**: Set up OpenSearch alerting monitors
2. **Auto-create Cases**: Enable automatic case creation from alerts
3. **Manual Linking**: Link existing alerts to cases
4. **Track Resolution**: Monitor alert resolution through cases

## API Reference

### Cases API

#### Create Case
```http
POST /api/cases
Content-Type: application/json

{
  "title": "Database Performance Issue",
  "description": "Slow query performance on user table",
  "priority": "high",
  "tags": ["database", "performance"],
  "created_by": "admin",
  "created_by_name": "Administrator"
}
```

#### Get Cases
```http
GET /api/cases?status=open&priority=high&limit=50&offset=0
```

#### Update Case
```http
PUT /api/cases/{id}
Content-Type: application/json

{
  "status": "in_progress",
  "assigned_to": "user123",
  "assigned_to_name": "John Doe"
}
```

### Comments API

#### Add Comment
```http
POST /api/cases/{case_id}/comments
Content-Type: application/json

{
  "content": "Investigating the issue...",
  "author": "admin",
  "author_name": "Administrator"
}
```

#### Get Comments
```http
GET /api/cases/{case_id}/comments
```

### Files API

#### Upload File
```http
POST /api/cases/{case_id}/files
Content-Type: multipart/form-data

file: [binary data]
uploaded_by: admin
```

#### Download File
```http
GET /api/files/{file_id}/download
```

### Alerts API

#### Create Alert
```http
POST /api/alerts
Content-Type: application/json

{
  "title": "High CPU Usage",
  "description": "CPU usage above 90%",
  "severity": "high",
  "monitor_id": "monitor123",
  "trigger_id": "trigger456"
}
```

#### Acknowledge Alert
```http
PUT /api/alerts/{alert_id}/acknowledge
```

#### Create Case from Alert
```http
POST /api/alerts/{alert_id}/create-case
Content-Type: application/json

{
  "title": "Case for High CPU Alert",
  "created_by": "admin",
  "created_by_name": "Administrator"
}
```

### Statistics API

#### Get Statistics
```http
GET /api/stats
```

#### Get SLA Metrics
```http
GET /api/stats/sla?time_range=7d
```

## Troubleshooting

### Common Issues

#### Plugin Not Loading

**Symptom**: Plugin doesn't appear in OpenSearch Dashboard

**Solution**:
1. Check plugin installation:
   ```bash
   bin/opensearch-dashboards-plugin list
   ```
2. Verify plugin compatibility with OpenSearch Dashboard version
3. Check logs for errors:
   ```bash
   tail -f /var/log/opensearch-dashboards/opensearch-dashboards.log
   ```

#### Permission Errors

**Symptom**: "Access denied" or "Insufficient permissions"

**Solution**:
1. Check user roles and permissions
2. Verify security configuration
3. Review index permissions

#### Index Creation Issues

**Symptom**: "Index not found" or "Mapping error"

**Solution**:
1. Check OpenSearch cluster health
2. Verify index templates
3. Manually create indices if needed:
   ```bash
   curl -X PUT "localhost:9200/cases" -H 'Content-Type: application/json' -d'
   {
     "mappings": {
       "properties": {
         "id": {"type": "keyword"},
         "title": {"type": "text"},
         "description": {"type": "text"},
         "status": {"type": "keyword"},
         "priority": {"type": "keyword"},
         "created_at": {"type": "date"}
       }
     }
   }'
   ```

### Performance Optimization

#### Index Optimization

```bash
# Set refresh interval for better write performance
curl -X PUT "localhost:9200/cases/_settings" -H 'Content-Type: application/json' -d'
{
  "index": {
    "refresh_interval": "30s"
  }
}'

# Configure replicas based on cluster size
curl -X PUT "localhost:9200/cases/_settings" -H 'Content-Type: application/json' -d'
{
  "index": {
    "number_of_replicas": 1
  }
}'
```

#### Memory Configuration

```yaml
# opensearch.yml
indices.memory.index_buffer_size: 30%
indices.memory.min_index_buffer_size: 96mb
```

### Debugging

#### Enable Debug Logging

```yaml
# opensearch_dashboards.yml
logging.verbose: true
logging.dest: /var/log/opensearch-dashboards/debug.log
```

#### Check Plugin Health

```bash
# Check plugin status
curl -X GET "localhost:9200/_cat/plugins"

# Check indices
curl -X GET "localhost:9200/_cat/indices/cases*"

# Check cluster health
curl -X GET "localhost:9200/_cluster/health"
```

## Contributing

### Development Guidelines

1. **Code Style**: Follow the existing code style and use ESLint
2. **Testing**: Write unit tests for new features
3. **Documentation**: Update documentation for any changes
4. **Commit Messages**: Use conventional commit format

### Setting Up Development Environment

```bash
# Fork the repository
git clone https://github.com/your-username/opensearch-cases-plugin.git
cd opensearch-cases-plugin

# Create a feature branch
git checkout -b feature/new-feature

# Make your changes
# ...

# Run tests
npm test

# Create pull request
git push origin feature/new-feature
```

### Testing

```bash
# Run unit tests
npm run test

# Run integration tests
npm run test:integration

# Run end-to-end tests
npm run test:e2e

# Generate coverage report
npm run test:coverage
```

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- **Issues**: GitHub Issues
- **Documentation**: [Plugin Documentation](https://github.com/your-org/opensearch-cases-plugin/docs)
- **Community**: OpenSearch Community Forum

---

**Version**: 2.8.0  
**Last Updated**: 2025-01-27  
**Compatibility**: OpenSearch 2.8.0+, OpenSearch Dashboard 2.8.0+
