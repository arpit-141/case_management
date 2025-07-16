import { schema } from '@osd/config-schema';
import { IRouter } from '../../../../src/core/server';
import { ServiceDependencies } from '../types';

export function registerStatsRoutes(router: IRouter, { casesService, alertsService, logger }: ServiceDependencies) {
  // Get statistics
  router.get(
    {
      path: '/api/stats',
      validate: {
        query: schema.object({
          time_range: schema.maybe(schema.string()),
          group_by: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const stats = await casesService.getStats(request.query);
        return response.ok({
          body: stats,
        });
      } catch (error) {
        logger.error('Error getting statistics:', error);
        return response.customError({
          statusCode: 500,
          body: { message: 'Error getting statistics' },
        });
      }
    }
  );

  // Get case statistics
  router.get(
    {
      path: '/api/stats/cases',
      validate: {
        query: schema.object({
          time_range: schema.maybe(schema.string()),
          group_by: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const stats = await casesService.getCaseStats(request.query);
        return response.ok({
          body: stats,
        });
      } catch (error) {
        logger.error('Error getting case statistics:', error);
        return response.customError({
          statusCode: 500,
          body: { message: 'Error getting case statistics' },
        });
      }
    }
  );

  // Get alert statistics
  router.get(
    {
      path: '/api/stats/alerts',
      validate: {
        query: schema.object({
          time_range: schema.maybe(schema.string()),
          group_by: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const stats = await alertsService.getAlertStats(request.query);
        return response.ok({
          body: stats,
        });
      } catch (error) {
        logger.error('Error getting alert statistics:', error);
        return response.customError({
          statusCode: 500,
          body: { message: 'Error getting alert statistics' },
        });
      }
    }
  );

  // Get performance metrics
  router.get(
    {
      path: '/api/stats/performance',
      validate: {
        query: schema.object({
          time_range: schema.maybe(schema.string()),
          metric_type: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const metrics = await casesService.getPerformanceMetrics(request.query);
        return response.ok({
          body: metrics,
        });
      } catch (error) {
        logger.error('Error getting performance metrics:', error);
        return response.customError({
          statusCode: 500,
          body: { message: 'Error getting performance metrics' },
        });
      }
    }
  );

  // Get SLA metrics
  router.get(
    {
      path: '/api/stats/sla',
      validate: {
        query: schema.object({
          time_range: schema.maybe(schema.string()),
          priority: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const metrics = await casesService.getSLAMetrics(request.query);
        return response.ok({
          body: metrics,
        });
      } catch (error) {
        logger.error('Error getting SLA metrics:', error);
        return response.customError({
          statusCode: 500,
          body: { message: 'Error getting SLA metrics' },
        });
      }
    }
  );
}