import { OpenSearchCasesPlugin } from './plugin';

// This method is called when the plugin is loaded
export function plugin() {
  return new OpenSearchCasesPlugin();
}

export { OpenSearchCasesPlugin };
export * from './plugin';