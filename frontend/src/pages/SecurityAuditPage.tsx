import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ShieldAlert, 
  AlertTriangle, 
  ShieldCheck, 
  Lock, 
  CheckCircle2, 
  Play, 
  RefreshCw,
  Terminal,
  Sparkles,
  ChevronRight,
  X,
  FileCode,
  Cpu,
  Info,
  Wrench,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import { api } from '../api/client';
import { Finding, ScanJob, ScannerStatusMap, ReproductionResult } from '../types';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export const SecurityAuditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const projectId = id ? parseInt(id, 10) : 1;

  const [findings, setFindings] = useState<Finding[]>([]);
  const [scannerStatuses, setScannerStatuses] = useState<ScannerStatusMap>({});
  const [latestScan, setLatestScan] = useState<ScanJob | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [scanning, setScanning] = useState<boolean>(false);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterScanner, setFilterScanner] = useState<string>('all');

  // Finding Detail & Reproduction Drawer
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [reproducing, setReproducing] = useState<boolean>(false);
  const [reproductionResult, setReproductionResult] = useState<ReproductionResult | null>(null);
  const [copiedLog, setCopiedLog] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statuses, scanJobs, projectFindings] = await Promise.all([
        api.getScannerStatuses().catch(() => ({})),
        api.getProjectScans(projectId).catch(() => []),
        api.getProjectFindings(projectId).catch(() => [])
      ]);

      setScannerStatuses(statuses);
      if (scanJobs && scanJobs.length > 0) {
        setLatestScan(scanJobs[0]);
      }
      setFindings(projectFindings);
    } catch (err) {
      console.error("Error loading security audit data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  const handleRunScan = async () => {
    try {
      setScanning(true);
      const newScan = await api.runSecurityScan(projectId);
      setLatestScan(newScan);
      const refreshedFindings = await api.getProjectFindings(projectId);
      setFindings(refreshedFindings);
    } catch (err: any) {
      alert(`Audit scan failed: ${err.message}`);
    } finally {
      setScanning(false);
    }
  };

  const handleReproduce = async (finding: Finding, mode: 'auto' | 'fixture' | 'repository' = 'auto') => {
    try {
      setReproducing(true);
      setReproductionResult(null);
      const result = await api.reproduceDefect(finding.id, mode);
      setReproductionResult(result);
      
      setFindings(prev => prev.map(f => f.id === finding.id ? { 
        ...f, 
        verification_status: result.verification_status,
        reproduction_data: {
          status: result.verification_status,
          runner_type: result.runner_type,
          target_type: result.target_type,
          target_label: result.target_label,
          security_boundary: result.security_boundary,
          expected_behavior: result.expected_behavior,
          observed_behavior: result.observed_behavior,
          test_command: result.test_command,
          exit_code: result.exit_code,
          execution_log: result.execution_log,
          timestamp: result.timestamp
        }
      } : f));

      if (selectedFinding?.id === finding.id) {
        setSelectedFinding(prev => prev ? { 
          ...prev, 
          verification_status: result.verification_status,
          reproduction_data: {
            status: result.verification_status,
            runner_type: result.runner_type,
            target_type: result.target_type,
            target_label: result.target_label,
            security_boundary: result.security_boundary,
            expected_behavior: result.expected_behavior,
            observed_behavior: result.observed_behavior,
            test_command: result.test_command,
            exit_code: result.exit_code,
            execution_log: result.execution_log,
            timestamp: result.timestamp
          }
        } : null);
      }
    } catch (err: any) {
      alert(`Defect reproduction failed: ${err.message}`);
    } finally {
      setReproducing(false);
    }
  };

  const handleCopyLog = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2000);
  };

  const filteredFindings = findings.filter(f => {
    const matchSev = filterSeverity === 'all' || f.severity === filterSeverity;
    const matchScan = filterScanner === 'all' || f.scanner_name === filterScanner;
    return matchSev && matchScan;
  });

  const severityCounts = {
    critical: findings.filter(f => f.severity === 'critical').length,
    high: findings.filter(f => f.severity === 'high').length,
    medium: findings.filter(f => f.severity === 'medium').length,
    low: findings.filter(f => f.severity === 'low').length,
  };

  const scannerFleet = [
    { id: 'semgrep', label: 'Semgrep', desc: 'Pattern Rules' },
    { id: 'gitleaks', label: 'Gitleaks', desc: 'Secret Detection' },
    { id: 'osv-scanner', label: 'OSV-Scanner', desc: 'CVE Advisories' },
    { id: 'eslint', label: 'ESLint', desc: 'Code Quality' },
    { id: 'tsc', label: 'TypeScript', desc: 'Static Types' },
    { id: 'builtin_ast', label: 'Built-in AST', desc: 'Engineered Static' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header Panel */}
      <div className="p-6 rounded-2xl bg-canvas-surface border border-border-subtle shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-700 border border-rose-500/20">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono tracking-widest uppercase text-rose-700 font-semibold">
                Threat Radar & AST Audit
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-canvas-elevated text-text-muted border border-border-subtle">
                Phase 5–7
              </span>
            </div>
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-text-primary mt-0.5">
              Security & Engineering Audit
            </h1>
            <p className="text-xs text-text-secondary font-mono mt-0.5">
              Multi-scanner AST evaluation, OWASP/CWE classification & controlled Docker reproduction.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={loadData}
            loading={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </Button>

          <Button
            data-testid="run-audit-btn"
            variant="primary"
            size="sm"
            onClick={handleRunScan}
            disabled={scanning}
            loading={scanning}
          >
            <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
            <span>{scanning ? 'Running Audit Pipeline...' : 'Run Security Audit'}</span>
          </Button>
        </div>
      </div>

      {/* Integrated Scanner Fleet Strip */}
      <div className="p-5 rounded-2xl bg-canvas-surface border border-border-subtle shadow-sm">
        <div className="text-xs font-mono uppercase tracking-wider text-text-muted mb-3 flex items-center justify-between border-b border-border-subtle pb-2">
          <span className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-blue-700" />
            <span className="font-semibold text-text-primary">Integrated Security & Diagnostics Fleet</span>
          </span>
          <span className="text-[11px] font-mono text-text-muted">6 Scanners Active</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {scannerFleet.map(tool => {
            const scanResult = latestScan?.summary_json?.scanners?.[tool.id];
            const preStatus = scannerStatuses[tool.id];
            
            const ranInScan = !!scanResult;
            const isCompleted = scanResult?.status === 'completed';
            const isUnavailable = scanResult?.status === 'scanner_unavailable' || (!ranInScan && preStatus?.available === false);
            const isError = scanResult?.status === 'error';

            let statusBadge = 'Ready to Run';
            let detailText = preStatus?.version ? `v${preStatus.version}` : 'Ready';
            let dotColor = 'bg-blue-400';
            let cardBg = 'bg-canvas-elevated/40 border-border-subtle text-text-primary';

            if (ranInScan) {
              if (isCompleted) {
                statusBadge = `${scanResult.findings_count} findings`;
                detailText = scanResult.version ? `v${scanResult.version}` : 'Completed';
                dotColor = 'bg-emerald-400';
              } else if (isUnavailable) {
                statusBadge = 'Unavailable';
                detailText = 'CLI not in PATH';
                dotColor = 'bg-slate-600';
                cardBg = 'bg-canvas-elevated/20 border-border-subtle/50 text-text-muted';
              } else if (isError) {
                statusBadge = 'Scan Error';
                detailText = 'Execution error';
                dotColor = 'bg-rose-400';
                cardBg = 'bg-rose-500/10 border-rose-500/20 text-rose-700';
              }
            } else {
              if (isUnavailable && tool.id !== 'builtin_ast') {
                statusBadge = 'Unavailable';
                detailText = 'CLI not in PATH';
                dotColor = 'bg-slate-600';
                cardBg = 'bg-canvas-elevated/20 border-border-subtle/50 text-text-muted';
              }
            }

            return (
              <div 
                key={tool.id} 
                className={`p-3 rounded-xl border transition ${cardBg}`}
                title={scanResult?.error_message || `${tool.label} status: ${statusBadge}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-semibold">{tool.label}</span>
                  <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                </div>
                <div className="text-[10px] text-text-secondary font-sans">{tool.desc}</div>
                <div className="text-[9px] font-mono mt-1.5 text-text-muted flex items-center justify-between border-t border-border-subtle/60 pt-1">
                  <span className="truncate">{statusBadge}</span>
                  <span className="opacity-75 shrink-0 ml-1">{detailText}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Metrics & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-canvas-surface border border-border-subtle">
        {/* Severity Metrics */}
        <div className="flex items-center space-x-2 font-mono text-xs flex-wrap gap-y-2">
          <span className="px-2.5 py-1 rounded-lg bg-canvas-elevated text-text-primary border border-border-subtle">
            Total: <strong className="text-blue-700">{findings.length}</strong>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-700 border border-rose-500/20">
            Critical: <strong>{severityCounts.critical}</strong>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 border border-amber-500/20">
            High: <strong>{severityCounts.high}</strong>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-700 border border-blue-500/20">
            Medium: <strong>{severityCounts.medium}</strong>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-canvas-elevated text-text-muted border border-border-subtle">
            Low: <strong>{severityCounts.low}</strong>
          </span>
        </div>

        {/* Severity Filter Controls */}
        <div className="flex items-center space-x-1 bg-canvas-elevated p-1 rounded-xl border border-border-subtle">
          {['all', 'critical', 'high', 'medium', 'low'].map(s => (
            <button
              key={s}
              onClick={() => setFilterSeverity(s)}
              className={`px-3 py-1 text-xs font-mono uppercase rounded-lg transition ${
                filterSeverity === s ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Findings Feed */}
      {filteredFindings.length === 0 ? (
        <div className="p-12 rounded-2xl bg-canvas-surface border border-border-subtle text-center space-y-4 shadow-card">
          <ShieldCheck className="w-12 h-12 text-emerald-700 mx-auto" />
          <h3 className="text-base font-bold text-text-primary">No Findings Match Selected Filters</h3>
          <p className="text-xs text-text-secondary max-w-md mx-auto">
            {findings.length === 0 
              ? "Run a security audit scan above to evaluate this repository across Semgrep, Gitleaks, OSV, and AST checkers." 
              : "Adjust your severity filter to view other reported findings."}
          </p>
          {findings.length === 0 && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleRunScan}
              disabled={scanning}
            >
              Start First Audit Scan
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFindings.map(finding => {
            const isReproduced = finding.verification_status === 'reproduction_verified';
            return (
              <div
                key={finding.id}
                className="p-6 rounded-2xl bg-canvas-surface border border-border-subtle hover:border-border-muted transition shadow-sm space-y-4"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={
                      finding.severity === 'critical' ? 'critical' :
                      finding.severity === 'high' ? 'high' :
                      finding.severity === 'medium' ? 'medium' : 'low'
                    }>
                      {finding.severity}
                    </Badge>

                    {finding.cwe_id && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-canvas-elevated text-text-secondary border border-border-subtle">
                        {finding.cwe_id}
                      </span>
                    )}

                    <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-canvas-elevated text-blue-700 border border-border-subtle">
                      tool: {finding.scanner_name}
                    </span>

                    {isReproduced ? (
                      <Badge variant="green">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        <span>Reproduction Verified</span>
                      </Badge>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-blue-500/10 text-blue-700 border border-blue-500/20">
                        Static Finding
                      </span>
                    )}
                  </div>

                  {/* File & Line Citation */}
                  <div className="text-xs font-mono text-text-muted flex items-center space-x-1.5 bg-canvas-elevated px-2.5 py-1 rounded-lg border border-border-subtle">
                    <FileCode className="w-3.5 h-3.5 text-blue-700" />
                    <span className="text-text-primary">{finding.file_path}</span>
                    {finding.line_number && (
                      <span className="text-blue-700 font-semibold">
                        :L{finding.line_number}{finding.line_end && finding.line_end !== finding.line_number ? `-L${finding.line_end}` : ''}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <h3 
                    className="text-base font-semibold text-text-primary hover:text-blue-700 cursor-pointer transition flex items-center space-x-2"
                    onClick={() => setSelectedFinding(finding)}
                  >
                    <span>{finding.title}</span>
                  </h3>
                  <p className="text-xs text-text-secondary mt-1.5 leading-relaxed font-sans">
                    {finding.description}
                  </p>
                </div>

                {/* Code Preview */}
                {finding.code_snippet && (
                  <div className="bg-canvas border border-border-subtle rounded-xl p-3 font-mono text-xs text-text-primary overflow-x-auto">
                    <pre>{finding.code_snippet}</pre>
                  </div>
                )}

                {/* Actions Footer */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border-subtle">
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleReproduce(finding)}
                      disabled={true}
                    >
                      <Terminal className="w-3.5 h-3.5 mr-1.5 text-teal-700" />
                      <span>{reproducing && selectedFinding?.id === finding.id ? 'Reproducing in Sandbox...' : 'Reproduce Defect'}</span>
                    </Button>

                    <Button
                      data-testid="details-btn"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFinding(finding)}
                    >
                      <Info className="w-3.5 h-3.5 mr-1.5 text-blue-700" />
                      <span>Details & Evidence</span>
                    </Button>
                  </div>

                  <Link
                    data-testid="open-mentor-link"
                    to={`/projects/${projectId}/mentor?findingId=${finding.id}`}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 border border-blue-500/30 text-xs font-mono font-semibold transition flex items-center space-x-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-700" />
                    <span>Explain with AI Mentor</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Finding Detail & Reproduction Drawer */}
      {selectedFinding && (
        <div className="fixed inset-0 bg-canvas/80 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-2xl bg-canvas-surface border-l border-border-subtle h-full overflow-y-auto p-6 space-y-6 shadow-elevated">
            {/* Drawer Header */}
            <div className="flex items-start justify-between border-b border-border-subtle pb-4">
              <div>
                <Badge variant={
                  selectedFinding.severity === 'critical' ? 'critical' :
                  selectedFinding.severity === 'high' ? 'high' :
                  selectedFinding.severity === 'medium' ? 'medium' : 'low'
                }>
                  {selectedFinding.severity}
                </Badge>
                <h2 className="text-lg font-bold text-text-primary mt-2">{selectedFinding.title}</h2>
                <div className="text-xs font-mono text-blue-700 mt-1 flex items-center space-x-1">
                  <FileCode className="w-3.5 h-3.5" />
                  <span>{selectedFinding.file_path}:{selectedFinding.line_number || 1}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedFinding(null)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-canvas-elevated transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* CWE & Tool Metadata */}
            <div className="grid grid-cols-2 gap-3 bg-canvas p-4 rounded-xl border border-border-subtle font-mono text-xs">
              <div>
                <span className="text-text-muted">Classification:</span>
                <div className="text-text-primary font-semibold">{selectedFinding.cwe_id || 'CWE Standard'}</div>
              </div>
              <div>
                <span className="text-text-muted">Scanner Tool:</span>
                <div className="text-blue-700 font-semibold">{selectedFinding.scanner_name}</div>
              </div>
              <div>
                <span className="text-text-muted">Confidence:</span>
                <div className="text-emerald-700 font-semibold uppercase">{selectedFinding.confidence}</div>
              </div>
              <div>
                <span className="text-text-muted">Verification Status:</span>
                <div className="text-teal-700 font-semibold">{selectedFinding.verification_status}</div>
              </div>
            </div>

            {/* Code Snippet */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-text-muted">Vulnerable Code Snippet (Sanitized)</label>
              <div className="bg-canvas border border-border-subtle rounded-xl p-4 font-mono text-xs text-text-primary overflow-x-auto">
                <pre>{selectedFinding.code_snippet || '// No snippet captured for this rule.'}</pre>
              </div>
            </div>

            {/* Risk & Remediation */}
            <div className="space-y-4">
              <div className="bg-canvas p-4 rounded-xl border border-border-subtle space-y-1">
                <span className="text-xs font-mono uppercase text-amber-700 font-semibold flex items-center space-x-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Risk Explanation</span>
                </span>
                <p className="text-xs text-text-secondary leading-relaxed font-sans">
                  {selectedFinding.risk_explanation || selectedFinding.description}
                </p>
              </div>

              <div className="bg-canvas p-4 rounded-xl border border-border-subtle space-y-1">
                <span className="text-xs font-mono uppercase text-emerald-700 font-semibold flex items-center space-x-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Recommended Remediation</span>
                </span>
                <p className="text-xs text-text-secondary leading-relaxed font-sans">
                  {selectedFinding.remediation || 'Apply principle of least privilege, input validation, and boundary verification.'}
                </p>
              </div>
            </div>

            {/* Controlled Defect Reproduction Sandbox */}
            <div className="bg-canvas border border-border-subtle rounded-2xl p-5 space-y-4 shadow-card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <Terminal className="w-5 h-5 text-teal-700" />
                  <div>
                    <span className="text-sm font-semibold text-text-primary block">Controlled Defect Reproduction</span>
                    <span className="text-[10px] font-mono text-text-muted">
                      Isolated verification with explicit security boundaries
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    data-testid="reproduce-sandbox-btn"
                    onClick={() => handleReproduce(selectedFinding, 'fixture')}
                    disabled={true}
                    className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs font-mono uppercase tracking-wider transition shadow-sm disabled:opacity-50 flex items-center space-x-1.5"
                    title="Execute verified educational benchmark harness"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{reproducing ? 'Executing...' : 'Run Benchmark'}</span>
                  </button>

                  <button
                    data-testid="reproduce-repo-btn"
                    onClick={() => handleReproduce(selectedFinding, 'repository')}
                    disabled={true}
                    className="px-3 py-1.5 rounded-xl bg-canvas-elevated hover:bg-canvas-elevated/80 text-text-secondary hover:text-text-primary border border-border-subtle text-xs font-mono transition disabled:opacity-50 flex items-center space-x-1"
                    title="Attempt direct execution on imported repository code (Requires Docker container)"
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-700" />
                    <span>Test Repo Code</span>
                  </button>
                </div>
              </div>

              {/* Security Boundary Notice */}
              <div className="p-3.5 rounded-xl bg-canvas-elevated border border-border-subtle text-[11px] text-text-secondary space-y-1">
                <div className="flex items-center space-x-1.5 text-blue-700 font-mono font-semibold text-xs">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Security Boundary Enforcement</span>
                </div>
                <p className="text-text-muted leading-relaxed text-[11px] font-sans">
                  <strong>Host Subprocess Fallback:</strong> Strictly disabled for all untrusted repository code. Only vetted, hermetic educational benchmarks may run in isolated host subprocesses when Docker is stopped. Direct reproduction of custom repository code requires active Docker container isolation (<code className="text-blue-700">--network=none</code>, <code className="text-blue-700">--read-only</code>, <code className="text-blue-700">--memory=512m</code>).
                </p>
              </div>

              {/* Reproduction Output Terminal */}
              {(reproductionResult || selectedFinding.reproduction_data) && (
                <div data-testid="reproduction-terminal" className="space-y-2 pt-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono bg-canvas px-3 py-2 rounded-xl border border-border-subtle">
                    <span className="text-text-muted">
                      Target: <strong className={
                        (reproductionResult?.target_type || selectedFinding.reproduction_data?.target_type) === 'imported_repository_code'
                          ? 'text-amber-700'
                          : 'text-teal-700'
                      }>
                        {(reproductionResult?.target_type || selectedFinding.reproduction_data?.target_type) === 'imported_repository_code'
                          ? 'Untrusted Repository Code'
                          : 'Controlled Benchmark Fixture'}
                      </strong>
                    </span>
                    <span className="text-text-muted">
                      Runner: <strong className="text-blue-700">{reproductionResult?.runner_type || selectedFinding.reproduction_data?.runner_type}</strong>
                    </span>
                    <span className="font-semibold text-emerald-700">
                      Status: {reproductionResult?.verification_status || selectedFinding.reproduction_data?.status || selectedFinding.verification_status}
                    </span>
                  </div>

                  {(reproductionResult?.security_boundary || selectedFinding.reproduction_data?.security_boundary) && (
                    <div className="text-[10px] font-mono text-text-muted bg-canvas px-3 py-1.5 rounded-lg border border-border-subtle">
                      <span className="text-blue-700 font-semibold">Policy: </span>
                      {reproductionResult?.security_boundary || selectedFinding.reproduction_data?.security_boundary}
                    </div>
                  )}

                  <div className="relative bg-canvas-elevated rounded-xl p-4 font-mono text-[11px] text-emerald-700 space-y-2 overflow-x-auto border border-border-subtle">
                    <button
                      onClick={() => handleCopyLog(reproductionResult?.execution_log || selectedFinding.reproduction_data?.execution_log || '')}
                      className="absolute top-3 right-3 p-1.5 rounded bg-canvas-elevated hover:bg-canvas-elevated/80 text-text-muted hover:text-text-primary transition"
                      title="Copy log to clipboard"
                    >
                      {copiedLog ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <div className="text-text-muted">
                      $ {reproductionResult?.test_command || selectedFinding.reproduction_data?.test_command}
                    </div>
                    <pre className="whitespace-pre-wrap">
                      {reproductionResult?.execution_log || selectedFinding.reproduction_data?.execution_log}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="pt-2 space-y-2">
              <Link
                data-testid="drawer-open-repair"
                to={`/projects/${projectId}/repair?finding_id=${selectedFinding.id}`}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs font-mono uppercase tracking-wider transition flex items-center justify-center space-x-2 shadow-sm"
              >
                <Wrench className="w-4 h-4" />
                <span>Start Guided Repair (Studio)</span>
              </Link>
              <Link
                data-testid="drawer-open-mentor"
                to={`/projects/${projectId}/mentor?findingId=${selectedFinding.id}`}
                className="w-full py-2.5 rounded-xl bg-canvas-elevated hover:bg-canvas-elevated/80 text-blue-700 font-semibold text-xs font-mono uppercase tracking-wider transition flex items-center justify-center space-x-2 border border-border-subtle"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Open in AI Mentor (Socratic Hints)</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default SecurityAuditPage;
