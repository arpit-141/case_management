import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../../../../src/core/server';
import { Case, CaseCreateRequest, CaseUpdateRequest, Comment, FileAttachment, CommentCreateRequest } from '../types';

export class CasesService {
  private readonly CASES_INDEX = 'cases';
  private readonly COMMENTS_INDEX = 'comments';
  private readonly FILES_INDEX = 'files';

  constructor(private opensearchClient: any, private logger: Logger) {}

  async initializeIndices() {
    const casesMapping = {
      mappings: {
        properties: {
          id: { type: 'keyword' },
          title: { type: 'text', analyzer: 'standard' },
          description: { type: 'text', analyzer: 'standard' },
          status: { type: 'keyword' },
          priority: { type: 'keyword' },
          tags: { type: 'keyword' },
          assigned_to: { type: 'keyword' },
          assigned_to_name: { type: 'text' },
          created_by: { type: 'keyword' },
          created_by_name: { type: 'text' },
          created_at: { type: 'date' },
          updated_at: { type: 'date' },
          closed_at: { type: 'date' },
          comments_count: { type: 'integer' },
          attachments_count: { type: 'integer' },
          alert_id: { type: 'keyword' },
          opensearch_query: { type: 'object' },
          visualization_ids: { type: 'keyword' },
        },
      },
    };

    const commentsMapping = {
      mappings: {
        properties: {
          id: { type: 'keyword' },
          case_id: { type: 'keyword' },
          author: { type: 'keyword' },
          author_name: { type: 'text' },
          content: { type: 'text', analyzer: 'standard' },
          comment_type: { type: 'keyword' },
          created_at: { type: 'date' },
          updated_at: { type: 'date' },
        },
      },
    };

    const filesMapping = {
      mappings: {
        properties: {
          id: { type: 'keyword' },
          filename: { type: 'keyword' },
          original_filename: { type: 'text' },
          file_size: { type: 'integer' },
          mime_type: { type: 'keyword' },
          uploaded_by: { type: 'keyword' },
          uploaded_at: { type: 'date' },
          case_id: { type: 'keyword' },
          file_data: { type: 'binary' },
        },
      },
    };

    await this.createIndexIfNotExists(this.CASES_INDEX, casesMapping);
    await this.createIndexIfNotExists(this.COMMENTS_INDEX, commentsMapping);
    await this.createIndexIfNotExists(this.FILES_INDEX, filesMapping);
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

  async createCase(caseData: CaseCreateRequest): Promise<Case> {
    const now = new Date().toISOString();
    const caseObj: Case = {
      id: uuidv4(),
      title: caseData.title,
      description: caseData.description,
      status: 'open',
      priority: caseData.priority || 'medium',
      tags: caseData.tags || [],
      assigned_to: caseData.assigned_to,
      assigned_to_name: caseData.assigned_to_name,
      created_by: caseData.created_by,
      created_by_name: caseData.created_by_name,
      created_at: now,
      updated_at: now,
      comments_count: 0,
      attachments_count: 0,
      alert_id: caseData.alert_id,
      opensearch_query: caseData.opensearch_query,
      visualization_ids: caseData.visualization_ids || [],
    };

    try {
      await this.opensearchClient.index({
        index: this.CASES_INDEX,
        id: caseObj.id,
        body: caseObj,
      });

      // Create system comment
      const systemComment: Comment = {
        id: uuidv4(),
        case_id: caseObj.id,
        author: 'system',
        author_name: 'System',
        content: `Case created by ${caseObj.created_by_name}`,
        comment_type: 'system',
        created_at: now,
      };

      await this.opensearchClient.index({
        index: this.COMMENTS_INDEX,
        id: systemComment.id,
        body: systemComment,
      });

      await this.updateCaseCounts(caseObj.id);
      return caseObj;
    } catch (error) {
      this.logger.error('Error creating case:', error);
      throw error;
    }
  }

  async getCases(query: any): Promise<Case[]> {
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
      if (query.priority) filters.push({ term: { priority: query.priority } });
      if (query.assigned_to) filters.push({ term: { assigned_to: query.assigned_to } });
      if (query.created_by) filters.push({ term: { created_by: query.created_by } });
      if (query.search) {
        filters.push({
          multi_match: {
            query: query.search,
            fields: ['title', 'description', 'tags'],
          },
        });
      }

      if (filters.length > 0) {
        searchQuery.query = { bool: { must: filters } };
      }

      const response = await this.opensearchClient.search({
        index: this.CASES_INDEX,
        body: searchQuery,
      });

      return response.body.hits.hits.map((hit: any) => hit._source);
    } catch (error) {
      this.logger.error('Error getting cases:', error);
      throw error;
    }
  }

