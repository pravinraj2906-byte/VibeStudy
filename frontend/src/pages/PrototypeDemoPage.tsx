import React from 'react';
import { ArrowLeft, Bot, CloudOff, DatabaseBackup, ShieldCheck, TestTube2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProjectFlowDiagram, ProjectIntelligenceReview } from '../components/project/ProjectIntelligenceReview';
import { Project } from '../types';

const prototypeProject: Project = {
  id: 1,
  user_id: 1,
  name: 'ProofForge AI',
  repo_url: 'https://github.com/pravinraj2906-byte/VibeStudy',
  default_branch: 'main',
  commit_sha: 'benchmark-verified',
  framework: 'React + FastAPI',
  language: 'TypeScript + Python',
  status: 'ready',
  metadata_json: {
    stack: {
      framework: 'React + FastAPI',
      language: 'TypeScript + Python',
      dependencies: {},
      devDependencies: {},
      has_dockerfile: true,
      has_env_example: true,
    },
    components: [
      { name: 'Repository Explorer', file_path: 'frontend/src/pages/CodebaseExplorerPage.tsx', line_number: 1, type: 'page' },
      { name: 'AI Mentor', file_path: 'frontend/src/pages/AiMentorPage.tsx', line_number: 1, type: 'page' },
      { name: 'Repair Studio', file_path: 'frontend/src/pages/GuidedRepairPage.tsx', line_number: 1, type: 'page' },
    ],
    routes: {
      frontend: [{ path: '/projects/:id', file_path: 'frontend/src/App.tsx', line_number: 1 }],
      backend: [
        { method: 'POST', path: '/projects/:id/scan', file_path: 'backend/app/api/v1/projects.py', line_number: 1 },
        { method: 'PUT', path: '/projects/:id/mentor-memory', file_path: 'backend/app/api/v1/mentor_memory.py', line_number: 1 },
      ],
    },
    api_calls: [{ client: 'fetch', endpoint: '/api/v1/projects', file_path: 'frontend/src/api/client.ts', line_number: 1 }],
    ai_overview: 'ProofForge combines deterministic repository analysis, source-grounded Gemini mentoring, authenticated learning memory, and test-backed repair verification.',
  },
  created_at: new Date(0).toISOString(),
  updated_at: new Date(0).toISOString(),
};

const boundaries = [
  { icon: Bot, title: 'Gemini teaches', text: 'The model explains repository facts and asks guided questions. ProofForge does not label generated prose as verified code behavior.' },
  { icon: TestTube2, title: 'Tests decide', text: 'Deterministic scanners and test harnesses produce the scoreable evidence. The 10-case scanner benchmark passed 10 of 10.' },
  { icon: DatabaseBackup, title: 'Memory survives', text: 'Learning goals and recent context sync per user and project. A versioned local copy keeps the mentor useful during API downtime.' },
  { icon: CloudOff, title: 'Failures stay honest', text: 'If Gemini or the execution worker is unavailable, the product reports the limit and keeps deterministic repository analysis available.' },
];

export const PrototypeDemoPage: React.FC = () => (
  <main className="min-h-screen bg-canvas px-4 py-6 text-text-primary sm:px-8 lg:px-12">
    <div className="mx-auto max-w-7xl space-y-7">
      <header className="flex flex-col gap-4 rounded-2xl border border-border-subtle bg-canvas-surface p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-[10px] font-mono font-semibold uppercase tracking-[0.18em] text-blue-700">INFINEX 2K26 judge prototype</p><h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">ProofForge AI</h1><p className="mt-1 text-sm text-text-secondary">Evidence-first engineering for AI-built software</p></div>
        <Link to="/" className="inline-flex w-fit items-center gap-2 rounded-xl border border-border-subtle px-4 py-2 text-xs font-semibold hover:border-blue-500/40"><ArrowLeft className="h-4 w-4" /> Product home</Link>
      </header>

      <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 sm:p-7">
        <div className="flex items-start gap-4"><div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-800"><ShieldCheck className="h-6 w-6" /></div><div><p className="text-[10px] font-mono font-semibold uppercase tracking-[0.18em] text-emerald-800">Prototype definition</p><h2 className="mt-2 text-xl font-bold">The AI mentor explains. The evidence pipeline proves.</h2><p className="mt-2 max-w-3xl text-sm leading-relaxed text-text-secondary">ProofForge helps developers understand an AI-built repository, repair security weaknesses, and demonstrate that a fix works. It separates helpful model guidance from deterministic scanner and test results.</p></div></div>
      </section>

      <ProjectIntelligenceReview project={prototypeProject} findings={[]} />
      <ProjectFlowDiagram project={prototypeProject} findings={[]} />

      <section className="rounded-2xl border border-border-subtle bg-canvas-surface p-5 shadow-card sm:p-7" aria-labelledby="model-boundary-title">
        <p className="text-[10px] font-mono font-semibold uppercase tracking-[0.18em] text-blue-700">Model, score, accuracy and backup</p>
        <h2 id="model-boundary-title" className="mt-2 text-xl font-bold">Clear responsibility at every layer</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{boundaries.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-xl border border-border-subtle bg-canvas p-4"><Icon className="h-5 w-5 text-blue-700" /><h3 className="mt-3 text-sm font-bold">{title}</h3><p className="mt-2 text-xs leading-relaxed text-text-muted">{text}</p></article>)}</div>
        <p className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs leading-relaxed text-amber-900"><strong>Accuracy boundary:</strong> 100% precision, recall, and accuracy refer only to the built-in scanner on ten labeled fixtures. Gemini response accuracy has not been independently measured, so the product grounds explanations in repository evidence and never treats prose as verification.</p>
      </section>
    </div>
  </main>
);

export default PrototypeDemoPage;
