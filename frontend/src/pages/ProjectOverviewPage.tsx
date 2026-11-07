import { EditorialBanner } from '../components/illustrations/EditorialBanner';
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  GitBranch, 
  Hash, 
  Code2, 
  Compass, 
  ShieldAlert, 
  Bot, 
  FileCode2, 
  Activity, 
  ExternalLink,
  Layers
} from 'lucide-react';
import { api } from '../api/client';
import { Project, Finding } from '../types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { lazy, Suspense } from 'react';
import { ProjectFlowDiagram, ProjectIntelligenceReview } from '../components/project/ProjectIntelligenceReview';
const CodebaseConstellation = lazy(() => import('../components/3d/CodebaseConstellation3D').then(module => ({ default: module.CodebaseConstellation })));

export const ProjectOverviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const projId = parseInt(id, 10);
    setLoading(true);

    Promise.all([
      api.getProject(projId),
      api.getProjectFindings(projId).catch(() => [])
    ])
      .then(([p, f]) => {
        setProject(p);
        setFindings(f);
      })
      .catch(err => setError(err.message || "Failed to load project details"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="py-20 flex justify-center items-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-8 rounded-2xl bg-canvas-surface border border-border-subtle text-center space-y-3 max-w-md mx-auto">
        <p className="text-rose-700 font-bold font-mono">{error || "Project not found"}</p>
        <Button variant="secondary" size="sm" onClick={() => navigate('/dashboard')}>
          Return to Dashboard
        </Button>
      </div>
    );
  }

  const meta = project.metadata_json || {};
  const components = meta.components || [];
  const routes = meta.routes || { frontend: [], backend: [] };
  const apiCalls = meta.api_calls || [];
  const aiOverview = meta.ai_overview || "Architectural analysis pending.";

  // Flatten component names and route strings for 3D constellation
  const compNames = components.map((c: any) => typeof c === 'string' ? c : c.name || c.file_path);
  const routeStrings = [
    ...(routes.frontend || []).map((r: any) => r.path),
    ...(routes.backend || []).map((r: any) => `${r.method} ${r.path}`)
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header bar */}
      <div className="p-6 rounded-2xl bg-canvas-surface border border-border-subtle shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-xl lg:text-2xl font-bold text-text-primary tracking-tight">
              {project.name}
            </h1>
            <Badge variant="blue" size="sm">{project.status}</Badge>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-text-muted mt-2">
            <div className="flex items-center space-x-1.5">
              <GitBranch className="w-3.5 h-3.5 text-blue-700" />
              <span>{project.default_branch}</span>
            </div>

            {project.commit_sha && (
              <div className="flex items-center space-x-1.5 bg-canvas-elevated px-2 py-0.5 rounded border border-border-subtle">
                <Hash className="w-3.5 h-3.5 text-teal-700" />
                <span title={project.commit_sha}>SHA: {project.commit_sha.slice(0, 7)}</span>
              </div>
            )}

            {project.repo_url && (
              <a
                href={project.repo_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-1 text-blue-700 hover:text-blue-700 transition"
              >
                <span>GitHub Source</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/projects/${project.id}/audit`)}
          >
            <ShieldAlert className="w-4 h-4 mr-1.5 text-blue-700" />
            <span>Threat Radar</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate(`/projects/${project.id}/explorer`)}
          >
            <FileCode2 className="w-4 h-4 mr-1.5" />
            <span>Open Codebase Explorer</span>
          </Button>
        </div>
      </div>

      <EditorialBanner kind="architecture" />

      <ProjectIntelligenceReview project={project} findings={findings} />

      <ProjectFlowDiagram project={project} findings={findings} />

      {/* 3D Codebase Constellation Architecture Map */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2 text-xs font-mono text-text-muted">
          <Layers className="w-4 h-4 text-blue-700" />
          <span>Interactive Architectural Topology</span>
        </div>
        <Suspense fallback={<div role="status" className="p-8 text-text-muted">Loading repository map…</div>}><CodebaseConstellation
          projectId={project.id}
          repoName={project.name}
          components={compNames}
          routes={routeStrings}
          findings={findings.map(f => ({
            id: f.id,
            title: f.title,
            file_path: f.file_path,
            severity: f.severity
          }))}
        /></Suspense>
      </div>

      {/* AI Grounded Architectural Blueprint */}
      <div className="p-6 rounded-2xl bg-canvas-surface border border-border-subtle shadow-card space-y-3">
        <div className="flex items-center space-x-2 text-blue-700">
          <Bot className="w-4 h-4" />
          <h2 className="text-xs font-semibold uppercase tracking-wider font-mono">
            Grounded Architectural Blueprint & Discovery Analysis
          </h2>
        </div>
        <div className="text-xs text-text-secondary leading-relaxed whitespace-pre-line bg-canvas p-4 rounded-xl border border-border-subtle font-sans">
          {aiOverview}
        </div>
      </div>

      {/* 3 Columns: Components, Routes, API Calls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Components */}
        <div className="p-5 rounded-2xl bg-canvas-surface border border-border-subtle shadow-lg space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
            <h3 className="text-xs font-semibold font-mono text-text-primary flex items-center space-x-2">
              <Code2 className="w-4 h-4 text-blue-700" />
              <span>COMPONENTS ({components.length})</span>
            </h3>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {components.length === 0 ? (
              <p className="text-xs font-mono text-text-muted">No React components detected.</p>
            ) : (
              components.map((c: any, i: number) => (
                <div 
                  key={i} 
                  onClick={() => navigate(`/projects/${project.id}/explorer?file=${encodeURIComponent(c.file_path || '')}`)}
                  className="p-2.5 bg-canvas hover:bg-canvas-elevated border border-border-subtle hover:border-blue-500/30 rounded-xl text-xs space-y-1 cursor-pointer transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-blue-700 font-mono truncate">{c.name}</span>
                    <span className="text-[10px] text-text-muted font-mono">Line {c.line_number}</span>
                  </div>
                  <p className="text-[11px] text-text-muted font-mono truncate">{c.file_path}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Routes */}
        <div className="p-5 rounded-2xl bg-canvas-surface border border-border-subtle shadow-lg space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
            <h3 className="text-xs font-semibold font-mono text-text-primary flex items-center space-x-2">
              <Compass className="w-4 h-4 text-amber-700" />
              <span>DISCOVERED ROUTES</span>
            </h3>
            <span className="text-xs font-mono text-text-muted">
              {routes.frontend.length + routes.backend.length}
            </span>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {routes.frontend.length === 0 && routes.backend.length === 0 ? (
              <p className="text-xs font-mono text-text-muted">No router definitions found.</p>
            ) : (
              <>
                {routes.frontend.map((r: any, i: number) => (
                  <div key={`fe-${i}`} className="p-2.5 bg-canvas border border-border-subtle rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-amber-700 font-mono truncate">{r.path}</span>
                      <span className="text-[10px] text-amber-700/80 font-mono">React Route</span>
                    </div>
                    <p className="text-[11px] text-text-muted font-mono truncate">{r.file_path}</p>
                  </div>
                ))}
                {routes.backend.map((r: any, i: number) => (
                  <div key={`be-${i}`} className="p-2.5 bg-canvas border border-border-subtle rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-blue-700 font-mono truncate">{r.method} {r.path}</span>
                      <span className="text-[10px] text-blue-700/80 font-mono">API Route</span>
                    </div>
                    <p className="text-[11px] text-text-muted font-mono truncate">{r.file_path}</p>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* API Network Calls */}
        <div className="p-5 rounded-2xl bg-canvas-surface border border-border-subtle shadow-lg space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
            <h3 className="text-xs font-semibold font-mono text-text-primary flex items-center space-x-2">
              <Activity className="w-4 h-4 text-teal-700" />
              <span>TRACED API CALLS ({apiCalls.length})</span>
            </h3>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {apiCalls.length === 0 ? (
              <p className="text-xs font-mono text-text-muted">No network calls detected.</p>
            ) : (
              apiCalls.map((a: any, i: number) => (
                <div key={i} className="p-2.5 bg-canvas border border-border-subtle rounded-xl text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-teal-700">{a.client}</span>
                    <span className="text-[10px] text-text-muted font-mono">Line {a.line_number}</span>
                  </div>
                  <p className="text-[11px] text-text-primary font-mono truncate">{a.endpoint}</p>
                  <p className="text-[10px] text-text-muted font-mono truncate">{a.file_path}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default ProjectOverviewPage;
