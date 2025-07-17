import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom';
import { I18nProvider } from '../types/opensearch';
import { CoreStart, AppMountParameters } from '../types/opensearch';
import { OpenSearchCasesPluginStartDeps } from './plugin';
import { CasesApp } from './components/CasesApp';

export const renderApp = (
  coreStart: CoreStart,
  depsStart: OpenSearchCasesPluginStartDeps,
  { appBasePath, element, history }: AppMountParameters
) => {
  ReactDOM.render(
    <I18nProvider>
      <BrowserRouter>
        <CasesApp
          basename={appBasePath}
          notifications={coreStart.notifications}
          http={coreStart.http}
          navigation={depsStart.navigation}
          data={depsStart.data}
          visualizations={depsStart.visualizations}
          dashboard={depsStart.dashboard}
        />
      </BrowserRouter>
    </I18nProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};