  async getCaseById(id: string): Promise<Case> {
    try {
      const response = await this.opensearchClient.search({
        index: this.CASES_INDEX,
        body: {
          query: { term: { id } },
        },
      });

      if (response.body.hits.total.value === 0) {
        throw { statusCode: 404, message: 'Case not found' };
      }

      return response.body.hits.hits[0]._source;
    } catch (error) {
      this.logger.error('Error getting case by ID:', error);
      throw error;
    }
  }

  async updateCase(id: string, updates: CaseUpdateRequest): Promise<Case> {
    try {
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      if (updates.status === 'closed') {
        updateData.closed_at = new Date().toISOString();
      }

      await this.opensearchClient.update({
        index: this.CASES_INDEX,
        id,
        body: { doc: updateData },
      });

      // Create system comment for status change
      if (updates.status) {
        const systemComment: Comment = {
          id: uuidv4(),
          case_id: id,
          author: 'system',
          author_name: 'System',
          content: `Case status changed to ${updates.status}`,
          comment_type: 'system',
          created_at: new Date().toISOString(),
        };

        await this.opensearchClient.index({
          index: this.COMMENTS_INDEX,
          id: systemComment.id,
          body: systemComment,
        });

        await this.updateCaseCounts(id);
      }

      return await this.getCaseById(id);
    } catch (error) {
      this.logger.error('Error updating case:', error);
      throw error;
    }
  }

  async deleteCase(id: string): Promise<void> {
    try {
      // Delete associated comments
      await this.opensearchClient.deleteByQuery({
        index: this.COMMENTS_INDEX,
        body: {
          query: { term: { case_id: id } },
        },
      });

      // Delete associated files
      await this.opensearchClient.deleteByQuery({
        index: this.FILES_INDEX,
        body: {
          query: { term: { case_id: id } },
        },
      });

      // Delete case
      await this.opensearchClient.delete({
        index: this.CASES_INDEX,
        id,
      });
    } catch (error) {
      this.logger.error('Error deleting case:', error);
      throw error;
    }
  }

  // Comment management methods
  async createComment(caseId: string, commentData: CommentCreateRequest): Promise<Comment> {
    // Verify case exists
    await this.getCaseById(caseId);

    const now = new Date().toISOString();
    const comment: Comment = {
      id: uuidv4(),
      case_id: caseId,
      author: commentData.author,
      author_name: commentData.author_name,
      content: commentData.content,
      comment_type: commentData.comment_type || 'user',
      created_at: now,
    };

    try {
      await this.opensearchClient.index({
        index: this.COMMENTS_INDEX,
        id: comment.id,
        body: comment,
      });

      await this.updateCaseCounts(caseId);
      return comment;
    } catch (error) {
      this.logger.error('Error creating comment:', error);
      throw error;
    }
  }

  async getCaseComments(caseId: string): Promise<Comment[]> {
    try {
      const response = await this.opensearchClient.search({
        index: this.COMMENTS_INDEX,
        body: {
          query: { term: { case_id: caseId } },
          sort: [{ created_at: { order: 'asc' } }],
          size: 1000,
        },
      });

      return response.body.hits.hits.map((hit: any) => hit._source);
    } catch (error) {
      this.logger.error('Error getting case comments:', error);
      throw error;
    }
  }

  async updateComment(commentId: string, updates: { content: string }): Promise<Comment> {
    try {
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      await this.opensearchClient.update({
        index: this.COMMENTS_INDEX,
        id: commentId,
        body: { doc: updateData },
      });

      const response = await this.opensearchClient.search({
        index: this.COMMENTS_INDEX,
        body: {
          query: { term: { id: commentId } },
        },
      });

      if (response.body.hits.total.value === 0) {
        throw { statusCode: 404, message: 'Comment not found' };
      }

      return response.body.hits.hits[0]._source;
    } catch (error) {
      this.logger.error('Error updating comment:', error);
      throw error;
    }
  }

