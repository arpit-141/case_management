import { CoreSetup, CoreStart, Plugin } from '../../../../src/core/public';
import { NavigationPublicPluginStart } from '../../../../src/plugins/navigation/public';
import { DataPublicPluginStart } from '../../../../src/plugins/data/public';
import { VisualizationsStart } from '../../../../src/plugins/visualizations/public';
import { DashboardStart } from '../../../../src/plugins/dashboard/public';

export interface OpenSearchCasesPluginSetup {}
export interface OpenSearchCasesPluginStart {}

export interface OpenSearchCasesPluginSetupDeps {}

export interface OpenSearchCasesPluginStartDeps {
  navigation: NavigationPublicPluginStart;
  data: DataPublicPluginStart;
  visualizations: VisualizationsStart;
  dashboard: DashboardStart;
}

export class OpenSearchCasesPlugin
  implements Plugin<OpenSearchCasesPluginSetup, OpenSearchCasesPluginStart, OpenSearchCasesPluginSetupDeps, OpenSearchCasesPluginStartDeps> {

  public setup(core: CoreSetup): OpenSearchCasesPluginSetup {
    // Register application
    core.application.register({
      id: 'opensearch_cases',
      title: 'Cases',
      category: {
        id: 'opensearch',
        label: 'OpenSearch',
        order: 2000,
      },
      order: 1000,
      async mount(params) {
        const { renderApp } = await import('./application');
        const [coreStart, depsStart] = await core.getStartServices();
        return renderApp(coreStart, depsStart as OpenSearchCasesPluginStartDeps, params);
      },
    });

    // Register management section
    if (core.management?.sections?.section?.opensearch) {
      core.management.sections.section.opensearch.registerApp({
        id: 'opensearch_cases',
        title: 'Cases',
        order: 30,
        async mount(params) {
          const { renderManagementApp } = await import('./management');
          const [coreStart, depsStart] = await core.getStartServices();
          return renderManagementApp(coreStart, depsStart as OpenSearchCasesPluginStartDeps, params);
        },
      });
    }

    return {};
  }

  public start(core: CoreStart): OpenSearchCasesPluginStart {
    return {};
  }

  public stop() {}
}