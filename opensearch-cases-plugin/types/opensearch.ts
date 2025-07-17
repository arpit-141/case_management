// OpenSearch Dashboard plugin API types
export interface CoreSetup {
  application: {
    register: (config: any) => void;
  };
  management?: {
    sections?: {
      section?: {
        opensearch?: {
          registerApp: (config: any) => void;
        };
      };
    };
  };
  getStartServices: () => Promise<[CoreStart, any]>;
  http: {
    createRouter: () => IRouter;
  };
  opensearch: {
    legacy: {
      client: any;
    };
  };
}

export interface CoreStart {
  notifications: any;
  http: any;
}

export interface AppMountParameters {
  appBasePath: string;
  element: HTMLElement;
  history: any;
}

export interface Plugin<TSetup, TStart, TSetupDeps = {}, TStartDeps = {}> {
  setup(core: CoreSetup, plugins: TSetupDeps): TSetup;
  start(core: CoreStart, plugins: TStartDeps): TStart;
  stop?(): void;
}

export interface PluginInitializerContext {
  logger: {
    get: () => Logger;
  };
}

export interface Logger {
  debug: (message: string) => void;
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string, error?: any) => void;
}

export interface IRouter {
  get: (config: any, handler: any) => void;
  post: (config: any, handler: any) => void;
  put: (config: any, handler: any) => void;
  delete: (config: any, handler: any) => void;
}

// Plugin dependencies
export interface NavigationPublicPluginStart {
  // Navigation plugin interface
}

export interface DataPublicPluginStart {
  // Data plugin interface
}

export interface VisualizationsStart {
  // Visualizations plugin interface
}

export interface DashboardStart {
  // Dashboard plugin interface
}

// I18n Provider stub
export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

// Config schema stub
export const schema = {
  object: (config: any) => config,
  string: (config: any) => config,
  number: (config: any) => config,
  boolean: (config: any) => config,
  arrayOf: (type: any) => type,
  oneOf: (options: any[]) => options,
  maybe: (type: any) => type,
};