  async deleteComment(commentId: string): Promise<void> {
    try {
      // Get comment to find case_id
      const response = await this.opensearchClient.search({
        index: this.COMMENTS_INDEX,
        body: {
          query: { term: { id: commentId } },
        },
      });

      if (response.body.hits.total.value === 0) {
        throw { statusCode: 404, message: 'Comment not found' };
      }

      const comment = response.body.hits.hits[0]._source;
      const caseId = comment.case_id;

      await this.opensearchClient.delete({
        index: this.COMMENTS_INDEX,
        id: commentId,
      });

      await this.updateCaseCounts(caseId);
    } catch (error) {
      this.logger.error('Error deleting comment:', error);
      throw error;
    }
  }

  // File management methods
  async uploadFile(caseId: string, fileData: any): Promise<FileAttachment> {
    // Verify case exists
    await this.getCaseById(caseId);

    const now = new Date().toISOString();
    const file: FileAttachment = {
      id: uuidv4(),
      filename: fileData.filename,
      original_filename: fileData.original_filename,
      file_size: fileData.file_size,
      mime_type: fileData.mime_type,
      uploaded_by: fileData.uploaded_by,
      uploaded_at: now,
      case_id: caseId,
    };

    try {
      const fileDoc = {
        ...file,
        file_data: fileData.file_data, // base64 encoded file data
      };

      await this.opensearchClient.index({
        index: this.FILES_INDEX,
        id: file.id,
        body: fileDoc,
      });

      await this.updateCaseCounts(caseId);
      return file;
    } catch (error) {
      this.logger.error('Error uploading file:', error);
      throw error;
    }
  }

  async getCaseFiles(caseId: string): Promise<FileAttachment[]> {
    try {
      const response = await this.opensearchClient.search({
        index: this.FILES_INDEX,
        body: {
          query: { term: { case_id: caseId } },
          sort: [{ uploaded_at: { order: 'desc' } }],
          size: 1000,
          _source: { excludes: ['file_data'] }, // Exclude file data from list
        },
      });

      return response.body.hits.hits.map((hit: any) => hit._source);
    } catch (error) {
      this.logger.error('Error getting case files:', error);
      throw error;
    }
  }

