import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../types/opensearch';
import { Alert, AlertCreateRequest } from '../types';

export class AlertsService {
  private readonly ALERTS_INDEX = 'alerts';

  constructor(private opensearchClient: any, private logger: Logger) {}

  async initializeIndices() {
    const alertsMapping = {
      mappings: {
        properties: {
          id: { type: 'keyword' },
          title: { type: 'text', analyzer: 'standard' },
          description: { type: 'text', analyzer: 'standard' },
          severity: { type: 'keyword' },
          status: { type: 'keyword' },
          monitor_id: { type: 'keyword' },
          trigger_id: { type: 'keyword' },
          created_at: { type: 'date' },
          updated_at: { type: 'date' },
          acknowledged_at: { type: 'date' },
          completed_at: { type: 'date' },
          case_id: { type: 'keyword' },
          opensearch_query: { type: 'object' },
          visualization_id: { type: 'keyword' },
        },
      },
    };

    await this.createIndexIfNotExists(this.ALERTS_INDEX, alertsMapping);
  }

  private async createIndexIfNotExists(index: string, mapping: any) {
    try {
      const exists = await this.opensearchClient.indices.exists({ index });
      if (!exists.body) {
        await this.opensearchClient.indices.create({ index, body: mapping });
        this.logger.info(`Created index: ${index}`);
      }
    } catch (error) {
      this.logger.error(`Error creating index ${index}:`, error);
      throw error;
    }
  }

  async createAlert(alertData: AlertCreateRequest): Promise<Alert> {
    const now = new Date().toISOString();
    const alertObj: Alert = {
      id: uuidv4(),
      title: alertData.title,
      description: alertData.description,
      severity: alertData.severity,
      status: 'active',
      monitor_id: alertData.monitor_id,
      trigger_id: alertData.trigger_id,
      created_at: now,
      updated_at: now,
      opensearch_query: alertData.opensearch_query,
      visualization_id: alertData.visualization_id,
    };

    try {
      await this.opensearchClient.index({
        index: this.ALERTS_INDEX,
        id: alertObj.id,
        body: alertObj,
      });

      return alertObj;
    } catch (error) {
      this.logger.error('Error creating alert:', error);
      throw error;
    }
  }

  async getAlerts(query: any): Promise<Alert[]> {
    try {
      const searchQuery: any = {
        query: { match_all: {} },
        sort: [{ created_at: { order: 'desc' } }],
        from: query.offset || 0,
        size: query.limit || 50,
      };

      // Build filters
      const filters = [];
      if (query.status) filters.push({ term: { status: query.status } });
      if (query.severity) filters.push({ term: { severity: query.severity } });
      if (query.monitor_id) filters.push({ term: { monitor_id: query.monitor_id } });

      if (filters.length > 0) {
        searchQuery.query = { bool: { must: filters } };
      }

      const response = await this.opensearchClient.search({
        index: this.ALERTS_INDEX,
        body: searchQuery,
      });

      return response.body.hits.hits.map((hit: any) => hit._source);
    } catch (error) {
      this.logger.error('Error getting alerts:', error);
      throw error;
    }
  }

  async getAlertById(id: string): Promise<Alert> {
    try {
      const response = await this.opensearchClient.search({
        index: this.ALERTS_INDEX,
        body: {
          query: { term: { id } },
        },
      });

      if (response.body.hits.total.value === 0) {
        throw { statusCode: 404, message: 'Alert not found' };
      }

      return response.body.hits.hits[0]._source;
    } catch (error) {
      this.logger.error('Error getting alert by ID:', error);
      throw error;
    }
  }

  async updateAlert(id: string, updates: any): Promise<Alert> {
    try {
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      if (updates.status === 'acknowledged') {
        updateData.acknowledged_at = new Date().toISOString();
      }

      if (updates.status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      await this.opensearchClient.update({
        index: this.ALERTS_INDEX,
        id,
        body: { doc: updateData },
      });

      return await this.getAlertById(id);
    } catch (error) {
      this.logger.error('Error updating alert:', error);
      throw error;
    }
  }

  async linkAlertToCase(alertId: string, caseId: string): Promise<void> {
    try {
      await this.opensearchClient.update({
        index: this.ALERTS_INDEX,
        id: alertId,
        body: {
          doc: {
            case_id: caseId,
            updated_at: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      this.logger.error('Error linking alert to case:', error);
      throw error;
    }
  }

  async getAlertsByMonitor(monitorId: string): Promise<Alert[]> {
    try {
      const response = await this.opensearchClient.search({
        index: this.ALERTS_INDEX,
        body: {
          query: { term: { monitor_id: monitorId } },
          sort: [{ created_at: { order: 'desc' } }],
          size: 100,
        },
      });

      return response.body.hits.hits.map((hit: any) => hit._source);
    } catch (error) {
      this.logger.error('Error getting alerts by monitor:', error);
      throw error;
    }
  }

  async processAlertingWebhook(alertData: any): Promise<Alert> {
    // Process incoming webhook from OpenSearch Alerting
    const processedAlert: AlertCreateRequest = {
      title: alertData.monitor_name || 'Alert',
      description: alertData.message || 'Alert triggered',
      severity: this.mapSeverity(alertData.severity),
      monitor_id: alertData.monitor_id,
      trigger_id: alertData.trigger_id,
      opensearch_query: alertData.query,
      visualization_id: alertData.visualization_id,
    };

    return await this.createAlert(processedAlert);
  }

  private mapSeverity(severity: any): 'low' | 'medium' | 'high' | 'critical' {
    if (typeof severity === 'string') {
      const lowerSeverity = severity.toLowerCase();
      if (['low', 'medium', 'high', 'critical'].includes(lowerSeverity)) {
        return lowerSeverity as 'low' | 'medium' | 'high' | 'critical';
      }
    }
    return 'medium'; // default
  }
}