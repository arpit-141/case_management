import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { casesAPI } from '../services/api';

const CasesContext = createContext();

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
    priority_stats: {}
  }
};

const casesReducer = (state, action) => {
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
        cases: state.cases.map(c => c.id === action.payload.id ? action.payload : c),
        currentCase: state.currentCase?.id === action.payload.id ? action.payload : state.currentCase
      };
    case 'DELETE_CASE':
      return {
        ...state,
        cases: state.cases.filter(c => c.id !== action.payload)
      };
    case 'SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload } };
    case 'SET_STATS':
      return { ...state, stats: action.payload };
    default:
      return state;
  }
};

export const CasesProvider = ({ children }) => {
  const [state, dispatch] = useReducer(casesReducer, initialState);

  const setLoading = useCallback((loading) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, []);

  const setError = useCallback((error) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  const fetchCases = useCallback(async (filters = {}) => {
    setLoading(true);
    try {
      const cases = await casesAPI.getCases(filters);
      dispatch({ type: 'SET_CASES', payload: cases });
    } catch (error) {
      setError(error.message);
    }
  }, [setLoading, setError]);

  const fetchCase = useCallback(async (id) => {
    setLoading(true);
    try {
      const caseData = await casesAPI.getCase(id);
      dispatch({ type: 'SET_CURRENT_CASE', payload: caseData });
    } catch (error) {
      setError(error.message);
    }
  }, [setLoading, setError]);

  const createCase = useCallback(async (caseData) => {
    setLoading(true);
    try {
      const newCase = await casesAPI.createCase(caseData);
      dispatch({ type: 'ADD_CASE', payload: newCase });
      return newCase;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  }, [setLoading, setError]);

  const updateCase = useCallback(async (id, updates) => {
    setLoading(true);
    try {
      const updatedCase = await casesAPI.updateCase(id, updates);
      dispatch({ type: 'UPDATE_CASE', payload: updatedCase });
      return updatedCase;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  }, [setLoading, setError]);

  const deleteCase = useCallback(async (id) => {
    setLoading(true);
    try {
      await casesAPI.deleteCase(id);
      dispatch({ type: 'DELETE_CASE', payload: id });
    } catch (error) {
      setError(error.message);
    }
  }, [setLoading, setError]);

  const setFilters = useCallback((filters) => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const stats = await casesAPI.getStats();
      dispatch({ type: 'SET_STATS', payload: stats });
    } catch (error) {
      setError(error.message);
    }
  }, [setError]);

  const value = {
    ...state,
    fetchCases,
    fetchCase,
    createCase,
    updateCase,
    deleteCase,
    setFilters,
    fetchStats,
    setError
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