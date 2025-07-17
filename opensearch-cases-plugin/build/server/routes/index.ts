import { IRouter } from '../../../../src/core/server';
import { ServiceDependencies } from '../types';
import { registerCasesRoutes } from './cases';
import { registerCommentsRoutes } from './comments';
import { registerFilesRoutes } from './files';
import { registerAlertsRoutes } from './alerts';
import { registerVisualizationsRoutes } from './visualizations';
import { registerStatsRoutes } from './stats';

export function defineRoutes(router: IRouter, deps: ServiceDependencies) {
  registerCasesRoutes(router, deps);
  registerCommentsRoutes(router, deps);
  registerFilesRoutes(router, deps);
  registerAlertsRoutes(router, deps);
  registerVisualizationsRoutes(router, deps);
  registerStatsRoutes(router, deps);
}