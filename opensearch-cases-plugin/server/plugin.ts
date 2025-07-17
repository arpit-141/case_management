import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
  IRouter,
} from '../../../../src/core/server';
import { OpenSearchCasesPluginSetup, OpenSearchCasesPluginStart } from './types';
import { defineRoutes } from './routes';
import { CasesService } from './services/cases_service';
import { AlertsService } from './services/alerts_service';
import { VisualizationsService } from './services/visualizations_service';

export class OpenSearchCasesPlugin
  implements Plugin<OpenSearchCasesPluginSetup, OpenSearchCasesPluginStart> {
  private readonly logger: Logger;
  private router!: IRouter;
  private casesService!: CasesService;
  private alertsService!: AlertsService;
  private visualizationsService!: VisualizationsService;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup): OpenSearchCasesPluginSetup {
    this.logger.debug('opensearch_cases: Setup');
    
    this.router = core.http.createRouter();
    
    // Initialize services
    this.casesService = new CasesService(core.opensearch.legacy.client!, this.logger);
    this.alertsService = new AlertsService(core.opensearch.legacy.client!, this.logger);
    this.visualizationsService = new VisualizationsService(core.opensearch.legacy.client!, this.logger);

    // Define routes
    defineRoutes(this.router, {
      casesService: this.casesService,
      alertsService: this.alertsService,
      visualizationsService: this.visualizationsService,
      logger: this.logger,
    });

    // Initialize indices
    this.initializeIndices(core);

    return {};
  }

  public start(core: CoreStart): OpenSearchCasesPluginStart {
    this.logger.debug('opensearch_cases: Started');
    return {};
  }

  public stop() {}

  private async initializeIndices(core: CoreSetup) {
    try {
      await this.casesService.initializeIndices();
      await this.alertsService.initializeIndices();
      this.logger.info('OpenSearch Cases plugin indices initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize OpenSearch Cases plugin indices:', error);
    }
  }
}