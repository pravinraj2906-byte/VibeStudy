import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  GraduationCap, 
  Play, 
  Save, 
  HelpCircle, 
  CheckCircle2, 
  XCircle, 
  FileCode2, 
  ShieldCheck, 
  ArrowRight, 
  Sparkles, 
  BarChart3,
  Award,
  RotateCcw,
  Info
} from 'lucide-react';
import { api } from '../api/client';
import { 
  ChallengeListItem, 
  ChallengeDetailResponse, 
  ChallengeAttemptResponse, 
  ChallengeGradeResponse 
} from '../types';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export const SkillTransferLabPage: React.FC = () => {
  const { id: paramProjectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const projectId = paramProjectId ? parseInt(paramProjectId, 10) : 1;

  const [challenges, setChallenges] = useState<ChallengeListItem[]>([]);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string>('transfer-task-auth-v1');
  const [challengeDetail, setChallengeDetail] = useState<ChallengeDetailResponse | null>(null);
  const [attempt, setAttempt] = useState<ChallengeAttemptResponse | null>(null);
  
  const [code, setCode] = useState<string>('');
  const [diff, setDiff] = useState<string>('');
  const [viewMode, setViewMode] = useState<'editor' | 'diff'>('editor');
  
  const [gradingResult, setGradingResult] = useState<ChallengeGradeResponse | null>(null);
  const [unassisted, setUnassisted] = useState<boolean>(true);
  const [hintText, setHintText] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [isHintLoading, setIsHintLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const list = await api.listChallenges();
        setChallenges(list);
        if (list.length > 0) {
          const firstId = list[0].challenge_id;
          setSelectedChallengeId(firstId);
          await loadChallenge(firstId);
        }
      } catch (err: any) {
        console.error('Failed to load challenges:', err);
        setStatusMessage({ type: 'error', text: err.message || 'Could not load challenge bank.' });
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const loadChallenge = async (cId: string) => {
    try {
      const detail = await api.getChallenge(cId);
      setChallengeDetail(detail);

      const att = await api.startChallengeAttempt(cId);
      setAttempt(att);
      setCode(att.current_code || detail.starter_code);
      setDiff(att.diff || '');
      setUnassisted(att.is_unassisted);
      setGradingResult(null);
      setHintText(null);
    } catch (err: any) {
      console.error('Error starting challenge attempt:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Failed to initialize challenge attempt.' });
    }
  };

  const handleSaveDraft = async () => {
    if (!attempt) return;
    try {
      setIsSaving(true);
      const res = await api.saveChallengeDraft(attempt.id, code);
      setDiff(res.diff);
      setStatusMessage({ type: 'success', text: 'Draft saved in isolated challenge workspace.' });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to save draft' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestHint = async () => {
    if (!attempt) return;
    if (unassisted) {
      const confirmed = window.confirm(
        'Requesting a hint will forfeit your "Unassisted" status for this transfer challenge. Are you sure you want to proceed?'
      );
      if (!confirmed) return;
    }

    try {
      setIsHintLoading(true);
      const res = await api.getChallengeHint(attempt.id);
      setHintText(res.hint_text);
      setUnassisted(false);
      setStatusMessage({ type: 'info', text: 'Hint unlocked. Mastery score adjusted to "Practiced".' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to retrieve hint' });
    } finally {
      setIsHintLoading(false);
    }
  };

  const handleSubmitSolution = async () => {
    if (!attempt) return;
    try {
      setIsGrading(true);
      setStatusMessage({ type: 'info', text: 'Executing blind test grader inside hardened Docker sandbox...' });
      
      const result = await api.submitChallengeAttempt(attempt.id, code);
      setGradingResult(result);
      setUnassisted(result.is_unassisted);

      if (result.passed_all) {
        setStatusMessage({
          type: 'success',
          text: `🎉 Challenge Passed! Score: ${result.score}/${result.max_score} (100%). Transfer competency recorded!`
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: `Grade: ${result.score}/${result.max_score} tests passed. Review failed test assertions below.`
        });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Challenge grading execution failed' });
    } finally {
      setIsGrading(false);
    }
  };

  const handleReset = () => {
    if (!challengeDetail) return;
    if (!window.confirm('Reset code back to starter code? Unsaved work will be lost.')) return;
    setCode(challengeDetail.starter_code);
    setDiff('');
    setGradingResult(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono text-text-muted">Loading Skill Transfer Lab...</p>
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
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-700 font-semibold">
                  Independent Skill Transfer Lab
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-canvas-elevated text-text-muted border border-border-subtle">
                  Phase 10 — Core Transfer
                </span>
                {unassisted ? (
                  <Badge variant="green">
                    <Sparkles className="w-3 h-3 mr-1" />
                    <span>Unassisted Track</span>
                  </Badge>
                ) : (
                  <Badge variant="amber">
                    <span>Assisted (Practiced)</span>
                  </Badge>
                )}
              </div>
              <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-text-primary mt-0.5">
                {challengeDetail ? challengeDetail.title : 'Transfer Challenge'}
              </h1>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleReset}
              title="Reset to starter code"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-text-muted" />
              <span>Reset</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRequestHint}
              disabled={isHintLoading}
              title="Request conceptual hint (forfeits unassisted status)"
            >
              <HelpCircle className="w-3.5 h-3.5 mr-1.5 text-amber-700" />
              <span>{isHintLoading ? '...' : 'Request Hint'}</span>
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
              onClick={handleSubmitSolution}
              disabled={true} title="Unavailable until an isolated worker is deployed"
            >
              <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
              <span>{isGrading ? 'Grading in Docker...' : 'Submit for Grading'}</span>
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

        {/* Left Column: Briefing & Editor & Grader Output (8 cols) */}
        <div className="lg:col-span-8 space-y-6">

          {/* Scenario Briefing */}
          {challengeDetail && (
            <div className="p-5 rounded-2xl bg-canvas-surface border border-border-subtle shadow-card space-y-3">
              <div className="flex items-center justify-between border-b border-border-subtle pb-3 flex-wrap gap-2">
                <span className="text-xs font-mono text-text-muted">
                  Domain: <strong className="text-emerald-700">{challengeDetail.domain}</strong>
                </span>
                <span className="text-xs font-mono text-text-muted">
                  Concept: <strong className="text-blue-700">{challengeDetail.concept}</strong>
                </span>
                <span className="text-xs font-mono text-text-muted">
                  Difficulty: <strong className="text-amber-700">{challengeDetail.difficulty}</strong>
                </span>
              </div>

              <div className="text-xs text-text-secondary leading-relaxed font-sans">
                <p>{challengeDetail.scenario}</p>
              </div>

              {/* Rules list */}
              <div className="bg-canvas p-4 rounded-xl border border-border-subtle space-y-1.5">
                <h4 className="text-[11px] font-mono uppercase tracking-wider text-emerald-700 font-semibold">
                  Transfer Rules & Grader Criteria:
                </h4>
                <ul className="text-xs text-text-muted space-y-1 list-disc list-inside font-sans">
                  {challengeDetail.rules.map((rule, idx) => (
                    <li key={idx}>{rule}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Editor Container */}
          <div className="rounded-2xl bg-canvas-surface border border-border-subtle overflow-hidden shadow-elevated flex flex-col">
            <div className="bg-canvas-elevated px-4 py-3 border-b border-border-subtle flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 px-2.5 py-1 bg-canvas border border-border-subtle rounded-lg text-xs font-mono text-emerald-700">
                  <FileCode2 className="w-3.5 h-3.5" />
                  <span>{challengeDetail?.editable_file || 'task_api.py'}</span>
                </div>
                <span className="text-[11px] font-mono text-text-muted">
                  Blind Student Sandbox
                </span>
              </div>

              <div className="flex items-center bg-canvas border border-border-subtle rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('editor')}
                  className={`px-3 py-1 rounded text-xs font-mono transition ${
                    viewMode === 'editor' 
                      ? 'bg-emerald-500/20 text-emerald-700 border border-emerald-500/30 font-semibold'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  Code Editor
                </button>
                <button
                  onClick={() => setViewMode('diff')}
                  className={`px-3 py-1 rounded text-xs font-mono transition ${
                    viewMode === 'diff' 
                      ? 'bg-emerald-500/20 text-emerald-700 border border-emerald-500/30 font-semibold'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  Unified Diff Preview
                </button>
              </div>
            </div>

            <div className="relative min-h-[420px] bg-canvas font-mono text-xs">
              {viewMode === 'editor' ? (
                <div className="flex">
                  <div className="py-4 px-3 select-none text-text-muted text-right font-mono text-xs border-r border-border-subtle bg-canvas-surface/40">
                    {code.split('\n').map((_, i) => (
                      <div key={i} className="leading-5 h-5">{i + 1}</div>
                    ))}
                  </div>
                  <textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    spellCheck={false}
                    className="w-full h-[450px] p-4 bg-transparent text-text-primary font-mono text-xs leading-5 focus:outline-none resize-none selection:bg-emerald-500/30"
                    placeholder="Enter your independent fix here..."
                  />
                </div>
              ) : (
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
                      No modifications yet. Edit starter code to view unified diff.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Grading Results Panel */}
          {gradingResult && (
            <div className="p-6 rounded-2xl bg-canvas-surface border border-border-subtle shadow-card space-y-4">
              <div className="flex items-center justify-between border-b border-border-subtle pb-4">
                <div className="flex items-center space-x-3">
                  {gradingResult.passed_all ? (
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                      <Award className="w-7 h-7" />
                    </div>
                  ) : (
                    <div className="p-2 rounded-xl bg-rose-500/10 text-rose-700 border border-rose-500/20">
                      <XCircle className="w-7 h-7" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={gradingResult.passed_all ? 'green' : 'critical'}>
                        {gradingResult.passed_all ? 'CHALLENGE PASSED' : 'CHALLENGE FAILED'}
                      </Badge>
                      <span className="text-xs font-mono text-text-primary font-bold">
                        Score: {gradingResult.score}/{gradingResult.max_score} tests passed
                      </span>
                      {gradingResult.is_unassisted && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 font-semibold">
                          ⭐️ UNASSISTED
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-text-secondary mt-1 font-sans">
                      {gradingResult.feedback}
                    </p>
                  </div>
                </div>

                <div className="text-right font-mono text-[11px] text-text-muted">
                  <div>Runner: {gradingResult.runner_type}</div>
                  <div>Hidden Grader: Docker Isolated</div>
                </div>
              </div>

              {/* Detailed Test Results */}
              <div className="space-y-2">
                <h3 className="text-xs font-mono uppercase tracking-wider text-text-muted font-semibold">
                  Authoritative Grader Results
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  {gradingResult.test_results.map((t, idx) => (
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
                          <span className="font-semibold text-text-primary">{t.name}</span>
                        </div>
                        <p className="text-[11px] text-text-secondary pl-6 font-sans">{t.description}</p>
                      </div>

                      <div className="text-right text-[11px]">
                        <span className={`px-2 py-0.5 rounded font-semibold ${
                          t.passed ? 'bg-emerald-500/10 text-emerald-700' : 'bg-rose-500/20 text-rose-700'
                        }`}>
                          {t.passed ? 'PASSED' : 'FAILED'}
                        </span>
                        {t.details && (
                          <div className="text-text-muted text-[10px] mt-1 font-sans">
                            {t.details}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Link to Analytics */}
              {gradingResult.passed_all && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-emerald-700 flex items-center space-x-2">
                      <Sparkles className="w-4 h-4" />
                      <span>Competency Mastered!</span>
                    </h4>
                    <p className="text-xs text-text-secondary font-sans">
                      You have verified a guided repair and passed an independent transfer challenge in Broken Object-Level Authorization.
                    </p>
                  </div>
                  <Link
                    to="/analytics"
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-canvas font-bold text-xs font-mono rounded-xl flex items-center space-x-2 shrink-0 transition shadow-md"
                  >
                    <span>View Learning Analytics</span>
                    <BarChart3 className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Lab Instructions & Hint (4 cols) */}
        <div className="lg:col-span-4 space-y-6">

          {/* Evaluation Rules */}
          <div className="p-5 rounded-2xl bg-canvas-surface border border-border-subtle shadow-card space-y-4">
            <div className="flex items-center space-x-2 border-b border-border-subtle pb-3">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
              <h2 className="text-sm font-semibold text-text-primary">Blind Grader Architecture</h2>
            </div>

            <div className="text-xs text-text-secondary space-y-3 leading-relaxed font-sans">
              <p>
                Unlike the Guided Repair Studio, the Transfer Lab runs a <strong>hidden test grader</strong> located outside your workspace.
              </p>
              <div className="p-3.5 bg-canvas rounded-xl border border-border-subtle space-y-1.5 text-[11px] font-mono text-text-muted">
                <div className="text-text-primary font-semibold">Grader Protection:</div>
                <div>• Hardened Docker sandbox (network disabled)</div>
                <div>• Anti-shortcut check (universal denial fails)</div>
                <div>• Multi-tenant cross-org matrix evaluation</div>
                <div>• Zero test manipulation possible</div>
              </div>
            </div>
          </div>

          {/* Hint Card */}
          {hintText && (
            <div className="p-5 rounded-2xl bg-canvas-surface border border-amber-500/30 shadow-card space-y-3">
              <div className="flex items-center space-x-2 text-amber-700 border-b border-border-subtle pb-2">
                <HelpCircle className="w-4 h-4" />
                <h3 className="text-xs font-mono font-semibold uppercase tracking-wider">
                  Conceptual Hint (Assisted)
                </h3>
              </div>
              <p className="text-xs text-text-primary leading-relaxed font-mono whitespace-pre-wrap">
                {hintText}
              </p>
            </div>
          )}

          {/* Transfer Bank Selector */}
          <div className="p-5 rounded-2xl bg-canvas-surface border border-border-subtle shadow-card space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-text-muted font-semibold">
              Transfer Challenge Bank
            </h3>
            <div className="space-y-2">
              {challenges.map(c => (
                <div
                  key={c.challenge_id}
                  onClick={() => {
                    setSelectedChallengeId(c.challenge_id);
                    loadChallenge(c.challenge_id);
                  }}
                  className={`p-3 rounded-xl border text-xs font-mono cursor-pointer transition ${
                    selectedChallengeId === c.challenge_id
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-text-primary shadow-sm'
                      : 'bg-canvas border-border-subtle text-text-muted hover:text-text-primary'
                  }`}
                >
                  <div className="font-semibold text-emerald-700">{c.title}</div>
                  <div className="text-[10px] text-text-muted mt-1 font-sans">
                    {c.concept} • {c.difficulty}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
export default SkillTransferLabPage;
