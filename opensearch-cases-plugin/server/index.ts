import { PluginInitializerContext } from '../types/opensearch';
import { OpenSearchCasesPlugin } from './plugin';

export function plugin(initializerContext: PluginInitializerContext) {
  return new OpenSearchCasesPlugin(initializerContext);
}

export { OpenSearchCasesPlugin };
export * from './types';