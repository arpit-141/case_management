import { schema } from '@osd/config-schema';
import { IRouter } from '../../../../src/core/server';
import { ServiceDependencies } from '../types';

export function registerVisualizationsRoutes(router: IRouter, { visualizationsService, logger }: ServiceDependencies) {
  // Get visualizations
  router.get(
    {
      path: '/api/visualizations',
      validate: {
        query: schema.object({
          type: schema.maybe(schema.string()),
          limit: schema.maybe(schema.number()),
          offset: schema.maybe(schema.number()),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const visualizations = await visualizationsService.getVisualizations(request.query);
        return response.ok({
          body: visualizations,
        });
      } catch (error) {
        logger.error('Error getting visualizations:', error);
        return response.customError({
          statusCode: 500,
          body: { message: 'Error getting visualizations' },
        });
      }
    }
  );

  // Get visualization by ID
  router.get(
    {
      path: '/api/visualizations/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const visualization = await visualizationsService.getVisualizationById(request.params.id);
        return response.ok({
          body: visualization,
        });
      } catch (error) {
        logger.error('Error getting visualization:', error);
        if (error.statusCode === 404) {
          return response.notFound({
            body: { message: 'Visualization not found' },
          });
        }
        return response.customError({
          statusCode: 500,
          body: { message: 'Error getting visualization' },
        });
      }
    }
  );

  // Create visualization for case
  router.post(
    {
      path: '/api/cases/{case_id}/visualizations',
      validate: {
        params: schema.object({
          case_id: schema.string(),
        }),
        body: schema.object({
          title: schema.string(),
          type: schema.string(),
          query: schema.any(),
          config: schema.any(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const visualization = await visualizationsService.createVisualizationForCase(
          request.params.case_id,
          request.body
        );
        return response.ok({
          body: visualization,
        });
      } catch (error) {
        logger.error('Error creating visualization for case:', error);
        return response.customError({
          statusCode: 500,
          body: { message: 'Error creating visualization for case' },
        });
      }
    }
  );

  // Get case visualizations
  router.get(
    {
      path: '/api/cases/{case_id}/visualizations',
      validate: {
        params: schema.object({
          case_id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const visualizations = await visualizationsService.getCaseVisualizations(request.params.case_id);
        return response.ok({
          body: visualizations,
        });
      } catch (error) {
        logger.error('Error getting case visualizations:', error);
        return response.customError({
          statusCode: 500,
          body: { message: 'Error getting case visualizations' },
        });
      }
    }
  );

  // Execute OpenSearch query
  router.post(
    {
      path: '/api/opensearch/query',
      validate: {
        body: schema.object({
          index: schema.string(),
          query: schema.any(),
          size: schema.maybe(schema.number()),
          from: schema.maybe(schema.number()),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const results = await visualizationsService.executeOpenSearchQuery(request.body);
        return response.ok({
          body: results,
        });
      } catch (error) {
        logger.error('Error executing OpenSearch query:', error);
        return response.customError({
          statusCode: 500,
          body: { message: 'Error executing OpenSearch query' },
        });
      }
    }
  );
}