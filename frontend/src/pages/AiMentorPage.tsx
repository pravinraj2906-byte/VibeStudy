import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { 
  Bot, 
  Send, 
  Sparkles, 
  FileCode, 
  CheckCircle2, 
  Lock, 
  Unlock, 
  BookOpen,
  MessageSquare,
  ShieldCheck,
  Brain,
  Target,
  History,
  Trash2,
  Compass
} from 'lucide-react';
import { api } from '../api/client';
import { Project, Finding, MentorExplanation, MentorHint } from '../types';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { useMentorMemory } from '../hooks/useMentorMemory';

interface ChatMessage {
  id: string;
  sender: 'user' | 'mentor';
  text: string;
  timestamp: string;
}

export const AiMentorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const findingIdParam = searchParams.get('findingId');
  const projectId = id ? parseInt(id, 10) : 1;
  const { user } = useAuth();
  const { memory, syncState, rememberMessage, rememberTopic, updatePreferences, clearMemory } = useMentorMemory(projectId);

  const [project, setProject] = useState<Project | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [selectedFindingId, setSelectedFindingId] = useState<number | null>(
    findingIdParam ? parseInt(findingIdParam, 10) : null
  );

  // Finding Explanation State
  const [activeTab, setActiveTab] = useState<'guide' | 'hints' | 'chat'>('guide');
  const [explanation, setExplanation] = useState<MentorExplanation | null>(null);
  const [loadingExplanation, setLoadingExplanation] = useState<boolean>(false);

  // Progressive Hints State (Levels 1 to 4)
  const [unlockedLevel, setUnlockedLevel] = useState<number>(1);
  const [hints, setHints] = useState<Record<number, MentorHint>>({});
  const [loadingHint, setLoadingHint] = useState<boolean>(false);

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>(() => memory.conversation.length ? memory.conversation : [{
    id: 'welcome',
    sender: 'mentor',
    text: `Hi ${user?.full_name?.split(' ')[0] || 'builder'} — I’m your friendly engineering mentor. I can teach you how this project works, why each technology is here, how the data flows, and what to build next. We’ll reason together instead of copy-pasting answers.`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (projectId) {
      api.getProject(projectId).then(setProject).catch(() => null);
      api.getProjectFindings(projectId).then(setFindings).catch(() => []);
    }
  }, [projectId]);

  useEffect(() => {
    if (findingIdParam) {
      const fid = parseInt(findingIdParam, 10);
      setSelectedFindingId(fid);
      loadFindingGuide(fid);
    }
  }, [findingIdParam]);

  useEffect(() => {
    if (memory.conversation.length > 0) setMessages(memory.conversation);
  }, [memory.conversation]);

  const loadFindingGuide = async (findingId: number) => {
    try {
      setLoadingExplanation(true);
      setUnlockedLevel(1);
      setHints({});
      const exp = await api.explainFinding(findingId);
      setExplanation(exp);

      // Load Level 1 Hint automatically
      setLoadingHint(true);
      const h1 = await api.getFindingHint(findingId, 1);
      setHints({ 1: h1 });
    } catch (err) {
      console.error("Error loading mentor finding guide:", err);
    } finally {
      setLoadingExplanation(false);
      setLoadingHint(false);
    }
  };

  const handleSelectFinding = (findingId: number) => {
    setSelectedFindingId(findingId);
    loadFindingGuide(findingId);
  };

  const handleUnlockNextHint = async () => {
    if (!selectedFindingId || unlockedLevel >= 4 || loadingHint) return;
    const nextLevel = unlockedLevel + 1;
    try {
      setLoadingHint(true);
      const hint = await api.getFindingHint(selectedFindingId, nextLevel);
      setHints(prev => ({ ...prev, [nextLevel]: hint }));
      setUnlockedLevel(nextLevel);
    } catch (err) {
      console.error("Error unlocking hint:", err);
    } finally {
      setLoadingHint(false);
    }
  };

  const handleSendChat = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || sending) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    rememberMessage(userMsg);
    if (!queryText) setInput('');
    setSending(true);

    try {
      const recentTopics = memory.learnedTopics.length ? memory.learnedTopics.join(', ') : 'none yet';
      const teachingQuery = [
        `You are a friendly Socratic engineering mentor teaching ${user?.full_name || 'this developer'} how their own AI-assisted project works.`,
        `Project: ${project?.name || 'current repository'} (${project?.framework || 'unknown framework'}, ${project?.language || 'unknown language'}).`,
        `Learning goal: ${memory.goal}. Preferred teaching mode: ${memory.teachingMode}. Previously learned topics: ${recentTopics}.`,
        'Explain in plain language, connect the idea to this repository, give one small example, one practical next step, and end with a short check-for-understanding question.',
        `Question: ${textToSend}`,
      ].join('\n');
      const res = await api.explainComponent(projectId, {
        file_path: "README.md",
        query: teachingQuery
      });

      const mentorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'mentor',
        text: res.explanation,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, mentorMsg]);
      rememberMessage(mentorMsg);
      rememberTopic(textToSend.split(/\s+/).slice(0, 5).join(' '));
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'mentor',
        text: `I can’t reach the live AI service right now, but your learning memory is safe. Try again shortly, or open the architecture and code explorer while the API wakes up. (${err.message})`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
      rememberMessage(errorMsg);
    } finally {
      setSending(false);
    }
  };

  const activeFinding = findings.find(f => f.id === selectedFindingId);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Header Panel */}
      <div className="p-6 rounded-2xl bg-canvas-surface border border-border-subtle shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-700 border border-blue-500/20">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono tracking-widest uppercase text-blue-700 font-semibold">
                Friendly Socratic Engineering Tutor
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                Grounded Citations
              </span>
            </div>
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-text-primary mt-0.5">
              AI Engineering Mentor
            </h1>
            <p className="text-xs text-text-secondary font-mono mt-0.5">
              Teaches your whole project, remembers your learning journey, and still provides grounded 4-level security hints.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/5 px-3 py-2">
          <Brain className="h-4 w-4 text-blue-700" />
          <div><p className="text-[10px] font-mono uppercase tracking-wider text-blue-700">Personal memory {syncState === 'synced' ? 'synced' : syncState === 'loading' ? 'loading' : 'available locally'}</p><p className="text-[11px] text-text-muted">{memory.learnedTopics.length} topics · {memory.conversation.length} remembered messages</p></div>
        </div>

        {/* Finding Selector */}
        {findings.length > 0 && (
          <div className="flex items-center space-x-2 bg-canvas-elevated px-3 py-1.5 rounded-xl border border-border-subtle">
            <span className="text-xs font-mono text-text-muted">Target Defect:</span>
            <select
              value={selectedFindingId || ''}
              onChange={(e) => handleSelectFinding(parseInt(e.target.value, 10))}
              className="bg-canvas border border-border-subtle text-text-primary rounded-lg px-2.5 py-1 text-xs font-mono focus:border-blue-500 outline-none max-w-xs truncate"
            >
              <option value="">-- Select Audited Defect --</option>
              {findings.map(f => (
                <option key={f.id} value={f.id}>
                  [{f.severity.toUpperCase()}] {f.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Workspace */}
      {selectedFindingId && activeFinding ? (
        <div className="space-y-6">
          {/* Finding Banner */}
          <div className="p-5 rounded-2xl bg-canvas-surface border border-border-subtle flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={
                activeFinding.severity === 'critical' ? 'critical' :
                activeFinding.severity === 'high' ? 'high' :
                activeFinding.severity === 'medium' ? 'medium' : 'low'
              }>
                {activeFinding.severity}
              </Badge>

              <h2 className="text-base font-semibold text-text-primary">{activeFinding.title}</h2>

              <span className="text-xs font-mono text-blue-700 bg-canvas-elevated px-2.5 py-1 rounded-lg border border-border-subtle flex items-center space-x-1.5">
                <FileCode className="w-3.5 h-3.5" />
                <span>{activeFinding.file_path}:{activeFinding.line_number || 1}</span>
              </span>

              {explanation?.citations_verified && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                  <span>Line Citations Verified</span>
                </span>
              )}
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center space-x-1 bg-canvas-elevated p-1 rounded-xl border border-border-subtle">
              <button
                data-testid="tab-guide"
                onClick={() => setActiveTab('guide')}
                className={`px-3 py-1.5 text-xs font-mono uppercase rounded-lg transition flex items-center space-x-1.5 ${
                  activeTab === 'guide' ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Educational Guide</span>
              </button>
              <button
                data-testid="tab-hints"
                onClick={() => setActiveTab('hints')}
                className={`px-3 py-1.5 text-xs font-mono uppercase rounded-lg transition flex items-center space-x-1.5 ${
                  activeTab === 'hints' ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Progressive Hints (1-4)</span>
              </button>
              <button
                data-testid="tab-chat"
                onClick={() => setActiveTab('chat')}
                className={`px-3 py-1.5 text-xs font-mono uppercase rounded-lg transition flex items-center space-x-1.5 ${
                  activeTab === 'chat' ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Socratic Chat</span>
              </button>
            </div>
          </div>

          {/* TAB 1: Grounded Educational Guide */}
          {activeTab === 'guide' && (
            <div className="p-6 rounded-2xl bg-canvas-surface border border-border-subtle shadow-card space-y-6">
              {loadingExplanation ? (
                <div className="py-16 text-center space-y-3">
                  <Sparkles className="w-8 h-8 text-blue-700 animate-spin mx-auto" />
                  <p className="text-sm font-mono text-text-muted">Synthesizing grounded engineering analysis with Gemini...</p>
                </div>
              ) : explanation ? (
                <div className="space-y-6">
                  {/* Verified Line References */}
                  <div className="bg-canvas p-4 rounded-xl border border-border-subtle font-mono text-xs flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <FileCode className="w-4 h-4 text-blue-700" />
                      <span className="text-text-muted">Grounded Code Citation:</span>
                      <strong className="text-text-primary">{activeFinding.file_path}</strong>
                      <span className="text-blue-700 font-semibold">
                        (Lines: {explanation.cited_lines.join(', ') || 'Inspection range'})
                      </span>
                    </div>
                    <span className="text-[11px] text-emerald-700 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                      Prompt Guardrails Active (Zero Leakage)
                    </span>
                  </div>

                  {/* Markdown Output */}
                  <div className="bg-canvas p-6 rounded-xl border border-border-subtle text-text-primary leading-relaxed space-y-4 font-sans text-sm">
                    <div className="whitespace-pre-wrap leading-relaxed">
                      {explanation.explanation_markdown}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-text-muted text-sm">
                  Click on an audited finding to load its educational breakdown.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Progressive 4-Level Hint Deck */}
          {activeTab === 'hints' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-canvas-surface border border-border-subtle flex items-center justify-between shadow-sm">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-blue-700" />
                    <span>Socratic Progressive Hints</span>
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    Step-by-step cognitive scaffolding. Learn the concept before looking at the fix.
                  </p>
                </div>

                {unlockedLevel < 4 && (
                  <Button
                    data-testid="unlock-hint-btn"
                    variant="primary"
                    size="sm"
                    onClick={handleUnlockNextHint}
                    disabled={loadingHint}
                    loading={loadingHint}
                  >
                    <Unlock className="w-3.5 h-3.5 mr-1.5" />
                    <span>{loadingHint ? 'Generating Hint...' : `Unlock Level ${unlockedLevel + 1}`}</span>
                  </Button>
                )}
              </div>

              {/* 4 Hint Cards */}
              {[
                { level: 1, title: 'Level 1: Conceptual Security Principle', desc: 'Understanding the underlying vulnerability class without spoilers.' },
                { level: 2, title: 'Level 2: Investigation & Data Flow Direction', desc: 'Which architectural layer or data transition to inspect.' },
                { level: 3, title: 'Level 3: Vulnerable Code Location & Root Cause', desc: 'Pinpoint the file and function failing the security requirement.' },
                { level: 4, title: 'Level 4: Concrete Repair Strategy & Verification', desc: 'The architectural pattern and regression test to verify resolution.' }
              ].map(card => {
                const isUnlocked = unlockedLevel >= card.level;
                const hintData = hints[card.level];
                return (
                  <div
                    key={card.level}
                    className={`rounded-2xl border p-6 transition shadow-sm ${
                      isUnlocked 
                        ? 'bg-canvas-surface border-border-subtle text-text-primary' 
                        : 'bg-canvas-elevated/20 border-border-subtle/50 text-text-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-xl border ${
                          isUnlocked 
                            ? 'bg-blue-500/10 text-blue-700 border-blue-500/20'
                            : 'bg-canvas-elevated text-text-muted border-border-subtle'
                        }`}>
                          {isUnlocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-text-primary">{card.title}</h4>
                          <span className="text-[11px] text-text-muted">{card.desc}</span>
                        </div>
                      </div>

                      <span className={`text-xs font-mono font-semibold px-2.5 py-1 rounded-lg ${
                        isUnlocked ? 'bg-blue-500/10 text-blue-700 border border-blue-500/20' : 'bg-canvas-elevated text-text-muted'
                      }`}>
                        {isUnlocked ? 'Unlocked' : 'Locked'}
                      </span>
                    </div>

                    {isUnlocked && hintData && (
                      <div className="mt-4 pt-4 border-t border-border-subtle text-sm text-text-primary leading-relaxed font-sans bg-canvas p-4 rounded-xl border border-border-subtle">
                        <p className="whitespace-pre-wrap">{hintData.hint_text}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: Socratic Chat */}
          {activeTab === 'chat' && (
            <div className="rounded-2xl bg-canvas-surface border border-border-subtle overflow-hidden shadow-elevated flex flex-col h-[520px]">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map(m => (
                  <div
                    key={m.id}
                    className={`flex items-start space-x-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {m.sender === 'mentor' && (
                      <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-700 border border-blue-500/20 flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}
                    <div
                      className={`max-w-2xl rounded-2xl px-5 py-3 text-sm leading-relaxed ${
                        m.sender === 'user'
                          ? 'bg-blue-600 text-white font-medium'
                          : 'bg-canvas text-text-primary border border-border-subtle font-sans'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.text}</p>
                      <span className={`text-[10px] font-mono block mt-1.5 ${m.sender === 'user' ? 'text-blue-100' : 'text-text-muted'}`}>
                        {m.timestamp}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Chat Input */}
              <div className="p-4 bg-canvas-elevated border-t border-border-subtle flex items-center space-x-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                  placeholder="Ask a question about this defect, exploitation path, or test strategy..."
                  className="flex-1 bg-canvas border border-border-subtle text-text-primary rounded-xl px-4 py-2 text-xs font-mono focus:border-blue-500 outline-none placeholder-text-muted"
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleSendChat()}
                  disabled={sending || !input.trim()}
                  loading={sending}
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  <span>Send</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-2xl bg-canvas-surface border border-border-subtle overflow-hidden shadow-elevated flex flex-col min-h-[620px]" aria-labelledby="project-mentor-title">
            <div className="p-5 border-b border-border-subtle bg-canvas-elevated/50">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-blue-700 flex items-center gap-2"><Compass className="w-3.5 h-3.5" /> Project-wide teaching mode</p>
                  <h2 id="project-mentor-title" className="text-lg font-bold text-text-primary mt-1">Let’s understand {project?.name || 'your build'} together.</h2>
                  <p className="text-xs text-text-secondary mt-1 max-w-2xl">Ask about architecture, AI choices, data flow, security, testing, or the next feature. I’ll remember the useful context for this signed-in profile and project.</p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => navigate(`/projects/${projectId}/audit`)}><ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Review security findings</Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-4" aria-label="Suggested mentor questions">
                {[
                  'Explain this project like I am new to the stack',
                  'Show me how data moves through the system',
                  'What should I build next and why?',
                  'Teach me the AI architecture and its risks',
                ].map((prompt) => <button key={prompt} type="button" onClick={() => handleSendChat(prompt)} className="text-[11px] px-3 py-1.5 rounded-full border border-border-subtle bg-canvas hover:border-blue-500/40 hover:text-blue-700 transition">{prompt}</button>)}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 lg:p-6 space-y-4" aria-live="polite">
              {messages.map((message) => (
                <div key={message.id} className={`flex items-start gap-3 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {message.sender === 'mentor' ? <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-700 border border-blue-500/20 flex items-center justify-center shrink-0"><Bot className="w-4 h-4" /></div> : null}
                  <div className={`max-w-2xl rounded-2xl px-5 py-3 text-sm leading-relaxed ${message.sender === 'user' ? 'bg-blue-600 text-white font-medium' : 'bg-canvas text-text-primary border border-border-subtle'}`}>
                    <p className="whitespace-pre-wrap">{message.text}</p>
                    <span className={`text-[10px] font-mono block mt-1.5 ${message.sender === 'user' ? 'text-blue-100' : 'text-text-muted'}`}>{message.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-canvas-elevated border-t border-border-subtle flex items-center gap-3">
              <label htmlFor="project-mentor-input" className="sr-only">Ask the AI mentor about your project</label>
              <input id="project-mentor-input" type="text" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && handleSendChat()} placeholder="Ask how or why something in your project works…" className="flex-1 bg-canvas border border-border-subtle text-text-primary rounded-xl px-4 py-2.5 text-xs font-mono focus:border-blue-500 outline-none placeholder-text-muted" />
              <Button variant="primary" size="sm" onClick={() => handleSendChat()} disabled={sending || !input.trim()} loading={sending}><Send className="w-3.5 h-3.5 mr-1.5" /> Send</Button>
            </div>
          </section>

          <aside className="space-y-4" aria-label="Personal mentor memory">
            <div className="rounded-2xl bg-canvas-surface border border-border-subtle p-5 shadow-card">
              <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-mono uppercase tracking-widest text-blue-700 flex items-center gap-1.5"><Brain className="w-3.5 h-3.5" /> Learning memory</p><h3 className="font-bold text-text-primary mt-1">What I remember</h3></div><button type="button" onClick={clearMemory} className="p-2 rounded-lg text-text-muted hover:text-red-600 hover:bg-red-500/5" aria-label="Clear mentor memory"><Trash2 className="w-4 h-4" /></button></div>
              <label className="block text-[11px] text-text-muted mt-5">Your current goal<textarea value={memory.goal} onChange={(event) => updatePreferences({ goal: event.target.value })} rows={3} className="mt-2 w-full resize-none rounded-xl border border-border-subtle bg-canvas p-3 text-xs text-text-primary outline-none focus:border-blue-500" /></label>
              <label className="block text-[11px] text-text-muted mt-4">Teaching style<select value={memory.teachingMode} onChange={(event) => updatePreferences({ teachingMode: event.target.value as 'guided' | 'concise' | 'deep-dive' })} className="mt-2 w-full rounded-xl border border-border-subtle bg-canvas p-2.5 text-xs text-text-primary outline-none focus:border-blue-500"><option value="guided">Guided, step by step</option><option value="concise">Concise explanations</option><option value="deep-dive">Deep technical dive</option></select></label>
            </div>

            <div className="rounded-2xl bg-canvas-surface border border-border-subtle p-5 shadow-card">
              <p className="text-[10px] font-mono uppercase tracking-widest text-emerald-700 flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> Concepts visited</p>
              <div className="flex flex-wrap gap-2 mt-4">{memory.learnedTopics.length ? memory.learnedTopics.map((topic) => <span key={topic} className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-800 border border-emerald-500/20 text-[10px]">{topic}</span>) : <p className="text-xs text-text-muted">Your topic trail will appear as you learn.</p>}</div>
            </div>

            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
              <p className="text-[10px] font-mono uppercase tracking-widest text-amber-700 flex items-center gap-1.5"><Target className="w-3.5 h-3.5" /> How memory works</p>
              <p className="text-xs text-text-secondary leading-relaxed mt-3">Memory is scoped to your signed-in user and this project. Your goal, recent teaching conversation, and topic labels sync to your account, with a local fallback when the API is offline. Repository secrets are never stored in mentor memory.</p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};
export default AiMentorPage;
