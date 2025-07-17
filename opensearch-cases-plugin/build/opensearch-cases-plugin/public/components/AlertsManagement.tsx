import React, { useState, useEffect } from 'react';
import {
  EuiBasicTable,
  EuiButton,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiPanel,
  EuiStat,
  EuiPopover,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiIcon,
  EuiFieldSearch,
  EuiSelect,
  EuiFormRow,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiForm,
  EuiFormLabel,
  EuiTextArea,
  EuiComboBox,
} from '@elastic/eui';
import { useCases } from '../context/CasesContext';

interface Alert {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'acknowledged' | 'completed';
  monitor_id: string;
  trigger_id: string;
  created_at: string;
  updated_at: string;
  acknowledged_at?: string;
  completed_at?: string;
  case_id?: string;
  opensearch_query?: any;
  visualization_id?: string;
}

export const AlertsManagement: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [isCreateCaseModalOpen, setIsCreateCaseModalOpen] = useState(false);
  const [caseTitle, setCaseTitle] = useState('');
  const [caseDescription, setCaseDescription] = useState('');
  const [casePriority, setCasePriority] = useState('medium');
  const [caseTags, setCaseTags] = useState<Array<{ label: string }>>([]);
  const [assignedTo, setAssignedTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const { createCase, http } = useCases();

  useEffect(() => {
    loadAlerts();
  }, [statusFilter, severityFilter, searchQuery, pageIndex, pageSize]);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (severityFilter !== 'all') params.append('severity', severityFilter);
      if (searchQuery) params.append('search', searchQuery);
      params.append('offset', String(pageIndex * pageSize));
      params.append('limit', String(pageSize));

      const response = await http.get(`/api/alerts?${params}`);
      setAlerts(response.data);
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (alertId: string, newStatus: string) => {
    try {
      await http.put(`/api/alerts/${alertId}`, { status: newStatus });
      loadAlerts();
    } catch (error) {
      console.error('Error updating alert status:', error);
    }
  };

  const handleCreateCaseFromAlert = async () => {
    if (!selectedAlert) return;

    try {
      const caseData = {
        title: caseTitle || `Case for Alert: ${selectedAlert.title}`,
        description: caseDescription || `Case created from alert: ${selectedAlert.description}`,
        priority: casePriority,
        tags: caseTags.map(tag => tag.label),
        assigned_to: assignedTo,
        assigned_to_name: assignedTo,
        created_by: 'current_user',
        created_by_name: 'Current User',
        alert_id: selectedAlert.id,
        opensearch_query: selectedAlert.opensearch_query,
        visualization_ids: selectedAlert.visualization_id ? [selectedAlert.visualization_id] : [],
      };

      const newCase = await createCase(caseData);
      
      // Link alert to case
      await http.post(`/api/alerts/${selectedAlert.id}/create-case`, caseData);
      
      setIsCreateCaseModalOpen(false);
      setSelectedAlert(null);
      loadAlerts();
      
      // Navigate to new case
      window.location.href = `/cases/${newCase.id}`;
    } catch (error) {
      console.error('Error creating case from alert:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'danger';
      case 'high':
        return 'warning';
      case 'medium':
        return 'primary';
      case 'low':
        return 'success';
      default:
        return 'subdued';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'danger';
      case 'acknowledged':
        return 'warning';
      case 'completed':
        return 'success';
      default:
        return 'subdued';
    }
  };

  const columns = [
    {
      field: 'title',
      name: 'Alert Title',
      render: (title: string, alert: Alert) => (
        <EuiText size="s">
          <strong>{title}</strong>
          <br />
          <small>{alert.description}</small>
        </EuiText>
      ),
    },
    {
      field: 'severity',
      name: 'Severity',
      render: (severity: string) => (
        <EuiHealth color={getSeverityColor(severity)}>
          {severity.toUpperCase()}
        </EuiHealth>
      ),
    },
    {
      field: 'status',
      name: 'Status',
      render: (status: string) => (
        <EuiHealth color={getStatusColor(status)}>
          {status.replace('_', ' ').toUpperCase()}
        </EuiHealth>
      ),
    },
    {
      field: 'created_at',
      name: 'Created',
      render: (created_at: string) => (
        <EuiText size="s">
          {new Date(created_at).toLocaleString()}
        </EuiText>
      ),
    },
    {
      field: 'case_id',
      name: 'Case',
      render: (case_id: string) => (
        case_id ? (
          <EuiButton size="s" href={`/cases/${case_id}`}>
            View Case
          </EuiButton>
        ) : (
          <EuiText size="s" color="subdued">
            No case
          </EuiText>
        )
      ),
    },
    {
      name: 'Actions',
      actions: [
        {
          name: 'Acknowledge',
          description: 'Acknowledge this alert',
          icon: 'check',
          type: 'icon',
          onClick: (alert: Alert) => handleStatusChange(alert.id, 'acknowledged'),
          available: (alert: Alert) => alert.status === 'active',
        },
        {
          name: 'Complete',
          description: 'Mark alert as completed',
          icon: 'checkInCircleFilled',
          type: 'icon',
          onClick: (alert: Alert) => handleStatusChange(alert.id, 'completed'),
          available: (alert: Alert) => alert.status !== 'completed',
        },
        {
          name: 'Create Case',
          description: 'Create a case from this alert',
          icon: 'documents',
          type: 'icon',
          onClick: (alert: Alert) => {
            setSelectedAlert(alert);
            setCaseTitle(`Case for Alert: ${alert.title}`);
            setCaseDescription(`Case created from alert: ${alert.description}`);
            setIsCreateCaseModalOpen(true);
          },
          available: (alert: Alert) => !alert.case_id,
        },
      ],
    },
  ];

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount: alerts.length,
    pageSizeOptions: [5, 10, 25, 50],
  };

  return (
    <>
      <EuiTitle size="l">
        <h2>Alerts Management</h2>
      </EuiTitle>
      <EuiSpacer size="m" />

      {/* Stats */}
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiStat
            title={String(alerts.filter(a => a.status === 'active').length)}
            description="Active Alerts"
            color="danger"
            titleSize="m"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat
            title={String(alerts.filter(a => a.status === 'acknowledged').length)}
            description="Acknowledged"
            color="warning"
            titleSize="m"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat
            title={String(alerts.filter(a => a.status === 'completed').length)}
            description="Completed"
            color="success"
            titleSize="m"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat
            title={String(alerts.filter(a => a.case_id).length)}
            description="With Cases"
            color="primary"
            titleSize="m"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="l" />

      {/* Filters */}
      <EuiPanel>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow label="Search">
              <EuiFieldSearch
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search alerts..."
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow label="Status">
              <EuiSelect
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: 'all', text: 'All Status' },
                  { value: 'active', text: 'Active' },
                  { value: 'acknowledged', text: 'Acknowledged' },
                  { value: 'completed', text: 'Completed' },
                ]}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow label="Severity">
              <EuiSelect
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                options={[
                  { value: 'all', text: 'All Severities' },
                  { value: 'critical', text: 'Critical' },
                  { value: 'high', text: 'High' },
                  { value: 'medium', text: 'Medium' },
                  { value: 'low', text: 'Low' },
                ]}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>

      <EuiSpacer size="l" />

      {/* Alerts Table */}
      <EuiBasicTable
        items={alerts}
        columns={columns}
        pagination={pagination}
        loading={loading}
        onChange={({ page }) => {
          if (page) {
            setPageIndex(page.index);
            setPageSize(page.size);
          }
        }}
      />

      {/* Create Case Modal */}
      {isCreateCaseModalOpen && (
        <EuiModal onClose={() => setIsCreateCaseModalOpen(false)}>
          <EuiModalHeader>
            <EuiModalHeaderTitle>Create Case from Alert</EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiForm>
              <EuiFormRow label="Case Title">
                <EuiFieldSearch
                  value={caseTitle}
                  onChange={(e) => setCaseTitle(e.target.value)}
                  placeholder="Enter case title"
                />
              </EuiFormRow>
              <EuiFormRow label="Description">
                <EuiTextArea
                  value={caseDescription}
                  onChange={(e) => setCaseDescription(e.target.value)}
                  placeholder="Enter case description"
                  rows={3}
                />
              </EuiFormRow>
              <EuiFormRow label="Priority">
                <EuiSelect
                  value={casePriority}
                  onChange={(e) => setCasePriority(e.target.value)}
                  options={[
                    { value: 'low', text: 'Low' },
                    { value: 'medium', text: 'Medium' },
                    { value: 'high', text: 'High' },
                    { value: 'critical', text: 'Critical' },
                  ]}
                />
              </EuiFormRow>
              <EuiFormRow label="Tags">
                <EuiComboBox
                  selectedOptions={caseTags}
                  onCreateOption={(searchValue) => {
                    const newOption = { label: searchValue };
                    setCaseTags([...caseTags, newOption]);
                  }}
                  onChange={(selectedOptions) => setCaseTags(selectedOptions)}
                  placeholder="Add tags"
                />
              </EuiFormRow>
              <EuiFormRow label="Assigned To">
                <EuiFieldSearch
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  placeholder="Enter assignee"
                />
              </EuiFormRow>
            </EuiForm>
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButton onClick={() => setIsCreateCaseModalOpen(false)}>
              Cancel
            </EuiButton>
            <EuiButton fill onClick={handleCreateCaseFromAlert}>
              Create Case
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      )}
    </>
  );
};