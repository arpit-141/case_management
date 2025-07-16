import { schema } from '@osd/config-schema';
import { IRouter } from '../../../../src/core/server';
import { ServiceDependencies } from '../types';

export function registerAlertsRoutes(router: IRouter, { alertsService, logger }: ServiceDependencies) {
  // Create alert
  router.post(
    {
      path: '/api/alerts',
      validate: {
        body: schema.object({
          title: schema.string(),
          description: schema.string(),
          severity: schema.oneOf([
            schema.literal('low'),
            schema.literal('medium'),
            schema.literal('high'),
            schema.literal('critical'),
          ]),
          monitor_id: schema.string(),
          trigger_id: schema.string(),
          opensearch_query: schema.maybe(schema.any()),
          visualization_id: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const alert = await alertsService.createAlert(request.body);
        return response.ok({
          body: alert,
        });
      } catch (error) {
        logger.error('Error creating alert:', error);
        return response.customError({
          statusCode: 500,
          body: { message: 'Error creating alert' },
        });
      }
    }
  );

  // Get alerts
  router.get(
    {
      path: '/api/alerts',
      validate: {
        query: schema.object({
          status: schema.maybe(schema.oneOf([
            schema.literal('active'),
            schema.literal('acknowledged'),
            schema.literal('completed'),
          ])),
          severity: schema.maybe(schema.oneOf([
            schema.literal('low'),
            schema.literal('medium'),
            schema.literal('high'),
            schema.literal('critical'),
          ])),
          limit: schema.maybe(schema.number()),
          offset: schema.maybe(schema.number()),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const alerts = await alertsService.getAlerts(request.query);
        return response.ok({
          body: alerts,
        });
      } catch (error) {
        logger.error('Error getting alerts:', error);
        return response.customError({
          statusCode: 500,
          body: { message: 'Error getting alerts' },
        });
      }
    }
  );

  // Get alert by ID
  router.get(
    {
      path: '/api/alerts/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const alert = await alertsService.getAlertById(request.params.id);
        return response.ok({
          body: alert,
        });
      } catch (error) {
        logger.error('Error getting alert:', error);
        if (error.statusCode === 404) {
          return response.notFound({
            body: { message: 'Alert not found' },
          });
        }
        return response.customError({
          statusCode: 500,
          body: { message: 'Error getting alert' },
        });
      }
    }
  );

  // Acknowledge alert
  router.put(
    {
      path: '/api/alerts/{id}/acknowledge',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const alert = await alertsService.acknowledgeAlert(request.params.id);
        return response.ok({
          body: alert,
        });
      } catch (error) {
        logger.error('Error acknowledging alert:', error);
        if (error.statusCode === 404) {
          return response.notFound({
            body: { message: 'Alert not found' },
          });
        }
        return response.customError({
          statusCode: 500,
          body: { message: 'Error acknowledging alert' },
        });
      }
    }
  );

  // Complete alert
  router.put(
    {
      path: '/api/alerts/{id}/complete',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const alert = await alertsService.completeAlert(request.params.id);
        return response.ok({
          body: alert,
        });
      } catch (error) {
        logger.error('Error completing alert:', error);
        if (error.statusCode === 404) {
          return response.notFound({
            body: { message: 'Alert not found' },
          });
        }
        return response.customError({
          statusCode: 500,
          body: { message: 'Error completing alert' },
        });
      }
    }
  );

  // Create case from alert
  router.post(
    {
      path: '/api/alerts/{id}/create-case',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        body: schema.object({
          title: schema.maybe(schema.string()),
          description: schema.maybe(schema.string()),
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
        }),
      },
    },
    async (context, request, response) => {
      try {
        const case_data = await alertsService.createCaseFromAlert(request.params.id, request.body);
        return response.ok({
          body: case_data,
        });
      } catch (error) {
        logger.error('Error creating case from alert:', error);
        if (error.statusCode === 404) {
          return response.notFound({
            body: { message: 'Alert not found' },
          });
        }
        return response.customError({
          statusCode: 500,
          body: { message: 'Error creating case from alert' },
        });
      }
    }
  );
}