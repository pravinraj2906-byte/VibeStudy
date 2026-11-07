import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { 
  Wrench, 
  RotateCcw, 
  Save, 
  Play, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  HelpCircle, 
  Lightbulb, 
  ArrowRight, 
  FileCode2, 
  History, 
  Send,
  Lock,
  Sparkles,
  Info,
  Terminal,
  Cpu,
  ShieldCheck,
  ShieldAlert,
  Boxes
} from 'lucide-react';
import { api } from '../api/client';
import { 
  RepairSession, 
  Finding, 
  VerificationResponse, 
  RepairPatchHistoryItem, 
  SocraticHintResponse,
  Project 
} from '../types';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyStateIllustration } from '../components/illustrations/EmptyStateIllustration';

export const GuidedRepairPage: React.FC = () => {
  const { id: paramProjectId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const projectId = paramProjectId ? parseInt(paramProjectId, 10) : 1;
  const findingIdParam = searchParams.get('finding_id');

  const [findings, setFindings] = useState<Finding[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [selectedFindingId, setSelectedFindingId] = useState<number | null>(
    findingIdParam ? parseInt(findingIdParam, 10) : null
  );
  const [session, setSession] = useState<RepairSession | null>(null);
  const [code, setCode] = useState<string>('');
  const [diff, setDiff] = useState<string>('');
  const [viewMode, setViewMode] = useState<'editor' | 'diff'>('editor');
  
  const [verification, setVerification] = useState<VerificationResponse | null>(null);
  const [patchHistory, setPatchHistory] = useState<RepairPatchHistoryItem[]>([]);
  const [unlockedHints, setUnlockedHints] = useState<Record<number, SocraticHintResponse>>({});
  
  const [coachQuestion, setCoachQuestion] = useState('');
  const [coachHistory, setCoachHistory] = useState<Array<{ q: string; a: string }>>([]);

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCoachLoading, setIsCoachLoading] = useState(false);
  const [hintLoading, setHintLoading] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        // Load projects for alternate selection
        api.listProjects().then(p => setAllProjects(p)).catch(() => null);

        const fList = await api.getProjectFindings(projectId);
        setFindings(fList);

        let targetFindingId = selectedFindingId;
        if (!targetFindingId && fList.length > 0) {
          const preferred = fList.find(f => f.cwe_id === 'CWE-639' || f.category === 'security') || fList[0];
          targetFindingId = preferred.id;
          setSelectedFindingId(preferred.id);
        }

        if (targetFindingId) {
          await loadSession(projectId, targetFindingId);
        }
      } catch (err: any) {
        console.error('Failed to initialize repair session:', err);
        setStatusMessage({ type: 'error', text: err.message || 'Failed to load repair session' });
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [projectId]);

  const loadSession = async (pId: number, fId: number) => {
    try {
      const sess = await api.createOrResumeRepairSession(pId, fId);
      setSession(sess);
      setCode(sess.editable_code);
      setDiff(sess.diff || '');

      const patches = await api.getRepairPatches(sess.id);
      setPatchHistory(patches);

      if (sess.hints_requested && sess.hints_requested.length > 0) {
        const hintMap: Record<number, SocraticHintResponse> = {};
        for (const lvl of sess.hints_requested) {
          try {
            const h = await api.requestRepairHint(sess.id, lvl);
            hintMap[lvl] = h;
          } catch {
            // Ignore missing hint
          }
        }
        setUnlockedHints(hintMap);
      }
    } catch (err: any) {
      console.error('Error loading session:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Could not resume repair session' });
    }
  };

  const handleSaveDraft = async () => {
    if (!session) return;
    try {
      setIsSaving(true);
      const res = await api.saveRepairDraft(session.id, session.file_path, code);
      setDiff(res.diff);
      setStatusMessage({ type: 'success', text: 'Draft saved in isolated practice workspace.' });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to save draft' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!session) return;
    if (!window.confirm('Reset this workspace to original template? Unsaved changes will be discarded.')) return;
    try {
      const res = await api.resetRepairWorkspace(session.id);
      setCode(res.editable_code);
      setDiff('');
      setVerification(null);
      setStatusMessage({ type: 'info', text: 'Workspace reset to original template.' });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to reset workspace' });
    }
  };

  const handleVerify = async () => {
    if (!session) return;
    try {
      setIsVerifying(true);
      setStatusMessage({ type: 'info', text: 'Executing patch in hardened Docker sandbox (proofforge-sandbox:latest)...' });
      
      const result = await api.verifyRepairPatch(session.id, session.file_path, code);
      setVerification(result);
      setDiff(result.diff);

      const patches = await api.getRepairPatches(session.id);
      setPatchHistory(patches);

      if (result.verification_status === 'VERIFIED_FIXED') {
        setStatusMessage({ type: 'success', text: '🎉 Patch VERIFIED_FIXED! All security and regression tests passed.' });
      } else if (result.verification_status === 'REGRESSION_DETECTED') {
        setStatusMessage({ type: 'error', text: '⚠️ REGRESSION_DETECTED: Your patch broke legitimate user operations.' });
      } else if (result.verification_status === 'INCOMPLETE') {
        setStatusMessage({ type: 'error', text: '⚠️ INCOMPLETE: Defect is still reproducible or missing authorization checks.' });
      } else {
        setStatusMessage({ type: 'error', text: `Status: ${result.verification_status}. ${result.summary}` });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Verification execution failed' });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleUnlockHint = async (level: number) => {
    if (!session) return;
    try {
      setHintLoading(level);
      const res = await api.requestRepairHint(session.id, level);
      setUnlockedHints(prev => ({ ...prev, [level]: res }));
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to unlock hint' });
    } finally {
      setHintLoading(null);
    }
  };

  const handleAskCoach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !coachQuestion.trim() || isCoachLoading) return;

    const q = coachQuestion.trim();
    setCoachQuestion('');
    setIsCoachLoading(true);
    try {
      const res = await api.askRepairCoach(session.id, q);
      setCoachHistory(prev => [...prev, { q, a: res.guidance }]);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to get coach response' });
    } finally {
      setIsCoachLoading(false);
    }
  };

  const currentFinding = findings.find(f => f.id === selectedFindingId);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono text-text-muted">Initializing isolated practice workspace...</p>
        </div>
      </div>
    );
  }

  // P0 EMPTY STATE: No findings detected for this repository
  if (findings.length === 0) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto py-8">
        <div className="p-8 rounded-2xl bg-canvas-surface border border-border-subtle shadow-card text-center space-y-6">
          <div className="flex justify-center">
            <EmptyStateIllustration type="shield" className="w-24 h-24" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <Badge variant="blue" size="sm" className="mb-2">
              Guided Repair Studio
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight text-text-primary">
              No Security Findings Detected
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed font-sans">
              Project #{projectId} currently has 0 registered security vulnerabilities. 
              Run a Threat Radar audit to scan this repository with Semgrep, Gitleaks, and OSV, 
              or select another project with active defects.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate(`/projects/${projectId}/audit`)}
            >
              <ShieldAlert className="w-4 h-4 mr-2" />
              <span>Run Security Audit</span>
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => navigate(`/projects/${projectId}/explorer`)}
            >
              <FileCode2 className="w-4 h-4 mr-2" />
              <span>Explore Codebase</span>
            </Button>
          </div>

          {/* Project switch helper if user has other projects */}
          {allProjects.length > 1 && (
            <div className="pt-6 border-t border-border-subtle/60 max-w-sm mx-auto">
              <span className="text-xs font-mono text-text-muted block mb-2">
                Or inspect another project:
              </span>
              <select
                onChange={(e) => {
                  const targetId = e.target.value;
                  if (targetId) navigate(`/projects/${targetId}/repair`);
                }}
                defaultValue=""
                className="w-full bg-canvas-elevated text-xs font-mono text-text-primary border border-border-subtle rounded-xl px-3 py-2 focus:border-blue-500 focus:outline-none"
              >
                <option value="" disabled>Select repository...</option>
                {allProjects.filter(p => p.id !== projectId).map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} (ID: {p.id})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* Header bar */}
      <div className="p-6 rounded-2xl bg-canvas-surface border border-border-subtle shadow-card space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-700 border border-blue-500/20">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-blue-700 font-semibold">
                  Guided Repair Studio
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-canvas-elevated text-text-muted border border-border-subtle">
                  Phases 8 & 9
                </span>
                {currentFinding?.cwe_id && (
                  <Badge variant="critical" size="xs">
                    {currentFinding.cwe_id}
                  </Badge>
                )}
              </div>
              <h1 className="text-xl font-bold tracking-tight text-text-primary mt-0.5">
                {currentFinding ? currentFinding.title : 'Repair Vulnerability'}
              </h1>
            </div>
          </div>

          {/* Finding selector if multiple */}
          {findings.length > 1 && (
            <div className="flex items-center space-x-2 bg-canvas-elevated px-3 py-1.5 rounded-xl border border-border-subtle">
              <span className="text-xs font-mono text-text-muted">Target Defect:</span>
              <select
                value={selectedFindingId || ''}
                onChange={(e) => {
                  const fid = parseInt(e.target.value, 10);
                  setSelectedFindingId(fid);
                  loadSession(projectId, fid);
                }}
                className="bg-canvas text-blue-700 font-mono text-xs border border-border-subtle rounded-lg px-2.5 py-1 focus:border-blue-500 focus:outline-none"
              >
                {findings.map(f => (
                  <option key={f.id} value={f.id}>
                    [{f.cwe_id || 'SEC'}] {f.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center space-x-2.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleReset}
              title="Reset practice workspace to original template"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-text-muted" />
              <span>Reset</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSaveDraft}
              disabled={isSaving}
            >
              <Save className="w-3.5 h-3.5 mr-1.5 text-blue-700" />
              <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleVerify}
              disabled={true} title="Unavailable until an isolated worker is deployed"
            >
              <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
              <span>{isVerifying ? 'Verifying in Docker...' : 'Run Verification'}</span>
            </Button>
          </div>
        </div>

        {/* Status notification */}
        {statusMessage && (
          <div className={`p-3 rounded-xl border text-xs font-mono flex items-center space-x-2.5 ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700'
              : statusMessage.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-700'
              : 'bg-blue-500/10 border-blue-500/30 text-blue-700'
          }`}>
            <Info className="w-4 h-4 shrink-0" />
            <span>{statusMessage.text}</span>
          </div>
        )}
      </div>

      {/* Main 2-column workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Editor & Verification (8 cols) */}
        <div className="lg:col-span-8 space-y-6">

          {/* Editor Container */}
          <div className="rounded-2xl bg-canvas-surface border border-border-subtle overflow-hidden shadow-elevated flex flex-col">
            {/* Editor Toolbar */}
            <div className="bg-canvas-elevated px-4 py-3 border-b border-border-subtle flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 px-2.5 py-1 bg-canvas border border-border-subtle rounded-lg text-xs font-mono text-blue-700">
                  <FileCode2 className="w-3.5 h-3.5" />
                  <span>{session?.file_path || 'app.py'}</span>
                </div>
                <span className="text-[11px] font-mono text-text-muted">
                  Isolated Practice Workspace
                </span>
              </div>

              {/* View Switcher */}
              <div className="flex items-center bg-canvas border border-border-subtle rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('editor')}
                  className={`px-3 py-1 rounded text-xs font-mono transition ${
                    viewMode === 'editor' 
                      ? 'bg-blue-500/20 text-blue-700 border border-blue-500/30 font-semibold'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  Code Editor
                </button>
                <button
                  onClick={() => setViewMode('diff')}
                  className={`px-3 py-1 rounded text-xs font-mono transition ${
                    viewMode === 'diff' 
                      ? 'bg-blue-500/20 text-blue-700 border border-blue-500/30 font-semibold'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  Unified Diff Preview
                </button>
              </div>
            </div>

            {/* Editor Body */}
            <div className="relative min-h-[420px] bg-canvas font-mono text-xs">
              {viewMode === 'editor' ? (
                <div className="flex">
                  {/* Line Numbers */}
                  <div className="py-4 px-3 select-none text-text-muted text-right font-mono text-xs border-r border-border-subtle bg-canvas-surface/40">
                    {code.split('\n').map((_, i) => (
                      <div key={i} className="leading-5 h-5">{i + 1}</div>
                    ))}
                  </div>

                  {/* Textarea */}
                  <textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    spellCheck={false}
                    className="w-full h-[450px] p-4 bg-transparent text-text-primary font-mono text-xs leading-5 focus:outline-none resize-none selection:bg-blue-500/30"
                    placeholder="Enter your fix here..."
                  />
                </div>
              ) : (
                /* Diff View */
                <div className="p-4 font-mono text-xs overflow-x-auto min-h-[420px]">
                  {diff ? (
                    <div className="space-y-0.5">
                      {diff.split('\n').map((line, idx) => {
                        let style = 'text-text-muted';
                        if (line.startsWith('+') && !line.startsWith('+++')) {
                          style = 'bg-emerald-500/10 text-emerald-700 px-1.5 py-0.5 rounded';
                        } else if (line.startsWith('-') && !line.startsWith('---')) {
                          style = 'bg-rose-500/10 text-rose-700 px-1.5 py-0.5 rounded';
                        } else if (line.startsWith('@@')) {
                          style = 'text-blue-700 font-bold py-1';
                        }
                        return (
                          <div key={idx} className={`leading-5 font-mono ${style}`}>
                            {line || ' '}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-16 text-text-muted font-mono">
                      No modifications yet. Edit code in the Code Editor to view unified git diff.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Verification Results Panel */}
          {verification && (
            <div className="p-6 rounded-2xl bg-canvas-surface border border-border-subtle shadow-card space-y-4">
              <div className="flex items-center justify-between border-b border-border-subtle pb-4">
                <div className="flex items-center space-x-3">
                  {verification.verification_status === 'VERIFIED_FIXED' ? (
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                  ) : verification.verification_status === 'REGRESSION_DETECTED' ? (
                    <div className="p-2 rounded-xl bg-rose-500/10 text-rose-700 border border-rose-500/20">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                  ) : (
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-700 border border-amber-500/20">
                      <XCircle className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={
                        verification.verification_status === 'VERIFIED_FIXED' ? 'green' :
                        verification.verification_status === 'REGRESSION_DETECTED' ? 'critical' : 'amber'
                      }>
                        {verification.verification_status}
                      </Badge>
                      <span className="text-xs font-mono text-text-muted">
                        Attempt #{verification.attempt_number}
                      </span>
                    </div>
                    <p className="text-sm text-text-primary mt-1 font-medium font-sans">
                      {verification.summary}
                    </p>
                  </div>
                </div>

                <div className="text-right font-mono text-[11px] text-text-muted">
                  <div>Runner: {verification.runner_type}</div>
                  <div>Sandbox: proofforge-sandbox:latest</div>
                </div>
              </div>

              {/* Individual Tests Breakdown */}
              <div className="space-y-2">
                <h3 className="text-xs font-mono uppercase tracking-wider text-text-muted font-semibold">
                  Test Execution Breakdown
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  {verification.test_results.map((t, idx) => (
                    <div 
                      key={idx}
                      className={`p-3 rounded-xl border flex items-start justify-between text-xs font-mono ${
                        t.passed 
                          ? 'bg-canvas-elevated/60 border-border-subtle text-text-primary' 
                          : 'bg-rose-500/10 border-rose-500/20 text-rose-700'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          {t.passed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-700 shrink-0" />
                          )}
                          <span className="font-semibold text-text-primary">{t.test_name}</span>
                        </div>
                        <p className="text-[11px] text-text-secondary pl-6 font-sans">{t.description}</p>
                      </div>

                      <div className="text-right text-[11px]">
                        <span className={`px-2 py-0.5 rounded font-semibold ${
                          t.passed ? 'bg-emerald-500/10 text-emerald-700' : 'bg-rose-500/20 text-rose-700'
                        }`}>
                          {t.passed ? 'PASSED' : 'FAILED'}
                        </span>
                        {t.observed && (
                          <div className="text-text-muted text-[10px] mt-1">
                            Observed: {t.observed}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Advance to Skill Transfer Lab Banner */}
              {verification.verification_status === 'VERIFIED_FIXED' && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-emerald-700 flex items-center space-x-2">
                      <Sparkles className="w-4 h-4" />
                      <span>Ready for Independent Skill Transfer Lab</span>
                    </h4>
                    <p className="text-xs text-text-secondary font-sans">
                      You repaired this defect with coaching. Now prove independent mastery by solving a new, related challenge without hints.
                    </p>
                  </div>
                  <Link
                    to={`/projects/${projectId}/transfer-lab`}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-canvas font-bold text-xs font-mono rounded-xl flex items-center space-x-2 shrink-0 transition shadow-md"
                  >
                    <span>Go to Transfer Lab</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Socratic Coach & Hints & History (4 cols) */}
        <div className="lg:col-span-4 space-y-6">

          {/* Socratic Coach & Hints */}
          <div className="p-5 rounded-2xl bg-canvas-surface border border-border-subtle shadow-card space-y-4">
            <div className="flex items-center space-x-2 border-b border-border-subtle pb-3">
              <Lightbulb className="w-5 h-5 text-amber-700" />
              <h2 className="text-sm font-bold text-text-primary">Socratic Repair Coach</h2>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed font-sans">
              Progressive hints provide conceptual scaffolding without giving away the full answer immediately.
            </p>

            {/* Hint Tiers 1 to 4 */}
            <div className="space-y-3">
              {[
                { level: 1, title: 'Level 1: Conceptual Root Cause', desc: 'Identify why the current code is vulnerable' },
                { level: 2, title: 'Level 2: Architectural Strategy', desc: 'Determine where and how authorization checks belong' },
                { level: 3, title: 'Level 3: Concrete Implementation', desc: 'Specific variable references and HTTP exception handling' },
                { level: 4, title: 'Level 4: Canonical Code Pattern', desc: 'Standard production-grade Python/FastAPI pattern' }
              ].map(tier => {
                const isUnlocked = Boolean(unlockedHints[tier.level]);
                const hintData = unlockedHints[tier.level];

                return (
                  <div key={tier.level} className="bg-canvas-elevated rounded-xl border border-border-subtle p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-semibold text-text-primary">
                        {tier.title}
                      </span>
                      {isUnlocked ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-700 border border-blue-500/20">
                          UNLOCKED
                        </span>
                      ) : (
                        <button
                          onClick={() => handleUnlockHint(tier.level)}
                          disabled={hintLoading === tier.level}
                          className="px-2.5 py-1 bg-canvas hover:bg-canvas-surface border border-border-subtle text-[11px] font-mono text-blue-700 hover:text-blue-700 rounded flex items-center space-x-1 transition disabled:opacity-50"
                        >
                          <Lock className="w-3 h-3" />
                          <span>{hintLoading === tier.level ? '...' : 'Unlock'}</span>
                        </button>
                      )}
                    </div>

                    {isUnlocked && hintData ? (
                      <div className="text-xs text-text-primary bg-canvas p-2.5 rounded-lg border border-border-subtle leading-relaxed whitespace-pre-wrap font-mono">
                        {hintData.hint_text}
                      </div>
                    ) : (
                      <p className="text-[11px] text-text-muted font-sans">{tier.desc}</p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Coach Q&A */}
            <div className="border-t border-border-subtle pt-4 space-y-3">
              <h3 className="text-xs font-mono uppercase tracking-wider text-text-muted font-semibold flex items-center space-x-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-blue-700" />
                <span>Ask Coach a Question</span>
              </h3>

              {coachHistory.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {coachHistory.map((item, idx) => (
                    <div key={idx} className="bg-canvas p-2.5 rounded-lg border border-border-subtle text-xs space-y-1">
                      <div className="text-blue-700 font-semibold font-mono">Q: {item.q}</div>
                      <div className="text-text-secondary leading-relaxed font-sans">A: {item.a}</div>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleAskCoach} className="flex space-x-2">
                <input
                  type="text"
                  value={coachQuestion}
                  onChange={(e) => setCoachQuestion(e.target.value)}
                  placeholder="e.g. How does tenancy checking differ from auth?"
                  className="flex-1 bg-canvas border border-border-subtle rounded-lg px-3 py-1.5 text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-blue-500 font-mono"
                />
                <button
                  type="submit"
                  disabled={isCoachLoading || !coachQuestion.trim()}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs font-mono disabled:opacity-50 transition"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>

          {/* Verification Attempt History */}
          <div className="p-5 rounded-2xl bg-canvas-surface border border-border-subtle shadow-card space-y-3">
            <div className="flex items-center space-x-2 border-b border-border-subtle pb-3">
              <History className="w-4 h-4 text-text-muted" />
              <h2 className="text-xs font-mono uppercase tracking-wider text-text-primary font-semibold">
                Attempt History ({patchHistory.length})
              </h2>
            </div>

            {patchHistory.length === 0 ? (
              <p className="text-xs text-text-muted font-mono">No verification attempts yet.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {patchHistory.map(patch => (
                  <div 
                    key={patch.id} 
                    className="p-2.5 bg-canvas rounded-lg border border-border-subtle text-xs font-mono flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-text-primary">#{patch.attempt_number}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                          patch.verification_status === 'VERIFIED_FIXED'
                            ? 'bg-emerald-500/20 text-emerald-700'
                            : patch.verification_status === 'REGRESSION_DETECTED'
                            ? 'bg-rose-500/20 text-rose-700'
                            : 'bg-amber-500/20 text-amber-700'
                        }`}>
                          {patch.verification_status}
                        </span>
                      </div>
                      {patch.summary && (
                        <p className="text-[10px] text-text-muted truncate max-w-[200px] mt-0.5">
                          {patch.summary}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-text-muted">
                      {new Date(patch.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
export default GuidedRepairPage;
