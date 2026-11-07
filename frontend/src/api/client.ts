import { 
  AuthResponse, 
  User, 
  Project, 
  FileTreeNode, 
  FileContentResponse, 
  ComponentExplanation, 
  SystemHealth,
  Finding,
  ScanJob,
  ScannerStatusMap,
  MentorExplanation,
  MentorHint,
  ReproductionResult,
  RepairSession,
  SaveDraftResponse,
  VerificationResponse,
  RepairPatchHistoryItem,
  SocraticHintResponse,
  SocraticQuestionResponse,
  ChallengeListItem,
  ChallengeDetailResponse,
  ChallengeAttemptResponse,
  ChallengeGradeResponse,
  LearningAnalyticsOverview,
  MentorMemoryRecord
} from '../types';

// Same-origin by default: Vite proxies locally; nginx proxies in production.
// Support both documented environment names and avoid duplicated /api/v1.
const configuredApi = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
const API_BASE = configuredApi
  ? configuredApi.endsWith('/api/v1') ? configuredApi : `${configuredApi}/api/v1`
  : '/api/v1';

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('proofforge_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response: Response;
    try {
      response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    } catch {
      throw new Error('Cannot reach the server. Please check your connection and try again.');
    }

    if (response.status === 401) {
      // Clear token on 401
      localStorage.removeItem('proofforge_token');
      localStorage.removeItem('proofforge_user');
      if (!window.location.pathname.startsWith('/auth')) {
        window.location.href = '/auth';
      }
    }

    if (!response.ok) {
      let errorMsg = `HTTP Error ${response.status}`;
      try {
        const errJson = await response.json();
        errorMsg = errJson.error?.message || errJson.detail || errorMsg;
      } catch {
        // fallback
      }
      throw new Error(errorMsg);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // System & Health
  async getHealth(): Promise<{ status: string; app: string }> {
    return this.request('/health');
  }

  async getDbHealth(): Promise<SystemHealth> {
    return this.request('/health/db');
  }

  // Auth
  async register(data: { email: string; password: string; full_name?: string }): Promise<AuthResponse> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: { email: string; password: string }): Promise<AuthResponse> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async firebaseLogin(idToken: string): Promise<AuthResponse> {
    return this.request('/auth/firebase-login', {
      method: 'POST',
      body: JSON.stringify({ id_token: idToken }),
    });
  }

  async getMe(): Promise<User> {
    return this.request('/auth/me');
  }

  async getMentorMemory(projectId: number): Promise<MentorMemoryRecord> {
    return this.request(`/projects/${projectId}/mentor-memory`);
  }

  async saveMentorMemory(
    projectId: number,
    data: Pick<MentorMemoryRecord, 'goal' | 'teaching_mode' | 'learned_topics' | 'conversation'>,
  ): Promise<MentorMemoryRecord> {
    return this.request(`/projects/${projectId}/mentor-memory`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Projects
  async listProjects(): Promise<Project[]> {
    return this.request('/projects/');
  }

  async getProject(id: number): Promise<Project> {
    return this.request(`/projects/${id}`);
  }

  async createProject(data: { name: string; repo_url?: string; framework?: string; language?: string }): Promise<Project> {
    return this.request('/projects/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async importRepo(data: { repo_url: string; branch?: string }): Promise<Project> {
    return this.request('/projects/import', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteProject(id: number): Promise<void> {
    return this.request(`/projects/${id}`, {
      method: 'DELETE',
    });
  }

  // Explorer & Codebase Intelligence
  async getProjectFiles(projectId: number): Promise<{ project_id: number; commit_sha?: string; tree: FileTreeNode[] }> {
    return this.request(`/projects/${projectId}/files`);
  }

  async getFileContent(projectId: number, path: string): Promise<FileContentResponse> {
    return this.request(`/projects/${projectId}/file-content?path=${encodeURIComponent(path)}`);
  }

  async explainComponent(projectId: number, data: { file_path: string; symbol_name?: string; query?: string }): Promise<ComponentExplanation> {
    return this.request(`/projects/${projectId}/explain`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Milestone B: Security Audit Engine
  async getScannerStatuses(): Promise<ScannerStatusMap> {
    return this.request('/findings/scanners/status');
  }

  async runSecurityScan(projectId: number): Promise<ScanJob> {
    return this.request(`/projects/${projectId}/scan`, {
      method: 'POST',
    });
  }

  async getProjectScans(projectId: number): Promise<ScanJob[]> {
    return this.request(`/projects/${projectId}/scans`);
  }

  async getProjectFindings(
    projectId: number, 
    filters?: { severity?: string; category?: string; scanner?: string }
  ): Promise<Finding[]> {
    const params = new URLSearchParams();
    if (filters?.severity && filters.severity !== 'all') params.append('severity', filters.severity);
    if (filters?.category && filters.category !== 'all') params.append('category', filters.category);
    if (filters?.scanner && filters.scanner !== 'all') params.append('scanner', filters.scanner);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/projects/${projectId}/findings${qs}`);
  }

  async getFinding(findingId: number): Promise<Finding> {
    return this.request(`/findings/${findingId}`);
  }

  // Milestone B: AI Engineering Mentor
  async explainFinding(findingId: number): Promise<MentorExplanation> {
    return this.request(`/findings/${findingId}/mentor/explain`, {
      method: 'POST',
    });
  }

  async getFindingHint(findingId: number, level: number): Promise<MentorHint> {
    return this.request(`/findings/${findingId}/mentor/hint`, {
      method: 'POST',
      body: JSON.stringify({ level }),
    });
  }

  // Milestone B: Controlled Defect Reproduction
  async reproduceDefect(findingId: number, targetMode: 'auto' | 'fixture' | 'repository' = 'auto'): Promise<ReproductionResult> {
    return this.request(`/findings/${findingId}/reproduce?target_mode=${targetMode}`, {
      method: 'POST',
    });
  }

  // Milestone C: Phase 8 & 9 Guided Repair Studio & Verification
  async createOrResumeRepairSession(projectId: number, findingId: number, fixtureId = 'fixture_idor'): Promise<RepairSession> {
    return this.request(`/projects/${projectId}/findings/${findingId}/repair-session`, {
      method: 'POST',
      body: JSON.stringify({ finding_id: findingId, fixture_id: fixtureId }),
    });
  }

  async getRepairSession(sessionId: number): Promise<RepairSession> {
    return this.request(`/repair-sessions/${sessionId}`);
  }

  async saveRepairDraft(sessionId: number, filePath: string, code: string): Promise<SaveDraftResponse> {
    return this.request(`/repair-sessions/${sessionId}/draft`, {
      method: 'PUT',
      body: JSON.stringify({ file_path: filePath, code }),
    });
  }

  async resetRepairWorkspace(sessionId: number): Promise<{ session_id: number; file_path: string; editable_code: string; diff: string; status: string }> {
    return this.request(`/repair-sessions/${sessionId}/reset`, {
      method: 'POST',
    });
  }

  async requestRepairHint(sessionId: number, level: number): Promise<SocraticHintResponse> {
    return this.request(`/repair-sessions/${sessionId}/hints`, {
      method: 'POST',
      body: JSON.stringify({ level }),
    });
  }

  async askRepairCoach(sessionId: number, question: string): Promise<SocraticQuestionResponse> {
    return this.request(`/repair-sessions/${sessionId}/coach`, {
      method: 'POST',
      body: JSON.stringify({ question }),
    });
  }

  async verifyRepairPatch(sessionId: number, filePath: string, code: string): Promise<VerificationResponse> {
    return this.request(`/repair-sessions/${sessionId}/verify`, {
      method: 'POST',
      body: JSON.stringify({ file_path: filePath, code }),
    });
  }

  async getRepairPatches(sessionId: number): Promise<RepairPatchHistoryItem[]> {
    return this.request(`/repair-sessions/${sessionId}/patches`);
  }

  // Milestone C: Phase 10 Independent Skill Transfer Lab
  async listChallenges(): Promise<ChallengeListItem[]> {
    return this.request('/challenges');
  }

  async getChallenge(challengeId: string): Promise<ChallengeDetailResponse> {
    return this.request(`/challenges/${challengeId}`);
  }

  async startChallengeAttempt(challengeId: string): Promise<ChallengeAttemptResponse> {
    return this.request(`/challenges/${challengeId}/start`, {
      method: 'POST',
    });
  }

  async saveChallengeDraft(attemptId: number, code: string): Promise<{ attempt_id: number; saved: boolean; diff: string }> {
    return this.request(`/challenges/attempts/${attemptId}/draft`, {
      method: 'PUT',
      body: JSON.stringify({ code }),
    });
  }

  async submitChallengeAttempt(attemptId: number, code: string): Promise<ChallengeGradeResponse> {
    return this.request(`/challenges/attempts/${attemptId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  async getChallengeHint(attemptId: number): Promise<{ attempt_id: number; hint_number: number; hint_text: string }> {
    return this.request(`/challenges/attempts/${attemptId}/hint`, {
      method: 'POST',
    });
  }

  // Milestone C: Learning Analytics
  async getLearningAnalytics(): Promise<LearningAnalyticsOverview> {
    return this.request('/analytics/overview');
  }
}

export const api = new ApiClient();
