/**
 * Typed API client for Pramaan backend.
 * All requests go through /api/v1 and include dev auth headers.
 */

const API_BASE = '/api/v1';

type DevRole = 'officer' | 'admin' | 'bidder' | 'vigilance';

let currentDevRole: DevRole = 'officer';

export function setDevRole(role: DevRole) {
  currentDevRole = role;
}

export function getDevRole(): DevRole {
  return currentDevRole;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'X-Dev-Role': currentDevRole,
    ...(options.headers as Record<string, string> || {}),
  };

  // Don't set Content-Type for FormData (browser sets multipart boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(error?.error?.message || `Request failed: ${res.status}`);
  }

  return res.json();
}

// ── Auth ──
export const api = {
  // Session
  getSession: () => request<ApiResponse<SessionData>>('/auth/session'),

  // Tenders
  getTenders: () => request<ApiResponse<TenderItem[]>>('/tenders'),

  // Applications
  getApplications: (params?: { tender_id?: string; page?: number; q?: string }) => {
    const qs = new URLSearchParams();
    if (params?.tender_id) qs.set('tender_id', params.tender_id);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.q) qs.set('q', params.q);
    const query = qs.toString();
    return request<PaginatedResponse<ApplicationItem>>(`/bid-applications${query ? `?${query}` : ''}`);
  },

  getApplicationDetail: (id: string) =>
    request<ApiResponse<ApplicationDetail>>(`/bid-applications/${id}`),

  createApplication: (body: { tender_id: string; bidder_id: string }) =>
    request<{ success: boolean; application_id: string; status: string }>('/bid-applications', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // Documents
  uploadDocument: (applicationId: string, file: File, docType: string) => {
    const form = new FormData();
    form.append('file', file);
    form.append('doc_type', docType);
    return request<{ success: boolean; document_id: string; doc_type: string; version: number }>(
      `/bid-applications/${applicationId}/documents`,
      { method: 'POST', body: form },
    );
  },

  getDocument: (id: string) => request<ApiResponse<DocumentDetail>>(`/documents/${id}`),

  submitApplication: (applicationId: string) =>
    request<{ success: boolean; status: string }>(`/bid-applications/${applicationId}/submit`, {
      method: 'POST',
    }),

  triggerProcessing: (applicationId: string) =>
    request<{ success: boolean; status: string }>(`/bid-applications/${applicationId}/process`, {
      method: 'POST',
    }),

  // Decisions
  recordDecision: (applicationId: string, body: DecisionBody) =>
    request<{ success: boolean; decision_id: string; case_status: string }>(
      `/bid-applications/${applicationId}/decision`,
      { method: 'POST', body: JSON.stringify(body) },
    ),

  reopenCase: (applicationId: string, remarks: string) =>
    request<{ success: boolean }>(`/bid-applications/${applicationId}/reopen`, {
      method: 'POST',
      body: JSON.stringify({ remarks }),
    }),

  requestClarification: (applicationId: string, remarks: string) =>
    request<{ success: boolean }>(`/bid-applications/${applicationId}/clarification`, {
      method: 'POST',
      body: JSON.stringify({ remarks }),
    }),

  // Audit
  getAuditTrail: (applicationId: string) =>
    request<ApiResponse<AuditTrailData>>(`/audit/${applicationId}`),

  // Check types
  getCheckTypes: () => request<ApiResponse<CheckTypeItem[]>>('/check-types'),

  // Tender rules
  getTenderRules: (tenderId: string) =>
    request<ApiResponse<RuleItem[]>>(`/tenders/${tenderId}/eligibility-rules`),

  // Admin
  admin: {
    getTenders: () => request<ApiResponse<AdminTenderItem[]>>('/admin/tenders'),
    createTender: (body: CreateTenderBody) =>
      request<{ success: boolean; id: string }>('/admin/tenders', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    getCheckTypes: () => request<ApiResponse<CheckTypeItem[]>>('/admin/check-types'),
    createCheckType: (body: { name: string; source_system: string; mandatory: boolean }) =>
      request<{ success: boolean; id: string }>('/admin/check-types', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    createRuleSet: (body: RuleSetBody) =>
      request<{ success: boolean; id: string; version: number }>('/admin/rule-sets', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    getUsers: () => request<ApiResponse<UserItem[]>>('/admin/users'),
    createUser: (body: CreateUserBody) =>
      request<{ success: boolean; id: string }>('/admin/users', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    createBidder: (body: CreateBidderBody) =>
      request<{ success: boolean; id: string }>('/admin/bidders', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    assignRuleSet: (tenderId: string, ruleSetId: string) =>
      request<{ success: boolean }>(`/admin/tenders/${tenderId}/assign-rule-set?rule_set_id=${ruleSetId}`, {
        method: 'POST',
      }),
    assignOfficer: (tenderId: string, officerId: string) =>
      request<{ success: boolean }>(`/admin/tenders/${tenderId}/assign-officer?officer_id=${officerId}`, {
        method: 'POST',
      }),
  },

  // Bidder
  bidder: {
    getMyTenders: () => request<ApiResponse<BidderTenderItem[]>>('/bidder/my-tenders'),
    getApplication: (id: string) =>
      request<ApiResponse<BidderApplicationDetail>>(`/bidder/applications/${id}`),
    getAvailableTenders: () => request<ApiResponse<AvailableTenderItem[]>>('/bidder/available-tenders'),
  },

  // Intelligence
  intelligence: {
    getBidRigging: (tenderId?: string) => {
      const qs = tenderId ? `?tender_id=${encodeURIComponent(tenderId)}` : '';
      return request<ApiResponse<BidRiggingReport>>(`/intelligence/bid-rigging${qs}`);
    },
    getDocTamper: (applicationId: string) =>
      request<ApiResponse<DocTamperReport>>(`/intelligence/doc-tamper/${applicationId}`),
    getHealthCheck: (applicationId: string) =>
      request<ApiResponse<HealthCheckResult>>(`/intelligence/health-check/${applicationId}`),
    getCrossTender: (bidderId: string) =>
      request<ApiResponse<CrossTenderReport>>(`/intelligence/cross-tender/${bidderId}`),
  },
};

// ── Types ──
export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  page: number;
  limit: number;
  total: number;
  data: T[];
}

export interface SessionData {
  id: string;
  full_name: string;
  role: string;
  csrf_token: string;
}

export interface TenderItem {
  id: string;
  title: string;
  gem_bid_number: string;
  category: string;
  closing_date: string;
}

export interface ApplicationItem {
  id: string;
  bidder_name: string;
  tender_title: string;
  status: string;
  overall_score: number | null;
  risk_level: string;
  submitted_at: string | null;
}

export interface DocumentInfo {
  id: string;
  doc_type: string;
  version: number;
  extraction_status: string;
  extraction_confidence?: number | null;
}

export interface CheckInfo {
  id: string;
  name: string;
  result: string;
  source: string;
  severity: string | null;
  evidence: Record<string, unknown> | null;
}

export interface ScoreInfo {
  overall_score: number | null;
  risk_level: string;
  score_breakdown: Record<string, unknown>;
}

export interface RecommendationInfo {
  text: string;
  suggested_action: string;
  model_used: string;
}

export interface DecisionInfo {
  id: string;
  decision_value: string;
  remarks: string;
  decided_at: string;
}

export interface ApplicationDetail {
  id: string;
  status: string;
  bidder_name: string;
  tender_title: string;
  documents: DocumentInfo[];
  checks?: CheckInfo[];
  score?: ScoreInfo | null;
  recommendation?: RecommendationInfo | null;
  decisions?: DecisionInfo[];
}

export interface DocumentDetail {
  id: string;
  application_id: string;
  doc_type: string;
  version: number;
  extraction_status: string;
  extracted_fields: Record<string, unknown> | null;
  extraction_confidence: number | null;
  uploaded_at: string;
}

export interface DecisionBody {
  decision_value: 'qualify' | 'disqualify' | 'request_more_info';
  remarks: string;
  overrode_ai_recommendation?: boolean;
}

export interface AuditEvent {
  id: string;
  actor: string;
  action: string;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
  event_at: string;
  event_hash: string;
}

export interface AuditTrailData {
  chain_verified: boolean;
  events: AuditEvent[];
}

export interface CheckTypeItem {
  id: string;
  name: string;
  source_system: string;
  mandatory?: boolean;
}

export interface RuleItem {
  id: string;
  check_type_id: string;
  name: string;
  condition: Record<string, unknown>;
  is_mandatory: boolean;
  severity_if_fail: string;
}

export interface AdminTenderItem {
  id: string;
  gem_bid_number: string;
  title: string;
  category: string;
  closing_date: string;
  rule_set_id: string | null;
}

export interface CreateTenderBody {
  gem_bid_number: string;
  title: string;
  category: string;
  estimated_value?: number;
  closing_date: string;
}

export interface RuleSetBody {
  rules: Array<{
    check_type_id: string;
    condition: { field: string; op: string; value: unknown };
    is_mandatory: boolean;
    severity_if_fail: string;
  }>;
  scoring_policy?: {
    weights: Record<string, number>;
    penalties: Record<string, number>;
    low_risk_min: number;
    medium_risk_min: number;
  };
}

export interface CreateUserBody {
  keycloak_sub: string;
  email: string;
  full_name: string;
  role: string;
}

export interface CreateBidderBody {
  legal_name: string;
  pan_number: string;
  gstin?: string;
  udyam_number?: string;
  cin?: string;
  registered_address?: string;
  user_id?: string;
}

export interface UserItem {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
}

export interface BidderTenderItem {
  application_id: string;
  tender_id: string;
  tender_title: string;
  gem_bid_number: string;
  closing_date: string;
  status: string;
  submitted_at: string | null;
}

export interface BidderApplicationDetail {
  id: string;
  status: string;
  tender_title: string;
  submitted_at: string | null;
  documents: DocumentInfo[];
}

export interface AvailableTenderItem {
  id: string;
  gem_bid_number: string;
  title: string;
  category: string;
  closing_date: string;
}

// ── Intelligence Types ──
export interface SuspectCluster {
  cluster_id: string;
  bidder_ids: string[];
  bidder_names: string[];
  signals: string[];
  risk_score: number;
  evidence: Record<string, unknown>;
}

export interface RelationshipEdge {
  source_bidder_id: string;
  target_bidder_id: string;
  source_name: string;
  target_name: string;
  relationship_type: string;
  strength: number;
  details: string;
}

export interface BidRiggingReport {
  total_tenders_analyzed: number;
  total_bidders_analyzed: number;
  suspect_clusters: SuspectCluster[];
  relationship_edges: RelationshipEdge[];
  overall_risk: string;
  summary: string;
}

export interface TamperFlag {
  category: string;
  severity: string;
  description: string;
  evidence: Record<string, unknown>;
}

export interface DocumentRisk {
  document_id: string;
  doc_type: string;
  tamper_score: number;
  flags: TamperFlag[];
  authenticity_rating: string;
}

export interface NameComparison {
  doc_type: string;
  field_name: string;
  value: string;
  matches_primary: boolean;
}

export interface DocTamperReport {
  application_id: string;
  documents_analyzed: number;
  overall_risk: string;
  overall_score: number;
  document_risks: DocumentRisk[];
  name_comparisons: NameComparison[];
  summary: string;
}

export interface HealthCheckItem {
  name: string;
  doc_type: string;
  status: string;
  icon: string;
  detail?: string | null;
}

export interface HealthWarning {
  severity: string;
  title: string;
  description: string;
  action?: string | null;
}

export interface HealthCheckResult {
  application_id: string;
  bidder_name: string;
  readiness_pct: number;
  total_items: number;
  passed_items: number;
  warning_items: number;
  missing_items: number;
  checklist: HealthCheckItem[];
  warnings: HealthWarning[];
  name_consistency: Record<string, unknown>;
  ready_to_submit: boolean;
}

export interface TenderParticipation {
  tender_id: string;
  tender_title: string;
  gem_bid_number: string;
  closing_date: string;
  status: string;
  decision?: string | null;
  compliance_score?: number | null;
  risk_level: string;
  flags: string[];
  bid_amount?: number | null;
}

export interface ScoreTrend {
  tender_title: string;
  date: string;
  score?: number | null;
  risk_level: string;
}

export interface BidderStats {
  total_participations: number;
  qualified_count: number;
  disqualified_count: number;
  pending_count: number;
  win_rate_pct: number;
  avg_compliance_score: number;
  total_flags: number;
  most_common_flag?: string | null;
}

export interface CrossTenderReport {
  bidder_id: string;
  bidder_name: string;
  pan_number: string;
  stats: BidderStats;
  participations: TenderParticipation[];
  score_trend: ScoreTrend[];
  red_flag_timeline: Array<Record<string, unknown>>;
  summary: string;
}

