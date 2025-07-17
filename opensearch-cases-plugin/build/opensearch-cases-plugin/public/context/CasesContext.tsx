import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { CoreStart } from '../../../../src/core/public';
import { NavigationPublicPluginStart } from '../../../../src/plugins/navigation/public';
import { DataPublicPluginStart } from '../../../../src/plugins/data/public';
import { VisualizationsStart } from '../../../../src/plugins/visualizations/public';
import { DashboardStart } from '../../../../src/plugins/dashboard/public';

interface CasesContextType {
  cases: any[];
  currentCase: any;
  loading: boolean;
  error: string | null;
  filters: any;
  stats: any;
  fetchCases: (filters?: any) => Promise<void>;
  fetchCase: (id: string) => Promise<void>;
  createCase: (caseData: any) => Promise<any>;
  updateCase: (id: string, updates: any) => Promise<any>;
  deleteCase: (id: string) => Promise<void>;
  setFilters: (filters: any) => void;
  fetchStats: () => Promise<void>;
  setError: (error: string | null) => void;
  http: CoreStart['http'];
  notifications: CoreStart['notifications'];
  data: DataPublicPluginStart;
  visualizations: VisualizationsStart;
  dashboard: DashboardStart;
}

const CasesContext = createContext<CasesContextType | null>(null);

interface CasesProviderProps {
  children: React.ReactNode;
  http: CoreStart['http'];
  notifications: CoreStart['notifications'];
  data: DataPublicPluginStart;
  visualizations: VisualizationsStart;
  dashboard: DashboardStart;
}

const initialState = {
  cases: [],
  currentCase: null,
  loading: false,
  error: null,
  filters: {
    status: '',
    priority: '',
    assigned_to: '',
    search: ''
  },
  stats: {
    total_cases: 0,
    open_cases: 0,
    in_progress_cases: 0,
    closed_cases: 0,
    priority_stats: {},
    total_alerts: 0,
    alert_severity_stats: {},
    alert_status_stats: {}
  }
};

const casesReducer = (state: any, action: any) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_CASES':
      return { ...state, cases: action.payload, loading: false, error: null };
    case 'SET_CURRENT_CASE':
      return { ...state, currentCase: action.payload, loading: false, error: null };
    case 'ADD_CASE':
      return { ...state, cases: [action.payload, ...state.cases] };
    case 'UPDATE_CASE':
      return {
        ...state,
        cases: state.cases.map((c: any) => c.id === action.payload.id ? action.payload : c),
        currentCase: state.currentCase?.id === action.payload.id ? action.payload : state.currentCase
      };
    case 'DELETE_CASE':
      return {
        ...state,
        cases: state.cases.filter((c: any) => c.id !== action.payload)
      };
    case 'SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload } };
    case 'SET_STATS':
      return { ...state, stats: action.payload };
    default:
      return state;
  }
};

export const CasesProvider: React.FC<CasesProviderProps> = ({
  children,
  http,
  notifications,
  data,
  visualizations,
  dashboard,
}) => {
  const [state, dispatch] = useReducer(casesReducer, initialState);

  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, []);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  const fetchCases = useCallback(async (filters = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value as string);
      });
      
      const response = await http.get(`/api/cases?${params}`);
      dispatch({ type: 'SET_CASES', payload: response.data });
    } catch (error) {
      setError('Failed to fetch cases');
    }
  }, [http, setLoading, setError]);

  const fetchCase = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const response = await http.get(`/api/cases/${id}`);
      dispatch({ type: 'SET_CURRENT_CASE', payload: response.data });
    } catch (error) {
      setError('Failed to fetch case');
    }
  }, [http, setLoading, setError]);

  const createCase = useCallback(async (caseData: any) => {
    setLoading(true);
    try {
      const response = await http.post('/api/cases', caseData);
      dispatch({ type: 'ADD_CASE', payload: response.data });
      notifications.toasts.addSuccess('Case created successfully');
      return response.data;
    } catch (error) {
      setError('Failed to create case');
      notifications.toasts.addError(error, { title: 'Error creating case' });
      throw error;
    }
  }, [http, setLoading, setError, notifications]);

  const updateCase = useCallback(async (id: string, updates: any) => {
    setLoading(true);
    try {
      const response = await http.put(`/api/cases/${id}`, updates);
      dispatch({ type: 'UPDATE_CASE', payload: response.data });
      notifications.toasts.addSuccess('Case updated successfully');
      return response.data;
    } catch (error) {
      setError('Failed to update case');
      notifications.toasts.addError(error, { title: 'Error updating case' });
      throw error;
    }
  }, [http, setLoading, setError, notifications]);

  const deleteCase = useCallback(async (id: string) => {
    setLoading(true);
    try {
      await http.delete(`/api/cases/${id}`);
      dispatch({ type: 'DELETE_CASE', payload: id });
      notifications.toasts.addSuccess('Case deleted successfully');
    } catch (error) {
      setError('Failed to delete case');
      notifications.toasts.addError(error, { title: 'Error deleting case' });
    }
  }, [http, setLoading, setError, notifications]);

  const setFilters = useCallback((filters: any) => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await http.get('/api/stats');
      dispatch({ type: 'SET_STATS', payload: response.data });
    } catch (error) {
      setError('Failed to fetch statistics');
    }
  }, [http, setError]);

  const value = {
    ...state,
    fetchCases,
    fetchCase,
    createCase,
    updateCase,
    deleteCase,
    setFilters,
    fetchStats,
    setError,
    http,
    notifications,
    data,
    visualizations,
    dashboard,
  };

  return (
    <CasesContext.Provider value={value}>
      {children}
    </CasesContext.Provider>
  );
};

export const useCases = () => {
  const context = useContext(CasesContext);
  if (!context) {
    throw new Error('useCases must be used within a CasesProvider');
  }
  return context;
};