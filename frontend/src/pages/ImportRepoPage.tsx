import { EditorialBanner } from '../components/illustrations/EditorialBanner';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  GitFork, 
  ShieldCheck, 
  AlertCircle, 
  Terminal, 
  Radio,
  ArrowRight,
  Sparkles,
  Lock,
  Boxes
} from 'lucide-react';
import { api } from '../api/client';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

export const ImportRepoPage: React.FC = () => {
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl) return;

    setError(null);
    setLoading(true);
    setStep('Connecting to GitHub API...');

    try {
      setStep('Downloading repository archive safely...');
      const project = await api.importRepo({ repo_url: repoUrl, branch });
      setStep('Running deterministic stack & component discovery...');
      navigate(`/projects/${project.id}`);
    } catch (err: any) {
      setError(err.message || 'Import failed. Ensure repository is public and accessible.');
    } finally {
      setLoading(false);
      setStep('');
    }
  };

  const setPreset = (url: string, b: string = 'main') => {
    setRepoUrl(url);
    setBranch(b);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 text-blue-700 font-mono text-xs uppercase tracking-wider mb-1">
          <Terminal className="w-3.5 h-3.5" />
          <span>Repository Ingestion</span>
        </div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center space-x-3 tracking-tight">
          <GitFork className="w-6 h-6 text-blue-700" />
          <span>Import GitHub Repository</span>
        </h1>
        <p className="text-xs text-text-secondary mt-1">
          Safely clone and analyze source code structure, dependencies, components, and API routes via deterministic AST discovery.
        </p>
      </div>

      <EditorialBanner kind="repository" />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Main Import Form */}
        <div className="md:col-span-8 p-6 rounded-2xl bg-canvas-surface border border-border-subtle shadow-card space-y-5">
          {error && (
            <div className="flex items-start space-x-3 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
              <span className="font-mono">{error}</span>
            </div>
          )}

          <form onSubmit={handleImport} className="space-y-4">
            <div>
              <label className="block text-[11px] font-mono text-text-muted mb-1.5 uppercase tracking-wider">
                Public GitHub Repository URL
              </label>
              <input
                type="url"
                required
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repository"
                className="w-full bg-canvas-elevated border border-border-subtle focus:border-blue-500 rounded-xl px-4 py-2.5 text-xs text-text-primary placeholder-text-muted focus:outline-none transition-colors font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-text-muted mb-1.5 uppercase tracking-wider">
                Branch / Git Reference
              </label>
              <input
                type="text"
                required
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="main"
                className="w-full bg-canvas-elevated border border-border-subtle focus:border-blue-500 rounded-xl px-4 py-2 text-xs text-text-primary placeholder-text-muted focus:outline-none transition-colors font-mono"
              />
            </div>

            {/* Quick Test Presets */}
            <div className="pt-1">
              <span className="text-[10px] font-mono uppercase text-text-muted block mb-1.5 font-medium">
                Quick Test Preset:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPreset('https://github.com/Praveensagar07/VibeStudy', 'main')}
                  className="px-2.5 py-1 bg-canvas-elevated hover:bg-canvas-elevated/80 border border-border-subtle hover:border-blue-500/40 rounded-lg text-[11px] text-blue-700 font-mono transition"
                >
                  Praveensagar07/VibeStudy
                </button>
              </div>
            </div>

            {/* Live Progress Stage */}
            {loading && (
              <div className="p-4 rounded-xl bg-canvas-elevated border border-blue-500/30 font-mono text-xs space-y-2">
                <div className="flex items-center space-x-2 text-blue-700 font-semibold">
                  <Radio className="w-4 h-4 animate-pulse" />
                  <span>{step || 'Processing Repository Archive...'}</span>
                </div>
                <div className="w-full bg-canvas rounded-full h-1.5 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-teal-400 h-full w-2/3 animate-pulse" />
                </div>
              </div>
            )}

            <div className="pt-2">
              <Button
                type="submit"
                loading={loading}
                variant="primary"
                className="w-full py-2.5"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                <span>Start Architecture & Code Scan</span>
              </Button>
            </div>
          </form>
        </div>

        {/* Security & Guardrails Side Panel */}
        <div className="md:col-span-4 p-5 rounded-2xl bg-canvas-surface border border-border-subtle shadow-card space-y-4">
          <div className="flex items-center space-x-2 text-emerald-700 font-mono text-xs font-semibold uppercase tracking-wider border-b border-border-subtle pb-2">
            <ShieldCheck className="w-4 h-4" />
            <span>Security Guardrails</span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="space-y-1">
              <div className="flex items-center space-x-1.5 text-text-primary font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span>Host Isolation Gate</span>
              </div>
              <p className="text-[11px] text-text-muted pl-3 font-sans">
                Imported code is treated as untrusted and is never executed on the host OS.
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center space-x-1.5 text-text-primary font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>Secret Masking</span>
              </div>
              <p className="text-[11px] text-text-muted pl-3 font-sans">
                API keys, tokens, and credentials are deterministically stripped before persistence.
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center space-x-1.5 text-text-primary font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Path Containment</span>
              </div>
              <p className="text-[11px] text-text-muted pl-3 font-sans">
                Zip-slip traversal protection, archive byte caps, and executable blockers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ImportRepoPage;
