import React, { useState, useEffect, useRef } from 'react';
import {
  EuiPanel,
  EuiTitle,
  EuiText,
  EuiButton,
  EuiButtonIcon,
  EuiPopover,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiLoadingSpinner,
  EuiEmptyPrompt,
  EuiIcon,
  EuiDatePicker,
  EuiFormRow,
  EuiSelect,
} from '@elastic/eui';
import { useCases } from '../context/CasesContext';

interface VisualizationEmbedProps {
  visualizationId: string;
  title?: string;
  height?: number;
  showControls?: boolean;
  timeRange?: {
    from: string;
    to: string;
  };
  onVisualizationLoad?: (data: any) => void;
  onVisualizationError?: (error: any) => void;
}

export const VisualizationEmbed: React.FC<VisualizationEmbedProps> = ({
  visualizationId,
  title,
  height = 400,
  showControls = true,
  timeRange,
  onVisualizationLoad,
  onVisualizationError,
}) => {
  const [visualization, setVisualization] = useState<any>(null);
  const [visualizationData, setVisualizationData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentTimeRange, setCurrentTimeRange] = useState(timeRange || {
    from: 'now-24h',
    to: 'now',
  });
  const [refreshInterval, setRefreshInterval] = useState('off');
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { http } = useCases();

  useEffect(() => {
    loadVisualization();
  }, [visualizationId]);

  useEffect(() => {
    if (visualization) {
      loadVisualizationData();
    }
  }, [visualization, currentTimeRange]);

  useEffect(() => {
    // Set up auto-refresh
    if (refreshInterval !== 'off') {
      const interval = parseInt(refreshInterval) * 1000;
      refreshIntervalRef.current = setInterval(() => {
        loadVisualizationData();
      }, interval);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [refreshInterval]);

  const loadVisualization = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await http.get(`/api/visualizations/${visualizationId}`);
      setVisualization(response.data);
      
      if (onVisualizationLoad) {
        onVisualizationLoad(response.data);
      }
    } catch (err) {
      const errorMessage = 'Failed to load visualization';
      setError(errorMessage);
      
      if (onVisualizationError) {
        onVisualizationError(err);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadVisualizationData = async () => {
    if (!visualization) return;

    try {
      const response = await http.post(`/api/visualizations/${visualizationId}/data`, {
        timeRange: currentTimeRange,
      });
      setVisualizationData(response.data);
    } catch (err) {
      console.error('Error loading visualization data:', err);
    }
  };

  const handleTimeRangeChange = (newTimeRange: any) => {
    setCurrentTimeRange(newTimeRange);
  };

  const handleRefresh = () => {
    loadVisualizationData();
  };

  const handleCreateSnapshot = async () => {
    try {
      const response = await http.post(`/api/visualizations/${visualizationId}/snapshot`, {
        timeRange: currentTimeRange,
      });
      console.log('Snapshot created:', response.data);
    } catch (err) {
      console.error('Error creating snapshot:', err);
    }
  };

  const renderVisualizationContent = () => {
    if (!visualization || !visualizationData) {
      return (
        <EuiEmptyPrompt
          icon={<EuiIcon type="visLine" size="xl" />}
          title={<h3>No visualization data</h3>}
          body={<p>Unable to load visualization data</p>}
        />
      );
    }

    // Render based on visualization type
    switch (visualization.type) {
      case 'line':
      case 'area':
        return renderTimeSeriesChart();
      case 'pie':
        return renderPieChart();
      case 'histogram':
        return renderHistogram();
      case 'table':
        return renderTable();
      default:
        return renderGenericVisualization();
    }
  };

  const renderTimeSeriesChart = () => {
    // Simple time series representation
    return (
      <div style={{ height: height - 100, padding: '20px' }}>
        <EuiText>
          <h4>Time Series Chart</h4>
          <p>Data points: {visualizationData.data?.length || 0}</p>
          <p>Total records: {visualizationData.total || 0}</p>
        </EuiText>
        {/* In a real implementation, you'd use a charting library like @elastic/charts */}
      </div>
    );
  };

  const renderPieChart = () => {
    return (
      <div style={{ height: height - 100, padding: '20px' }}>
        <EuiText>
          <h4>Pie Chart</h4>
          <p>Categories: {visualizationData.data?.length || 0}</p>
          <p>Total records: {visualizationData.total || 0}</p>
        </EuiText>
      </div>
    );
  };

  const renderHistogram = () => {
    return (
      <div style={{ height: height - 100, padding: '20px' }}>
        <EuiText>
          <h4>Histogram</h4>
          <p>Buckets: {visualizationData.data?.length || 0}</p>
          <p>Total records: {visualizationData.total || 0}</p>
        </EuiText>
      </div>
    );
  };

  const renderTable = () => {
    return (
      <div style={{ height: height - 100, padding: '20px' }}>
        <EuiText>
          <h4>Data Table</h4>
          <p>Rows: {visualizationData.data?.length || 0}</p>
          <p>Total records: {visualizationData.total || 0}</p>
        </EuiText>
      </div>
    );
  };

  const renderGenericVisualization = () => {
    return (
      <div style={{ height: height - 100, padding: '20px' }}>
        <EuiText>
          <h4>{visualization.type.charAt(0).toUpperCase() + visualization.type.slice(1)} Visualization</h4>
          <p>Type: {visualization.type}</p>
          <p>Total records: {visualizationData.total || 0}</p>
        </EuiText>
      </div>
    );
  };

  const contextMenuItems = [
    <EuiContextMenuItem
      key="refresh"
      icon="refresh"
      onClick={() => {
        setIsMenuOpen(false);
        handleRefresh();
      }}
    >
      Refresh
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="snapshot"
      icon="camera"
      onClick={() => {
        setIsMenuOpen(false);
        handleCreateSnapshot();
      }}
    >
      Create Snapshot
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      key="fullscreen"
      icon="fullScreen"
      onClick={() => {
        setIsMenuOpen(false);
        // Open in fullscreen mode
      }}
    >
      Full Screen
    </EuiContextMenuItem>,
  ];

  if (loading) {
    return (
      <EuiPanel style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <EuiLoadingSpinner size="xl" />
      </EuiPanel>
    );
  }

  if (error) {
    return (
      <EuiPanel style={{ height }}>
        <EuiEmptyPrompt
          color="danger"
          icon={<EuiIcon type="alert" size="xl" />}
          title={<h3>Error loading visualization</h3>}
          body={<p>{error}</p>}
          actions={
            <EuiButton color="primary" onClick={loadVisualization}>
              Retry
            </EuiButton>
          }
        />
      </EuiPanel>
    );
  }

  return (
    <EuiPanel style={{ height }}>
      {showControls && (
        <>
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
            <EuiFlexItem>
              <EuiTitle size="s">
                <h3>{title || visualization?.title || 'Visualization'}</h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiFormRow label="Auto-refresh">
                    <EuiSelect
                      value={refreshInterval}
                      onChange={(e) => setRefreshInterval(e.target.value)}
                      options={[
                        { value: 'off', text: 'Off' },
                        { value: '5', text: '5s' },
                        { value: '10', text: '10s' },
                        { value: '30', text: '30s' },
                        { value: '60', text: '1m' },
                        { value: '300', text: '5m' },
                      ]}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    iconType="refresh"
                    onClick={handleRefresh}
                    aria-label="Refresh visualization"
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiPopover
                    button={
                      <EuiButtonIcon
                        iconType="boxesVertical"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        aria-label="Visualization options"
                      />
                    }
                    isOpen={isMenuOpen}
                    closePopover={() => setIsMenuOpen(false)}
                    panelPaddingSize="none"
                  >
                    <EuiContextMenuPanel items={contextMenuItems} />
                  </EuiPopover>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
        </>
      )}
      
      {renderVisualizationContent()}
    </EuiPanel>
  );
};