  async getFileById(fileId: string): Promise<any> {
    try {
      const response = await this.opensearchClient.search({
        index: this.FILES_INDEX,
        body: {
          query: { term: { id: fileId } },
        },
      });

      if (response.body.hits.total.value === 0) {
        throw { statusCode: 404, message: 'File not found' };
      }

      return response.body.hits.hits[0]._source;
    } catch (error) {
      this.logger.error('Error getting file by ID:', error);
      throw error;
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    try {
      // Get file to find case_id
      const response = await this.opensearchClient.search({
        index: this.FILES_INDEX,
        body: {
          query: { term: { id: fileId } },
        },
      });

      if (response.body.hits.total.value === 0) {
        throw { statusCode: 404, message: 'File not found' };
      }

      const file = response.body.hits.hits[0]._source;
      const caseId = file.case_id;

      await this.opensearchClient.delete({
        index: this.FILES_INDEX,
        id: fileId,
      });

      await this.updateCaseCounts(caseId);
    } catch (error) {
      this.logger.error('Error deleting file:', error);
      throw error;
    }
  }

  // Statistics methods
  async getStats(query: any): Promise<any> {
    try {
      const casesResponse = await this.opensearchClient.search({
        index: this.CASES_INDEX,
        body: {
          size: 0,
          aggs: {
            total_cases: { value_count: { field: 'id' } },
            status_breakdown: {
              terms: { field: 'status' },
            },
            priority_breakdown: {
              terms: { field: 'priority' },
            },
            cases_over_time: {
              date_histogram: {
                field: 'created_at',
                calendar_interval: '1d',
              },
            },
          },
        },
      });

      const aggs = casesResponse.body.aggregations;
      return {
        total_cases: aggs.total_cases.value,
        status_breakdown: aggs.status_breakdown.buckets.reduce((acc: any, bucket: any) => {
          acc[bucket.key] = bucket.doc_count;
          return acc;
        }, {}),
        priority_breakdown: aggs.priority_breakdown.buckets.reduce((acc: any, bucket: any) => {
          acc[bucket.key] = bucket.doc_count;
          return acc;
        }, {}),
        cases_over_time: aggs.cases_over_time.buckets,
      };
    } catch (error) {
      this.logger.error('Error getting stats:', error);
      throw error;
    }
  }

  async getCaseStats(query: any): Promise<any> {
    return this.getStats(query);
  }

  async getPerformanceMetrics(query: any): Promise<any> {
    try {
      const response = await this.opensearchClient.search({
        index: this.CASES_INDEX,
        body: {
          size: 0,
          aggs: {
            avg_resolution_time: {
              avg: {
                script: {
                  source: "if (doc['closed_at'].size() > 0 && doc['created_at'].size() > 0) { return doc['closed_at'].value.getMillis() - doc['created_at'].value.getMillis(); }",
                },
              },
            },
            resolution_time_by_priority: {
              terms: { field: 'priority' },
              aggs: {
                avg_resolution_time: {
                  avg: {
                    script: {
                      source: "if (doc['closed_at'].size() > 0 && doc['created_at'].size() > 0) { return doc['closed_at'].value.getMillis() - doc['created_at'].value.getMillis(); }",
                    },
                  },
                },
              },
            },
          },
        },
      });

      const aggs = response.body.aggregations;
      return {
        avg_resolution_time_ms: aggs.avg_resolution_time.value,
        resolution_time_by_priority: aggs.resolution_time_by_priority.buckets,
      };
    } catch (error) {
      this.logger.error('Error getting performance metrics:', error);
      throw error;
    }
  }

  async getSLAMetrics(query: any): Promise<any> {
    try {
      // Define SLA targets based on priority
      const slaTargets = {
        critical: 4 * 60 * 60 * 1000, // 4 hours
        high: 24 * 60 * 60 * 1000, // 24 hours
        medium: 72 * 60 * 60 * 1000, // 72 hours
        low: 168 * 60 * 60 * 1000, // 1 week
      };

      const response = await this.opensearchClient.search({
        index: this.CASES_INDEX,
        body: {
          size: 0,
          aggs: {
            sla_by_priority: {
              terms: { field: 'priority' },
              aggs: {
                breach_count: {
                  filter: {
                    script: {
                      source: `
                        if (doc['closed_at'].size() > 0 && doc['created_at'].size() > 0) {
                          long resolutionTime = doc['closed_at'].value.getMillis() - doc['created_at'].value.getMillis();
                          String priority = doc['priority'].value;
                          Map slaTargets = ['critical': 14400000L, 'high': 86400000L, 'medium': 259200000L, 'low': 604800000L];
                          return resolutionTime > slaTargets.get(priority, 259200000L);
                        }
                        return false;
                      `,
                    },
                  },
                },
              },
            },
          },
        },
      });

      const aggs = response.body.aggregations;
      return {
        sla_targets: slaTargets,
        sla_by_priority: aggs.sla_by_priority.buckets.map((bucket: any) => ({
          priority: bucket.key,
          total_cases: bucket.doc_count,
          breached_cases: bucket.breach_count.doc_count,
          sla_compliance: ((bucket.doc_count - bucket.breach_count.doc_count) / bucket.doc_count) * 100,
        })),
      };
    } catch (error) {
      this.logger.error('Error getting SLA metrics:', error);
      throw error;
    }
  }

  private async updateCaseCounts(caseId: string) {
    try {
      // Count comments
      const commentsResponse = await this.opensearchClient.count({
        index: this.COMMENTS_INDEX,
        body: {
          query: { term: { case_id: caseId } },
        },
      });

      // Count files
      const filesResponse = await this.opensearchClient.count({
        index: this.FILES_INDEX,
        body: {
          query: { term: { case_id: caseId } },
        },
      });

      // Update case
      await this.opensearchClient.update({
        index: this.CASES_INDEX,
        id: caseId,
        body: {
          doc: {
            comments_count: commentsResponse.body.count,
            attachments_count: filesResponse.body.count,
            updated_at: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      this.logger.error('Error updating case counts:', error);
    }
  }
}