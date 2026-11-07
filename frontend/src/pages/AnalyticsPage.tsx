import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  GraduationCap, 
  Wrench, 
  Award, 
  Sparkles, 
  ShieldCheck, 
  Clock, 
  Info,
  TrendingUp
} from 'lucide-react';
import { api } from '../api/client';
import { LearningAnalyticsOverview } from '../types';
import { Badge } from '../components/ui/Badge';

export const AnalyticsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<LearningAnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const data = await api.getLearningAnalytics();
        setAnalytics(data);
      } catch (err: any) {
        console.error('Failed to load learning analytics:', err);
        setError(err.message || 'Could not retrieve learning analytics data.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono text-text-muted">Aggregating competency metrics...</p>
        </div>
      </div>
    );
  }

  const unassistedRate = analytics && analytics.transfer_challenges_passed > 0
    ? Math.round((analytics.unassisted_transfer_count / analytics.transfer_challenges_passed) * 100)
    : 100;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="p-6 lg:p-8 rounded-2xl bg-canvas-surface border border-border-subtle shadow-card space-y-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-700 border border-blue-500/20">
            <BarChart3 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-blue-700 font-semibold">
                Evidence-Based Learning Analytics
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-canvas-elevated text-text-muted border border-border-subtle">
                Milestone D Verified
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary mt-0.5">Engineering Competency Dashboard</h1>
          </div>
        </div>
        <p className="text-xs text-text-secondary max-w-2xl leading-relaxed font-sans">
          ProofForge AI tracks real skill acquisition across the full <strong>Learn-to-Fix</strong> lifecycle: 
          from guided Socratic repairs to independent transfer challenges graded inside hardened Docker sandboxes.
        </p>

        {/* Product-Defined Heuristics Disclaimer */}
        <div className="bg-canvas border border-border-subtle rounded-xl p-4 text-xs text-text-muted leading-relaxed flex items-start space-x-3 font-sans">
          <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
          <div>
            <span className="text-text-primary font-semibold font-mono">Product-Defined Evaluation Heuristic: </span>
            Readiness and transfer statuses are heuristic engineering indicators measuring passing unit/integration test results across practical code scenarios. They reflect demonstrated code behavior rather than standardized psychometric or academic certifications.
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-5 rounded-2xl bg-canvas-surface border border-border-subtle shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-text-muted font-semibold">Guided Repairs</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-700">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-text-primary font-mono">
            {analytics?.guided_repairs_verified || 0}
            <span className="text-sm font-normal text-text-muted ml-1.5">
              / {analytics?.guided_repairs_attempted || 0} verified
            </span>
          </div>
          <p className="text-[11px] text-text-muted font-sans">
            Scaffolded repairs passing automated Docker verification suite
          </p>
        </div>

        {/* Metric 2 */}
        <div className="p-5 rounded-2xl bg-canvas-surface border border-border-subtle shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-text-muted font-semibold">Independent Transfer</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-700">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-text-primary font-mono">
            {analytics?.transfer_challenges_passed || 0}
            <span className="text-sm font-normal text-text-muted ml-1.5">
              / {analytics?.transfer_challenges_attempted || 0} passed
            </span>
          </div>
          <p className="text-[11px] text-text-muted font-sans">
            Independent problems graded in blind Docker test harness
          </p>
        </div>

        {/* Metric 3 */}
        <div className="p-5 rounded-2xl bg-canvas-surface border border-border-subtle shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-text-muted font-semibold">Unassisted Solves</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-700">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-700 font-mono">
            {analytics?.unassisted_transfer_count || 0}
            <span className="text-sm font-normal text-text-muted ml-1.5">
              / {analytics?.transfer_challenges_passed || 0} ({unassistedRate}%)
            </span>
          </div>
          <p className="text-[11px] text-text-muted font-sans">
            Solved without hints (denominator: passed challenges)
          </p>
        </div>

        {/* Metric 4 */}
        <div className="p-5 rounded-2xl bg-canvas-surface border border-border-subtle shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-text-muted font-semibold">Readiness Status</span>
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-700">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-sm font-bold text-blue-700 font-mono uppercase">
            {analytics?.readiness_status ? analytics.readiness_status.replace(/_/g, ' ') : (analytics && analytics.transfer_challenges_passed > 0 ? 'INITIAL TRANSFER DEMONSTRATED' : 'EVALUATION PENDING')}
          </div>
          <p className="text-[11px] text-text-muted font-sans">
            {analytics?.readiness_summary || 'Evidence-proportionate software engineering capability'}
          </p>
        </div>
      </div>

      {/* Competency Assessment Matrix */}
      <div className="p-6 lg:p-8 rounded-2xl bg-canvas-surface border border-border-subtle shadow-card space-y-6">
        <div className="flex items-center justify-between border-b border-border-subtle pb-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-text-primary flex items-center space-x-2">
              <Award className="w-5 h-5 text-blue-700" />
              <span>Competency Verification Matrix</span>
            </h2>
            <p className="text-xs text-text-muted font-sans">
              Each competency requires both guided repair verification and blind transfer challenge success.
            </p>
          </div>
          <div className="text-xs font-mono text-text-muted">
            Evaluation: Automated Docker Sandbox
          </div>
        </div>

        <div className="space-y-4">
          {analytics?.competencies.map((comp, idx) => (
            <div 
              key={idx}
              className="bg-canvas border border-border-subtle rounded-2xl p-5 space-y-4 hover:border-border-muted transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-text-primary">{comp.concept}</span>
                    <Badge variant={
                      comp.status === 'TRANSFER_DEMONSTRATED' || comp.status === 'MASTERED' ? 'green' :
                      comp.status === 'IN_PROGRESS' ? 'blue' :
                      comp.status === 'PRACTICE_STARTED' ? 'amber' : 'silver'
                    }>
                      {comp.status.replace(/_/g, ' ')}
                    </Badge>
                    {comp.unassisted_transfer && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 flex items-center space-x-1 font-semibold">
                        <Sparkles className="w-3 h-3" />
                        <span>UNASSISTED</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed font-sans">
                    {comp.summary}
                  </p>
                </div>

                <div className="flex items-center space-x-4 shrink-0 font-mono text-xs">
                  <div className="text-right">
                    <div className="text-text-muted text-[10px] uppercase">Guided Repairs</div>
                    <div className="text-blue-700 font-semibold">{comp.guided_repairs_verified} Verified</div>
                  </div>
                  <div className="text-right">
                    <div className="text-text-muted text-[10px] uppercase">Transfer Challenge</div>
                    <div className="text-emerald-700 font-semibold">{comp.transfer_challenges_passed} Passed</div>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-canvas-elevated h-2 rounded-full overflow-hidden border border-border-subtle">
                <div 
                  className={`h-full transition-all duration-500 ${
                    comp.status === 'TRANSFER_DEMONSTRATED' || comp.status === 'MASTERED'
                      ? 'bg-emerald-500 w-full'
                      : comp.status === 'IN_PROGRESS'
                      ? 'bg-blue-500 w-1/2'
                      : comp.status === 'PRACTICE_STARTED'
                      ? 'bg-amber-500 w-1/4'
                      : 'bg-canvas-elevated w-0'
                  }`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="p-6 lg:p-8 rounded-2xl bg-canvas-surface border border-border-subtle shadow-card space-y-4">
        <div className="flex items-center space-x-2 border-b border-border-subtle pb-3">
          <Clock className="w-5 h-5 text-text-muted" />
          <h2 className="text-base font-semibold text-text-primary">Recent Learning & Verification Events</h2>
        </div>

        {analytics?.recent_events && analytics.recent_events.length > 0 ? (
          <div className="space-y-3">
            {analytics.recent_events.map((evt, idx) => (
              <div 
                key={idx}
                className="p-3.5 bg-canvas rounded-xl border border-border-subtle flex items-center justify-between text-xs font-mono"
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-1.5 rounded-lg ${
                    evt.status === 'VERIFIED_FIXED' || evt.status === 'passed'
                      ? 'bg-emerald-500/10 text-emerald-700'
                      : 'bg-amber-500/10 text-amber-700'
                  }`}>
                    {evt.type === 'transfer_attempt' ? (
                      <GraduationCap className="w-4 h-4" />
                    ) : (
                      <Wrench className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="text-text-primary font-semibold">{evt.title}</div>
                    <div className="text-text-muted text-[11px] font-sans">{evt.description}</div>
                  </div>
                </div>

                <div className="text-right text-[11px] text-text-muted">
                  {new Date(evt.timestamp).toLocaleString([], { 
                    month: 'short', 
                    day: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-xs text-text-muted font-mono">
            No verification events recorded yet. Complete guided repairs or transfer challenges to populate your engineering transcript.
          </div>
        )}
      </div>
    </div>
  );
};
export default AnalyticsPage;
