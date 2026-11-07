import React, { useMemo } from 'react';
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  CircleDashed,
  Code2,
  Database,
  GitBranch,
  GraduationCap,
  Network,
  ShieldCheck,
  Sparkles,
  TestTube2,
  TriangleAlert,
} from 'lucide-react';
import { Finding, Project } from '../../types';

interface ProjectIntelligenceReviewProps {
  project: Project;
  findings: Finding[];
}

interface ScoreDimension {
  label: string;
  score: number;
  evidence: string;
  tone: 'blue' | 'green' | 'amber' | 'rose';
}

const toneClasses: Record<ScoreDimension['tone'], string> = {
  blue: 'bg-blue-500/10 text-blue-800 border-blue-500/20',
  green: 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20',
  amber: 'bg-amber-500/10 text-amber-800 border-amber-500/20',
  rose: 'bg-rose-500/10 text-rose-800 border-rose-500/20',
};

const clamp = (value: number) => Math.max(0, Math.min(25, value));

export const ProjectIntelligenceReview: React.FC<ProjectIntelligenceReviewProps> = ({ project, findings }) => {
  const meta = project.metadata_json || {};
  const components = meta.components || [];
  const routes = meta.routes || { frontend: [], backend: [] };
  const apiCalls = meta.api_calls || [];
  const stack = meta.stack;

  const review = useMemo(() => {
    const dimensions: ScoreDimension[] = [];

    const structureScore = clamp(
      6 +
      (components.length > 0 ? 7 : 0) +
      ((routes.frontend.length + routes.backend.length) > 0 ? 6 : 0) +
      (apiCalls.length > 0 ? 6 : 0),
    );
    dimensions.push({
      label: 'Architecture visibility',
      score: structureScore,
      evidence: `${components.length} components, ${routes.frontend.length + routes.backend.length} routes and ${apiCalls.length} API calls mapped`,
      tone: structureScore >= 20 ? 'green' : structureScore >= 13 ? 'blue' : 'amber',
    });

    const severityPenalty = findings.reduce((total, finding) => {
      const weights: Record<Finding['severity'], number> = { critical: 9, high: 5, medium: 2, low: 1, info: 0 };
      return total + weights[finding.severity];
    }, 0);
    const securityScore = findings.length === 0 ? 19 : clamp(25 - severityPenalty);
    dimensions.push({
      label: 'Security posture',
      score: securityScore,
      evidence: findings.length === 0
        ? 'No active findings returned; run Threat Radar again before claiming a clean audit'
        : `${findings.length} active findings, including ${findings.filter((finding) => ['critical', 'high'].includes(finding.severity)).length} high-priority risks`,
      tone: securityScore >= 20 ? 'green' : securityScore >= 13 ? 'amber' : 'rose',
    });

    const deliveryScore = clamp(
      7 +
      (project.commit_sha ? 5 : 0) +
      (project.repo_url ? 4 : 0) +
      (stack?.has_dockerfile ? 5 : 0) +
      (stack?.has_env_example ? 4 : 0),
    );
    dimensions.push({
      label: 'Delivery readiness',
      score: deliveryScore,
      evidence: `${project.commit_sha ? 'Pinned commit' : 'No pinned commit'} · ${stack?.has_dockerfile ? 'Docker detected' : 'Docker not detected'} · ${stack?.has_env_example ? 'Environment template found' : 'Environment template missing'}`,
      tone: deliveryScore >= 20 ? 'green' : deliveryScore >= 13 ? 'blue' : 'amber',
    });

    const explainabilityScore = clamp(
      8 +
      (project.framework ? 4 : 0) +
      (project.language ? 4 : 0) +
      (meta.ai_overview ? 5 : 0) +
      (components.length > 0 ? 4 : 0),
    );
    dimensions.push({
      label: 'Explainability',
      score: explainabilityScore,
      evidence: `${project.framework || 'Framework pending'} · ${project.language || 'Language pending'} · ${meta.ai_overview ? 'AI blueprint available' : 'AI blueprint pending'}`,
      tone: explainabilityScore >= 20 ? 'green' : explainabilityScore >= 13 ? 'blue' : 'amber',
    });

    const total = dimensions.reduce((sum, dimension) => sum + dimension.score, 0);
    const label = total >= 85 ? 'Strong engineering foundation' : total >= 70 ? 'Promising and reviewable' : total >= 50 ? 'Developing with visible gaps' : 'Early-stage foundation';
    const nextSteps = [
      findings.some((finding) => ['critical', 'high'].includes(finding.severity))
        ? 'Resolve high-priority security findings and verify each repair.'
        : 'Re-run Threat Radar on the final commit and retain the evidence.',
      !stack?.has_env_example
        ? 'Add a safe .env.example so judges can configure the project quickly.'
        : 'Keep the environment template aligned with every required service.',
      !stack?.has_dockerfile
        ? 'Add a reproducible Docker workflow for a judge-ready local demo.'
        : 'Test the Docker path on a clean machine before submission.',
    ];

    return { dimensions, total, label, nextSteps };
  }, [apiCalls.length, components.length, findings, meta.ai_overview, project.commit_sha, project.framework, project.language, project.repo_url, routes.backend.length, routes.frontend.length, stack?.has_dockerfile, stack?.has_env_example]);

  return (
    <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]" aria-labelledby="project-review-title">
      <div className="rounded-2xl border border-border-subtle bg-canvas-surface p-6 shadow-card">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-mono font-semibold uppercase tracking-[0.18em] text-blue-700"><Sparkles className="h-3.5 w-3.5" /> Evidence-based review</p>
            <h2 id="project-review-title" className="mt-2 text-lg font-bold text-text-primary">How strong is this build?</h2>
          </div>
          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(#2563eb ${review.total * 3.6}deg, rgba(148,163,184,.18) 0deg)` }} aria-label={`Project evidence score ${review.total} out of 100`}>
            <div className="flex h-[76px] w-[76px] flex-col items-center justify-center rounded-full bg-canvas-surface"><span className="text-2xl font-black text-text-primary">{review.total}</span><span className="text-[9px] font-mono text-text-muted">/ 100</span></div>
          </div>
        </div>
        <p className="mt-4 text-sm font-semibold text-text-primary">{review.label}</p>
        <p className="mt-1 text-xs leading-relaxed text-text-secondary">This is a transparent readiness score based on repository evidence—not a promise of production safety. Every point below shows what influenced it.</p>

        <div className="mt-5 space-y-3">
          {review.dimensions.map((dimension) => (
            <div key={dimension.label}>
              <div className="flex items-center justify-between text-[11px]"><span className="font-semibold text-text-primary">{dimension.label}</span><span className="font-mono text-text-muted">{dimension.score}/25</span></div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-canvas-elevated"><div className="h-full rounded-full bg-blue-600" style={{ width: `${dimension.score * 4}%` }} /></div>
              <p className="mt-1.5 text-[10px] leading-relaxed text-text-muted">{dimension.evidence}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border-subtle bg-canvas-surface p-6 shadow-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div><p className="text-[10px] font-mono font-semibold uppercase tracking-[0.18em] text-emerald-700">Judge-friendly explanation</p><h2 className="mt-2 text-lg font-bold text-text-primary">What the evidence says</h2></div>
          <span className={`w-fit rounded-full border px-3 py-1 text-[10px] font-mono ${toneClasses[review.dimensions[1].tone]}`}>{findings.length ? `${findings.length} findings reviewed` : 'Audit confirmation recommended'}</span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {review.dimensions.map((dimension) => (
            <article key={dimension.label} className={`rounded-xl border p-4 ${toneClasses[dimension.tone]}`}>
              <div className="flex items-center justify-between gap-3"><h3 className="text-xs font-bold">{dimension.label}</h3>{dimension.score >= 20 ? <CheckCircle2 className="h-4 w-4" /> : dimension.score >= 13 ? <CircleDashed className="h-4 w-4" /> : <TriangleAlert className="h-4 w-4" />}</div>
              <p className="mt-2 text-[11px] leading-relaxed opacity-80">{dimension.evidence}</p>
            </article>
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-border-subtle bg-canvas p-4">
          <p className="text-[10px] font-mono font-semibold uppercase tracking-[0.16em] text-text-muted">Best next moves</p>
          <ol className="mt-3 space-y-2">
            {review.nextSteps.map((step, index) => <li key={step} className="flex gap-3 text-xs leading-relaxed text-text-secondary"><span className="font-mono font-bold text-blue-700">0{index + 1}</span><span>{step}</span></li>)}
          </ol>
        </div>
      </div>
    </section>
  );
};

export const ProjectFlowDiagram: React.FC<ProjectIntelligenceReviewProps> = ({ project, findings }) => {
  const meta = project.metadata_json || {};
  const flow = [
    { label: 'Repository', detail: project.default_branch, icon: GitBranch, tone: 'text-blue-700 bg-blue-500/10 border-blue-500/20' },
    { label: 'Code intelligence', detail: `${meta.components?.length || 0} components mapped`, icon: Code2, tone: 'text-cyan-800 bg-cyan-500/10 border-cyan-500/20' },
    { label: 'Architecture graph', detail: `${(meta.routes?.frontend?.length || 0) + (meta.routes?.backend?.length || 0)} routes connected`, icon: Network, tone: 'text-violet-800 bg-violet-500/10 border-violet-500/20' },
    { label: 'AI mentor', detail: 'Explains how and why', icon: Bot, tone: 'text-amber-800 bg-amber-500/10 border-amber-500/20' },
    { label: 'Repair & verify', detail: `${findings.length} findings in review`, icon: TestTube2, tone: 'text-rose-800 bg-rose-500/10 border-rose-500/20' },
    { label: 'Skill transfer', detail: 'Prove independent learning', icon: GraduationCap, tone: 'text-emerald-800 bg-emerald-500/10 border-emerald-500/20' },
  ];

  const systemLayers = [
    { icon: Code2, title: 'Experience layer', text: `Responsive workspace built around ${project.framework || 'the detected framework'}, with guided flows and 3D architecture views` },
    { icon: Network, title: 'Application layer', text: 'Authenticated FastAPI routes coordinate analysis, mentoring, repairs and verification' },
    { icon: Bot, title: 'Intelligence layer', text: 'Repository-grounded AI explanations combine with deterministic scanners and source evidence' },
    { icon: Database, title: 'Evidence layer', text: 'Projects, findings, repair attempts, learning memory and outcomes remain scoped to the signed-in user' },
    { icon: ShieldCheck, title: 'Safety boundary', text: 'Restricted execution and explicit verification separate suggestions from proven behavior' },
  ];

  return (
    <section className="rounded-2xl border border-border-subtle bg-canvas-surface p-5 shadow-card sm:p-6" aria-labelledby="build-flow-title">
      <div className="max-w-3xl"><p className="text-[10px] font-mono font-semibold uppercase tracking-[0.18em] text-blue-700">Interactive system explanation</p><h2 id="build-flow-title" className="mt-2 text-lg font-bold text-text-primary">How your project turns code into learning evidence</h2><p className="mt-2 text-xs leading-relaxed text-text-secondary">Follow the path from imported source to an independently demonstrated skill. Each stage produces context for the next instead of leaving the developer with an unexplained AI answer.</p></div>

      <div className="mt-6 grid gap-2 xl:grid-cols-[repeat(11,minmax(0,1fr))] xl:items-center" role="list" aria-label="ProofForge workflow">
        {flow.map((item, index) => {
          const Icon = item.icon;
          return (
            <React.Fragment key={item.label}>
              <article className={`rounded-xl border p-3 xl:col-span-1 xl:p-4 ${item.tone}`} role="listitem">
                <Icon className="h-5 w-5" /><p className="mt-3 text-[11px] font-bold leading-tight">{item.label}</p><p className="mt-1 text-[9px] leading-relaxed opacity-75">{item.detail}</p>
              </article>
              {index < flow.length - 1 ? <div className="flex items-center justify-center py-1 text-text-muted xl:col-span-1 xl:py-0"><ArrowRight className="h-4 w-4 rotate-90 xl:rotate-0" /></div> : null}
            </React.Fragment>
          );
        })}
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {systemLayers.map((layer, index) => {
          const Icon = layer.icon;
          return <article key={layer.title} className="rounded-xl border border-border-subtle bg-canvas p-4"><div className="flex items-center justify-between"><Icon className="h-4 w-4 text-blue-700" /><span className="text-[9px] font-mono text-text-muted">L{index + 1}</span></div><h3 className="mt-3 text-xs font-bold text-text-primary">{layer.title}</h3><p className="mt-2 text-[10px] leading-relaxed text-text-muted">{layer.text}</p></article>;
        })}
      </div>
    </section>
  );
};
