import { IRouter } from '../types/opensearch';
import { CasesService } from '../services/cases_service';
import { AlertsService } from '../services/alerts_service';
import { VisualizationsService } from '../services/visualizations_service';
import { Logger } from '../types/opensearch';
import { registerCasesRoutes } from './cases';

export interface ServiceDependencies {
  casesService: CasesService;
  alertsService: AlertsService;
  visualizationsService: VisualizationsService;
  logger: Logger;
}

export function defineRoutes(router: IRouter, dependencies: ServiceDependencies) {
  registerCasesRoutes(router, dependencies.casesService);
  // Add other route registrations here when available
  // registerCommentsRoutes(router, dependencies);
  // registerFilesRoutes(router, dependencies);
  // registerAlertsRoutes(router, dependencies);
  // registerVisualizationsRoutes(router, dependencies);
  // registerStatsRoutes(router, dependencies);
}