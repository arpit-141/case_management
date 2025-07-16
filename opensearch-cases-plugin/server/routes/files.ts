import { schema } from '@osd/config-schema';
import { IRouter } from '../../../../src/core/server';
import { ServiceDependencies } from '../types';

export function registerFilesRoutes(router: IRouter, { casesService, logger }: ServiceDependencies) {
  // Upload file
  router.post(
    {
      path: '/api/cases/{case_id}/files',
      validate: {
        params: schema.object({
          case_id: schema.string(),
        }),
        body: schema.object({
          filename: schema.string(),
          original_filename: schema.string(),
          file_size: schema.number(),
          mime_type: schema.string(),
          uploaded_by: schema.string(),
          file_data: schema.string(), // base64 encoded file data
        }),
      },
    },
    async (context, request, response) => {
      try {
        const file = await casesService.uploadFile(request.params.case_id, request.body);
        return response.ok({
          body: file,
        });
      } catch (error) {
        logger.error('Error uploading file:', error);
        return response.customError({
          statusCode: 500,
          body: { message: 'Error uploading file' },
        });
      }
    }
  );

  // Get case files
  router.get(
    {
      path: '/api/cases/{case_id}/files',
      validate: {
        params: schema.object({
          case_id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const files = await casesService.getCaseFiles(request.params.case_id);
        return response.ok({
          body: files,
        });
      } catch (error) {
        logger.error('Error getting files:', error);
        return response.customError({
          statusCode: 500,
          body: { message: 'Error getting files' },
        });
      }
    }
  );

  // Download file
  router.get(
    {
      path: '/api/files/{file_id}/download',
      validate: {
        params: schema.object({
          file_id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const file = await casesService.getFileById(request.params.file_id);
        return response.ok({
          body: file,
          headers: {
            'Content-Type': file.mime_type,
            'Content-Disposition': `attachment; filename="${file.original_filename}"`,
          },
        });
      } catch (error) {
        logger.error('Error downloading file:', error);
        if (error.statusCode === 404) {
          return response.notFound({
            body: { message: 'File not found' },
          });
        }
        return response.customError({
          statusCode: 500,
          body: { message: 'Error downloading file' },
        });
      }
    }
  );

  // Delete file
  router.delete(
    {
      path: '/api/files/{file_id}',
      validate: {
        params: schema.object({
          file_id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        await casesService.deleteFile(request.params.file_id);
        return response.ok({
          body: { message: 'File deleted successfully' },
        });
      } catch (error) {
        logger.error('Error deleting file:', error);
        if (error.statusCode === 404) {
          return response.notFound({
            body: { message: 'File not found' },
          });
        }
        return response.customError({
          statusCode: 500,
          body: { message: 'Error deleting file' },
        });
      }
    }
  );
}