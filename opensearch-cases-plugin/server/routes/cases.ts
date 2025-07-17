import { schema } from '../types/opensearch';
import { IRouter } from '../types/opensearch';
import { CasesService } from '../services/cases_service';

export function registerCasesRoutes(router: IRouter, casesService: CasesService) {
  // Create case
  router.post(
    {
      path: '/api/cases',
      validate: {
        body: schema.object({
          title: schema.string(),
          description: schema.string(),
          priority: schema.maybe(schema.oneOf([
            schema.literal('low'),
            schema.literal('medium'),
            schema.literal('high'),
            schema.literal('critical'),
          ])),
          tags: schema.maybe(schema.arrayOf(schema.string())),
          assigned_to: schema.maybe(schema.string()),
          assigned_to_name: schema.maybe(schema.string()),
          created_by: schema.string(),
          created_by_name: schema.string(),
          alert_id: schema.maybe(schema.string()),
          opensearch_query: schema.maybe(schema.any()),
          visualization_ids: schema.maybe(schema.arrayOf(schema.string())),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const case_data = await casesService.createCase(request.body);
        return response.ok({
          body: case_data,
        });
      } catch (error) {
        logger.error('Error creating case:', error);
        return response.customError({
          statusCode: 500,
          body: { message: 'Error creating case' },
        });
      }
    }
  );

  // Get cases
  router.get(
    {
      path: '/api/cases',
      validate: {
        query: schema.object({
          status: schema.maybe(schema.oneOf([
            schema.literal('open'),
            schema.literal('in_progress'),
            schema.literal('closed'),
          ])),
          priority: schema.maybe(schema.oneOf([
            schema.literal('low'),
            schema.literal('medium'),
            schema.literal('high'),
            schema.literal('critical'),
          ])),
          assigned_to: schema.maybe(schema.string()),
          created_by: schema.maybe(schema.string()),
          search: schema.maybe(schema.string()),
          limit: schema.maybe(schema.number()),
          offset: schema.maybe(schema.number()),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const cases = await casesService.getCases(request.query);
        return response.ok({
          body: cases,
        });
      } catch (error) {
        logger.error('Error getting cases:', error);
        return response.customError({
          statusCode: 500,
          body: { message: 'Error getting cases' },
        });
      }
    }
  );

  // Get case by ID
  router.get(
    {
      path: '/api/cases/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const case_data = await casesService.getCaseById(request.params.id);
        return response.ok({
          body: case_data,
        });
      } catch (error) {
        logger.error('Error getting case:', error);
        if (error.statusCode === 404) {
          return response.notFound({
            body: { message: 'Case not found' },
          });
        }
        return response.customError({
          statusCode: 500,
          body: { message: 'Error getting case' },
        });
      }
    }
  );

  // Update case
  router.put(
    {
      path: '/api/cases/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        body: schema.object({
          title: schema.maybe(schema.string()),
          description: schema.maybe(schema.string()),
          status: schema.maybe(schema.oneOf([
            schema.literal('open'),
            schema.literal('in_progress'),
            schema.literal('closed'),
          ])),
          priority: schema.maybe(schema.oneOf([
            schema.literal('low'),
            schema.literal('medium'),
            schema.literal('high'),
            schema.literal('critical'),
          ])),
          tags: schema.maybe(schema.arrayOf(schema.string())),
          assigned_to: schema.maybe(schema.string()),
          assigned_to_name: schema.maybe(schema.string()),
          visualization_ids: schema.maybe(schema.arrayOf(schema.string())),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const case_data = await casesService.updateCase(request.params.id, request.body);
        return response.ok({
          body: case_data,
        });
      } catch (error) {
        logger.error('Error updating case:', error);
        if (error.statusCode === 404) {
          return response.notFound({
            body: { message: 'Case not found' },
          });
        }
        return response.customError({
          statusCode: 500,
          body: { message: 'Error updating case' },
        });
      }
    }
  );

  // Delete case
  router.delete(
    {
      path: '/api/cases/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        await casesService.deleteCase(request.params.id);
        return response.ok({
          body: { message: 'Case deleted successfully' },
        });
      } catch (error) {
        logger.error('Error deleting case:', error);
        if (error.statusCode === 404) {
          return response.notFound({
            body: { message: 'Case not found' },
          });
        }
        return response.customError({
          statusCode: 500,
          body: { message: 'Error deleting case' },
        });
      }
    }
  );
}