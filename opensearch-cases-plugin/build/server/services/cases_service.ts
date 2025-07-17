import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../../../../src/core/server';
import { Case, CaseCreateRequest, CaseUpdateRequest, Comment } from '../types';

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

    await this.createIndexIfNotExists(this.CASES_INDEX, casesMapping);
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