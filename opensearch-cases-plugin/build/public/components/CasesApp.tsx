import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiTitle,
  EuiSpacer,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiGlobalToastList,
  EuiButtonIcon,
  EuiContextMenu,
  EuiPopover,
} from '@elastic/eui';
import { CoreStart } from '../../../../src/core/public';
import { NavigationPublicPluginStart } from '../../../../src/plugins/navigation/public';
import { DataPublicPluginStart } from '../../../../src/plugins/data/public';
import { VisualizationsStart } from '../../../../src/plugins/visualizations/public';
import { DashboardStart } from '../../../../src/plugins/dashboard/public';
import { CasesDashboard } from './CasesDashboard';
import { CaseDetail } from './CaseDetail';
import { CreateCase } from './CreateCase';
import { EditCase } from './EditCase';
import { AlertsManagement } from './AlertsManagement';
import { CasesProvider } from '../context/CasesContext';

interface CasesAppProps {
  basename: string;
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
  navigation: NavigationPublicPluginStart;
  data: DataPublicPluginStart;
  visualizations: VisualizationsStart;
  dashboard: DashboardStart;
}

export const CasesApp: React.FC<CasesAppProps> = ({
  basename,
  notifications,
  http,
  navigation,
  data,
  visualizations,
  dashboard,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [toasts, setToasts] = useState<any[]>([]);

  const addToast = (toast: any) => {
    setToasts([...toasts, { ...toast, id: Date.now() }]);
  };

  const removeToast = (id: string) => {
    setToasts(toasts.filter(toast => toast.id !== id));
  };

  const contextMenuItems = [
    {
      name: 'Cases',
      icon: 'documents',
      onClick: () => {
        setIsMenuOpen(false);
        window.location.href = `${basename}/cases`;
      },
    },
    {
      name: 'Alerts',
      icon: 'alert',
      onClick: () => {
        setIsMenuOpen(false);
        window.location.href = `${basename}/alerts`;
      },
    },
    {
      name: 'Settings',
      icon: 'gear',
      onClick: () => {
        setIsMenuOpen(false);
        // Navigate to settings
      },
    },
  ];

  return (
    <CasesProvider
      http={http}
      notifications={notifications}
      data={data}
      visualizations={visualizations}
      dashboard={dashboard}
    >
      <EuiPage>
        <EuiPageBody>
          <EuiPageHeader>
            <EuiPageHeaderSection>
              <EuiFlexGroup alignItems="center" gutterSize="m">
                <EuiFlexItem grow={false}>
                  <EuiIcon type="documents" size="xl" />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiTitle size="l">
                    <h1>Cases</h1>
                  </EuiTitle>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPageHeaderSection>
            <EuiPageHeaderSection>
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    iconType="plus"
                    href={`${basename}/cases/new`}
                  >
                    Create Case
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiPopover
                    button={
                      <EuiButtonIcon
                        iconType="boxesVertical"
                        aria-label="More options"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                      />
                    }
                    isOpen={isMenuOpen}
                    closePopover={() => setIsMenuOpen(false)}
                    panelPaddingSize="none"
                    anchorPosition="downLeft"
                  >
                    <EuiContextMenu
                      initialPanelId={0}
                      panels={[
                        {
                          id: 0,
                          items: contextMenuItems,
                        },
                      ]}
                    />
                  </EuiPopover>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPageHeaderSection>
          </EuiPageHeader>

          <EuiPageContent>
            <EuiPageContentBody>
              <Routes>
                <Route path="/cases" element={<CasesDashboard />} />
                <Route path="/cases/new" element={<CreateCase />} />
                <Route path="/cases/:id" element={<CaseDetail />} />
                <Route path="/cases/:id/edit" element={<EditCase />} />
                <Route path="/alerts" element={<AlertsManagement />} />
                <Route path="/" element={<Navigate to="/cases" replace />} />
              </Routes>
            </EuiPageContentBody>
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>

      <EuiGlobalToastList
        toasts={toasts}
        dismissToast={removeToast}
        toastLifeTimeMs={6000}
      />
    </CasesProvider>
  );
};