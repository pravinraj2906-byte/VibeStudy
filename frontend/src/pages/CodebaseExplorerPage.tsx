import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { 
  FileCode2, 
  Folder, 
  FolderOpen, 
  Bot, 
  Sparkles, 
  ShieldCheck, 
  ChevronRight, 
  ChevronDown, 
  Copy, 
  Check, 
  Terminal, 
  Search,
  X
} from 'lucide-react';
import { api } from '../api/client';
import { FileTreeNode, ComponentExplanation } from '../types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

export const CodebaseExplorerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const queryFile = searchParams.get('file');

  const projectId = id ? parseInt(id, 10) : 1;

  const [tree, setTree] = useState<FileTreeNode[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [loadingFile, setLoadingFile] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const [explanation, setExplanation] = useState<ComponentExplanation | null>(null);
  const [copied, setCopied] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  useEffect(() => {
    if (!projectId) return;
    api.getProjectFiles(projectId).then(res => {
      setTree(res.tree);

      if (queryFile) {
        setSelectedPath(queryFile);
      } else {
        const findFirstFile = (nodes: FileTreeNode[]): string | null => {
          for (const n of nodes) {
            if (n.type === 'file') return n.path;
            if (n.children) {
              const f = findFirstFile(n.children);
              if (f) return f;
            }
          }
          return null;
        };
        const first = findFirstFile(res.tree);
        if (first) {
          setSelectedPath(first);
        }
      }
    }).catch(err => console.error(err));
  }, [projectId, queryFile]);

  useEffect(() => {
    if (!selectedPath) return;
    setLoadingFile(true);
    setExplanation(null);
    api.getFileContent(projectId, selectedPath)
      .then(res => setFileContent(res.content))
      .catch(err => setFileContent(`// Error loading file: ${err.message}`))
      .finally(() => setLoadingFile(false));
  }, [selectedPath, projectId]);

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => ({ ...prev, [path]: !prev[path] }));
  };

  const handleCopy = () => {
    if (!fileContent) return;
    navigator.clipboard.writeText(fileContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExplain = async () => {
    if (!selectedPath) return;
    setExplaining(true);
    try {
      const res = await api.explainComponent(projectId, {
        file_path: selectedPath,
        query: "Explain the architecture, purpose, dependencies, and key logic of this source file."
      });
      setExplanation(res);
    } catch (err: any) {
      alert(`AI explanation failed: ${err.message}`);
    } finally {
      setExplaining(false);
    }
  };

  const renderTree = (nodes: FileTreeNode[], depth = 0) => {
    return nodes.map(node => {
      if (node.type === 'directory') {
        const isExpanded = expandedFolders[node.path] ?? (depth < 2);
        return (
          <div key={node.path} className="select-none">
            <div
              onClick={() => toggleFolder(node.path)}
              className="flex items-center space-x-1.5 py-1 px-2 rounded-lg hover:bg-canvas-elevated cursor-pointer text-xs text-text-secondary font-mono transition"
              style={{ paddingLeft: `${depth * 14 + 8}px` }}
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
              )}
              {isExpanded ? (
                <FolderOpen className="w-4 h-4 text-blue-700" />
              ) : (
                <Folder className="w-4 h-4 text-blue-500" />
              )}
              <span className="truncate">{node.name}</span>
            </div>
            {isExpanded && node.children && (
              <div>{renderTree(node.children, depth + 1)}</div>
            )}
          </div>
        );
      }

      if (searchFilter && !node.name.toLowerCase().includes(searchFilter.toLowerCase())) {
        return null;
      }

      const isSelected = selectedPath === node.path;
      return (
        <div
          key={node.path}
          onClick={() => setSelectedPath(node.path)}
          className={`flex items-center space-x-2 py-1 px-2 rounded-lg cursor-pointer text-xs font-mono transition select-none ${
            isSelected
              ? 'bg-blue-500/20 text-blue-700 border border-blue-500/40 font-semibold'
              : 'text-text-muted hover:text-text-primary hover:bg-canvas-elevated'
          }`}
          style={{ paddingLeft: `${depth * 14 + 20}px` }}
        >
          <FileCode2 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-700' : 'text-text-muted'}`} />
          <span className="truncate">{node.name}</span>
        </div>
      );
    });
  };

  return (
    <div className="h-[calc(100vh-8.5rem)] flex flex-col space-y-3 max-w-7xl mx-auto">
      {/* Top Action & File Path Bar */}
      <div className="p-3 rounded-2xl bg-canvas-surface border border-border-subtle flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center space-x-2.5 text-xs font-mono truncate">
          <Terminal className="w-4 h-4 text-blue-700 shrink-0" />
          <span className="text-text-muted font-semibold">SOURCE:</span>
          <span className="text-blue-700 font-semibold truncate">
            {selectedPath || 'Select a file to inspect'}
          </span>
          {selectedPath && <Badge variant="blue" size="xs">READ-ONLY</Badge>}
        </div>

        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleCopy}
            disabled={!fileContent}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-700" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 mr-1.5 text-text-muted" />
                <span>Copy</span>
              </>
            )}
          </Button>

          <Button
            size="sm"
            variant="primary"
            loading={explaining}
            onClick={handleExplain}
            disabled={!selectedPath || explaining}
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            <span>Explain with AI Mentor</span>
          </Button>
        </div>
      </div>

      {/* 3-Pane Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0 overflow-hidden">
        {/* Left: File Tree Navigator */}
        <div className="lg:col-span-3 p-3 rounded-2xl bg-canvas-surface border border-border-subtle flex flex-col overflow-hidden">
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Filter files..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-canvas-elevated border border-border-subtle focus:border-blue-500 rounded-lg pl-8 pr-2.5 py-1.5 text-xs font-mono text-text-primary placeholder-text-muted focus:outline-none transition"
            />
          </div>

          <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted px-2 py-1 font-semibold">
            Project Files & Tree
          </div>

          <div className="flex-1 overflow-y-auto space-y-0.5 pr-1">
            {tree.length === 0 ? (
              <p className="text-xs font-mono text-text-muted p-2">Loading tree structure...</p>
            ) : (
              renderTree(tree)
            )}
          </div>
        </div>

        {/* Center: Code Viewer */}
        <div className={`rounded-2xl bg-canvas-surface border border-border-subtle overflow-hidden flex flex-col ${explanation ? 'lg:col-span-5' : 'lg:col-span-9'}`}>
          <div className="bg-canvas-elevated px-4 py-2 border-b border-border-subtle flex items-center justify-between text-xs font-mono text-text-muted">
            <span className="font-semibold text-text-primary truncate">
              {selectedPath ? selectedPath.split('/').pop() : 'Empty'}
            </span>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] text-text-muted">
                {fileContent.split('\n').length} lines
              </span>
              <div className="flex items-center space-x-1 text-emerald-700">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="text-[10px] font-mono">Sanitized</span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 bg-canvas font-mono text-xs text-text-primary leading-relaxed">
            {loadingFile ? (
              <div className="h-full flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <pre className="overflow-x-auto">
                {fileContent.split('\n').map((line, idx) => (
                  <div key={idx} className="flex hover:bg-canvas-elevated/80 transition px-1 rounded">
                    <span className="w-10 text-right pr-4 text-text-muted select-none font-mono shrink-0">
                      {idx + 1}
                    </span>
                    <span className="whitespace-pre font-mono">{line || ' '}</span>
                  </div>
                ))}
              </pre>
            )}
          </div>
        </div>

        {/* Right: AI Mentor Explanation Panel (Grounded) */}
        {explanation && (
          <div className="lg:col-span-4 p-5 rounded-2xl bg-canvas-surface border border-border-subtle flex flex-col overflow-hidden shadow-elevated space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <div className="flex items-center space-x-2 text-blue-700">
                <Bot className="w-5 h-5" />
                <h3 className="text-xs font-semibold uppercase tracking-wider font-mono">
                  Grounded Architecture Mentor
                </h3>
              </div>
              <button
                onClick={() => setExplanation(null)}
                className="text-xs font-mono text-text-muted hover:text-text-primary p-1 rounded transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs text-text-secondary font-sans">
              {explanation.source_references && explanation.source_references.length > 0 && (
                <div className="bg-canvas-elevated p-3.5 rounded-xl border border-border-subtle space-y-2 font-mono">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-blue-700 font-semibold block">
                    CITED SOURCE CODE INVARIANTS:
                  </span>
                  <div className="space-y-1.5">
                    {explanation.source_references.slice(0, 5).map((ref, i) => (
                      <div key={i} className="flex items-center space-x-2 text-[11px] text-text-muted bg-canvas p-1.5 rounded border border-border-subtle">
                        <span className="text-emerald-700 font-semibold shrink-0">L{ref.line}:</span>
                        <span className="truncate text-text-primary">{ref.content}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2 whitespace-pre-line leading-relaxed text-xs text-text-primary">
                {explanation.explanation}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default CodebaseExplorerPage;
