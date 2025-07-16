import React from 'react';
import ReactDOM from 'react-dom';
import { Router } from 'react-router-dom';
import { I18nProvider } from '@osd/i18n/react';
import { CoreStart, AppMountParameters } from '../../../src/core/public';
import { OpenSearchCasesPluginStartDeps } from './plugin';
import { CasesApp } from './components/CasesApp';

export const renderApp = (
  coreStart: CoreStart,
  depsStart: OpenSearchCasesPluginStartDeps,
  { appBasePath, element, history }: AppMountParameters
) => {
  ReactDOM.render(
    <I18nProvider>
      <Router history={history}>
        <CasesApp
          basename={appBasePath}
          notifications={coreStart.notifications}
          http={coreStart.http}
          navigation={depsStart.navigation}
          data={depsStart.data}
          visualizations={depsStart.visualizations}
          dashboard={depsStart.dashboard}
        />
      </Router>
    </I18nProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};