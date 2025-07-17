export interface OpenSearchCasesPluginSetup {}
export interface OpenSearchCasesPluginStart {}

export interface Case {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  assigned_to?: string;
  assigned_to_name?: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  comments_count: number;
  attachments_count: number;
  alert_id?: string;
  opensearch_query?: any;
  visualization_ids: string[];
}

export interface Comment {
  id: string;
  case_id: string;
  author: string;
  author_name: string;
  content: string;
  comment_type: 'user' | 'system';
  created_at: string;
  updated_at?: string;
}

export interface Alert {
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

export interface FileAttachment {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  uploaded_at: string;
  case_id: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  created_at: string;
}

export interface Visualization {
  id: string;
  title: string;
  type: string;
  query: any;
  config: any;
}

export interface CaseCreateRequest {
  title: string;
  description: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  tags?: string[];
  assigned_to?: string;
  assigned_to_name?: string;
  created_by: string;
  created_by_name: string;
  alert_id?: string;
  opensearch_query?: any;
  visualization_ids?: string[];
}

export interface CaseUpdateRequest {
  title?: string;
  description?: string;
  status?: 'open' | 'in_progress' | 'closed';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  tags?: string[];
  assigned_to?: string;
  assigned_to_name?: string;
  visualization_ids?: string[];
}

export interface CommentCreateRequest {
  content: string;
  author: string;
  author_name: string;
  comment_type?: 'user' | 'system';
}

export interface AlertCreateRequest {
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  monitor_id: string;
  trigger_id: string;
  opensearch_query?: any;
  visualization_id?: string;
}

export interface ServiceDependencies {
  casesService: any;
  alertsService: any;
  visualizationsService: any;
  logger: any;
}