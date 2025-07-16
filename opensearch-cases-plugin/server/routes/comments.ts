import { schema } from '@osd/config-schema';
import { IRouter } from '../../../../src/core/server';
import { ServiceDependencies } from '../types';

export function registerCommentsRoutes(router: IRouter, { casesService, logger }: ServiceDependencies) {
  // Create comment
  router.post(
    {
      path: '/api/cases/{case_id}/comments',
      validate: {
        params: schema.object({
          case_id: schema.string(),
        }),
        body: schema.object({
          content: schema.string(),
          author: schema.string(),
          author_name: schema.string(),
          comment_type: schema.maybe(schema.oneOf([
            schema.literal('user'),
            schema.literal('system'),
          ])),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const comment = await casesService.createComment(request.params.case_id, request.body);
        return response.ok({
          body: comment,
        });
      } catch (error) {
        logger.error('Error creating comment:', error);
        return response.customError({
          statusCode: 500,
          body: { message: 'Error creating comment' },
        });
      }
    }
  );

  // Get case comments
  router.get(
    {
      path: '/api/cases/{case_id}/comments',
      validate: {
        params: schema.object({
          case_id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const comments = await casesService.getCaseComments(request.params.case_id);
        return response.ok({
          body: comments,
        });
      } catch (error) {
        logger.error('Error getting comments:', error);
        return response.customError({
          statusCode: 500,
          body: { message: 'Error getting comments' },
        });
      }
    }
  );

  // Update comment
  router.put(
    {
      path: '/api/comments/{comment_id}',
      validate: {
        params: schema.object({
          comment_id: schema.string(),
        }),
        body: schema.object({
          content: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const comment = await casesService.updateComment(request.params.comment_id, request.body);
        return response.ok({
          body: comment,
        });
      } catch (error) {
        logger.error('Error updating comment:', error);
        if (error.statusCode === 404) {
          return response.notFound({
            body: { message: 'Comment not found' },
          });
        }
        return response.customError({
          statusCode: 500,
          body: { message: 'Error updating comment' },
        });
      }
    }
  );

  // Delete comment
  router.delete(
    {
      path: '/api/comments/{comment_id}',
      validate: {
        params: schema.object({
          comment_id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        await casesService.deleteComment(request.params.comment_id);
        return response.ok({
          body: { message: 'Comment deleted successfully' },
        });
      } catch (error) {
        logger.error('Error deleting comment:', error);
        if (error.statusCode === 404) {
          return response.notFound({
            body: { message: 'Comment not found' },
          });
        }
        return response.customError({
          statusCode: 500,
          body: { message: 'Error deleting comment' },
        });
      }
    }
  );
}