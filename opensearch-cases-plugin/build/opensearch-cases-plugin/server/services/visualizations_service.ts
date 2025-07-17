import { Logger } from '../../../../src/core/server';
import { Visualization } from '../types';

export class VisualizationsService {
  constructor(private opensearchClient: any, private logger: Logger) {}

  async initializeIndices() {
    // Visualizations are typically stored in the .kibana index
    // No need to create additional indices
  }

  async getVisualization(id: string): Promise<Visualization> {
    try {
      const response = await this.opensearchClient.get({
        index: '.kibana',
        id: `visualization:${id}`,
      });

      if (!response.body.found) {
        throw { statusCode: 404, message: 'Visualization not found' };
      }

      const vizData = response.body._source.visualization;
      return {
        id,
        title: vizData.title,
        type: vizData.visState ? JSON.parse(vizData.visState).type : 'unknown',
        query: vizData.kibanaSavedObjectMeta ? JSON.parse(vizData.kibanaSavedObjectMeta.searchSourceJSON) : {},
        config: vizData.visState ? JSON.parse(vizData.visState) : {},
      };
    } catch (error) {
      this.logger.error('Error getting visualization:', error);
      throw error;
    }
  }

  async getVisualizationData(id: string, timeRange?: any): Promise<any> {
    try {
      const visualization = await this.getVisualization(id);
      
      // Build query based on visualization config
      const searchQuery = {
        index: visualization.query.index || '*',
        body: {
          query: visualization.query.query || { match_all: {} },
          aggs: this.buildAggregations(visualization.config),
          size: 0,
        },
      };

      // Add time range if provided
      if (timeRange) {
        searchQuery.body.query = {
          bool: {
            must: [searchQuery.body.query],
            filter: [
              {
                range: {
                  '@timestamp': {
                    gte: timeRange.from,
                    lte: timeRange.to,
                  },
                },
              },
            ],
          },
        };
      }

      const response = await this.opensearchClient.search(searchQuery);
      return this.formatVisualizationData(response.body, visualization.config);
    } catch (error) {
      this.logger.error('Error getting visualization data:', error);
      throw error;
    }
  }

  async searchVisualizations(query: string): Promise<Visualization[]> {
    try {
      const response = await this.opensearchClient.search({
        index: '.kibana',
        body: {
          query: {
            bool: {
              must: [
                { term: { type: 'visualization' } },
                {
                  multi_match: {
                    query,
                    fields: ['visualization.title', 'visualization.description'],
                  },
                },
              ],
            },
          },
          size: 50,
        },
      });

      return response.body.hits.hits.map((hit: any) => {
        const vizData = hit._source.visualization;
        return {
          id: hit._id.replace('visualization:', ''),
          title: vizData.title,
          type: vizData.visState ? JSON.parse(vizData.visState).type : 'unknown',
          query: vizData.kibanaSavedObjectMeta ? JSON.parse(vizData.kibanaSavedObjectMeta.searchSourceJSON) : {},
          config: vizData.visState ? JSON.parse(vizData.visState) : {},
        };
      });
    } catch (error) {
      this.logger.error('Error searching visualizations:', error);
      throw error;
    }
  }

  async createVisualizationSnapshot(id: string, timeRange?: any): Promise<string> {
    try {
      const data = await this.getVisualizationData(id, timeRange);
      
      // Create a snapshot of the visualization data
      const snapshot = {
        id,
        timestamp: new Date().toISOString(),
        timeRange,
        data,
      };

      // Store snapshot in cases index or separate snapshots index
      const snapshotId = `snapshot_${id}_${Date.now()}`;
      await this.opensearchClient.index({
        index: 'visualization_snapshots',
        id: snapshotId,
        body: snapshot,
      });

      return snapshotId;
    } catch (error) {
      this.logger.error('Error creating visualization snapshot:', error);
      throw error;
    }
  }

  private buildAggregations(visConfig: any): any {
    // Build aggregations based on visualization configuration
    const aggs: any = {};
    
    if (visConfig.aggs) {
      visConfig.aggs.forEach((agg: any) => {
        if (agg.type === 'date_histogram') {
          aggs[agg.id] = {
            date_histogram: {
              field: agg.params.field,
              calendar_interval: agg.params.interval,
            },
          };
        } else if (agg.type === 'terms') {
          aggs[agg.id] = {
            terms: {
              field: agg.params.field,
              size: agg.params.size || 10,
            },
          };
        } else if (agg.type === 'avg') {
          aggs[agg.id] = {
            avg: {
              field: agg.params.field,
            },
          };
        } else if (agg.type === 'sum') {
          aggs[agg.id] = {
            sum: {
              field: agg.params.field,
            },
          };
        } else if (agg.type === 'count') {
          aggs[agg.id] = {
            value_count: {
              field: agg.params.field,
            },
          };
        }
      });
    }

    return aggs;
  }

  private formatVisualizationData(responseData: any, visConfig: any): any {
    // Format the data based on visualization type
    if (visConfig.type === 'line' || visConfig.type === 'area') {
      return this.formatTimeSeriesData(responseData);
    } else if (visConfig.type === 'pie') {
      return this.formatPieChartData(responseData);
    } else if (visConfig.type === 'histogram') {
      return this.formatHistogramData(responseData);
    } else if (visConfig.type === 'table') {
      return this.formatTableData(responseData);
    }

    return responseData;
  }

  private formatTimeSeriesData(data: any): any {
    // Format time series data for line/area charts
    const buckets = data.aggregations ? Object.values(data.aggregations)[0] : [];
    return {
      type: 'timeseries',
      data: buckets,
      total: data.hits.total.value,
    };
  }

  private formatPieChartData(data: any): any {
    // Format data for pie charts
    const buckets = data.aggregations ? Object.values(data.aggregations)[0] : [];
    return {
      type: 'pie',
      data: buckets,
      total: data.hits.total.value,
    };
  }

  private formatHistogramData(data: any): any {
    // Format data for histograms
    const buckets = data.aggregations ? Object.values(data.aggregations)[0] : [];
    return {
      type: 'histogram',
      data: buckets,
      total: data.hits.total.value,
    };
  }

  private formatTableData(data: any): any {
    // Format data for tables
    return {
      type: 'table',
      data: data.hits.hits.map((hit: any) => hit._source),
      total: data.hits.total.value,
    };
  }
}