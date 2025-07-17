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
          priority: schema.oneOf(['low', 'medium', 'high', 'critical']),
          tags: schema.arrayOf(schema.string()),
          assigned_to: schema.maybe(schema.string()),
          assigned_to_name: schema.maybe(schema.string()),
          alert_ids: schema.maybe(schema.arrayOf(schema.string())),
          visualization_ids: schema.maybe(schema.arrayOf(schema.string())),
        }),
      },
    },
    async (context: any, request: any, response: any) => {
      try {
        const caseData = request.body;
        const result = await casesService.createCase(caseData);

        return response.ok({ body: result });
      } catch (error) {
        return response.customError({
          statusCode: 500,
          body: {
            message: 'Failed to create case',
            error: error.message,
          },
        });
      }
    }
  );

  // Get all cases
  router.get(
    {
      path: '/api/cases',
      validate: {
        query: schema.object({
          page: schema.maybe(schema.number()),
          per_page: schema.maybe(schema.number()),
          sort_field: schema.maybe(schema.string()),
          sort_order: schema.maybe(schema.string()),
          search: schema.maybe(schema.string()),
          status: schema.maybe(schema.string()),
          priority: schema.maybe(schema.string()),
          tags: schema.maybe(schema.arrayOf(schema.string())),
          assigned_to: schema.maybe(schema.string()),
          from: schema.maybe(schema.string()),
          to: schema.maybe(schema.string()),
        }),
      },
    },
    async (context: any, request: any, response: any) => {
      try {
        const {
          page = 1,
          per_page = 20,
          sort_field = 'created_at',
          sort_order = 'desc',
          search,
          status,
          priority,
          tags,
          assigned_to,
          from,
          to,
        } = request.query;

        const result = await casesService.getCases({
          page,
          per_page,
          sort_field,
          sort_order,
          search,
          status,
          priority,
          tags,
          assigned_to,
          from,
          to,
        });

        return response.ok({ body: result });
      } catch (error) {
        return response.customError({
          statusCode: 500,
          body: {
            message: 'Failed to retrieve cases',
            error: error.message,
          },
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
    async (context: any, request: any, response: any) => {
      try {
        const { id } = request.params;
        const result = await casesService.getCaseById(id);

        if (!result) {
          return response.notFound({
            body: { message: 'Case not found' },
          });
        }

        return response.ok({ body: result });
      } catch (error) {
        return response.customError({
          statusCode: 500,
          body: {
            message: 'Failed to retrieve case',
            error: error.message,
          },
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
          status: schema.maybe(schema.oneOf(['open', 'in_progress', 'closed'])),
          priority: schema.maybe(schema.oneOf(['low', 'medium', 'high', 'critical'])),
          tags: schema.maybe(schema.arrayOf(schema.string())),
          assigned_to: schema.maybe(schema.string()),
          assigned_to_name: schema.maybe(schema.string()),
          visualization_ids: schema.maybe(schema.arrayOf(schema.string())),
        }),
      },
    },
    async (context: any, request: any, response: any) => {
      try {
        const { id } = request.params;
        const updateData = request.body;
        const result = await casesService.updateCase(id, updateData);

        if (!result) {
          return response.notFound({
            body: { message: 'Case not found' },
          });
        }

        return response.ok({ body: result });
      } catch (error) {
        return response.customError({
          statusCode: 500,
          body: {
            message: 'Failed to update case',
            error: error.message,
          },
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
    async (context: any, request: any, response: any) => {
      try {
        const { id } = request.params;
        const result = await casesService.deleteCase(id);

        if (!result) {
          return response.notFound({
            body: { message: 'Case not found' },
          });
        }

        return response.ok({ body: { message: 'Case deleted successfully' } });
      } catch (error) {
        return response.customError({
          statusCode: 500,
          body: {
            message: 'Failed to delete case',
            error: error.message,
          },
        });
      }
    }
  );
}