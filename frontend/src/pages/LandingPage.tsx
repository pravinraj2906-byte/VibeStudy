import React, { lazy, Suspense, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowRight, ShieldCheck, GitBranch, Play, X, Brain, MessageCircle, Target, Gauge, TestTube2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
const Architecture = lazy(() => import('../components/3d/LivingCodeStructure3D'));

const chapters = [
  ['01', 'See the whole picture.', 'Explore your repository, its structure, and the code behind every finding.', 'map'],
  ['02', 'Make the fix yours.', 'Work through progressive hints. Write your own patch. Understand why it works.', 'repair'],
  ['03', 'Take the skill with you.', 'Verify your repair, then try a fresh challenge without the guiding hand.', 'transfer'],
];

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const [show3D, setShow3D] = useState(false);
  return <div className="editorial">
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="editorial-nav">
      <Link className="wordmark" to="/"><span className="brand-symbol">p/</span> proofforge</Link>
      <nav aria-label="Main navigation"><a href="#approach">The approach</a><a href="#architecture">Inside the product</a></nav>
      <Link className="quiet-link" to={user ? '/dashboard' : '/auth'}>{user ? 'Your workspace' : 'Sign in'} <ArrowUpRight size={16}/></Link>
    </header>
    <main id="main">
      <section className="editorial-hero">
        <div className="hero-copy">
          <p className="eyebrow"><span/> AI code needs engineering evidence</p>
          <h1>Build fast.<br/><em>Prove</em> what works.</h1>
          <p className="hero-description">ProofForge maps an AI-built repository, teaches the developer how it works, and verifies security repairs before a skill claim appears.</p>
          <div className="hero-actions"><Link className="ink-button" to={user ? '/import' : '/auth'}>Analyze a repository <ArrowUpRight size={18}/></Link><Link to="/prototype" className="text-link">Open judge prototype <ArrowRight size={16}/></Link></div>
          <p className="hero-footnote">Repository facts. Grounded mentoring. Verifiable outcomes.</p>
        </div>
        <div className="sculpture" role="img" aria-label="Original architectural illustration: connected ivory and teal layers representing code, repair, and understanding">
          <div className="sculpture-orbit orbit-one"/><div className="sculpture-orbit orbit-two"/>
          <div className="sculpture-stack"><div className="slab slab-top"><span>understand</span></div><div className="slab slab-middle"><span>repair</span></div><div className="slab slab-bottom"><span>explore</span></div></div>
          <span className="art-caption">FIG. 01 — KNOWLEDGE, BUILT IN LAYERS</span>
          <div className="art-note"><ShieldCheck size={18}/><span>From finding<br/><strong>to understanding.</strong></span></div>
        </div>
      </section>
      <div className="principles"><span>Evidence pipeline</span><span><GitBranch size={16}/> Map</span><span>↗ Explain</span><span><ShieldCheck size={16}/> Verify</span><span>↗ Transfer</span></div>
      <section className="proof-section" aria-labelledby="proof-heading">
        <div><p className="eyebrow">REPRODUCIBLE SECURITY BENCHMARK</p><h2 id="proof-heading">A score with<br/><em>a denominator.</em></h2><p>The built-in AST and heuristic scanner was rerun against ten labeled fixtures covering IDOR, secrets, XSS, dependencies, and CORS.</p></div>
        <div className="proof-metrics">
          <article><Gauge size={22}/><strong>100%</strong><span>Precision</span><small>5 detected vulnerabilities, 0 false alarms</small></article>
          <article><Target size={22}/><strong>100%</strong><span>Recall</span><small>5 of 5 vulnerable fixtures detected</small></article>
          <article><TestTube2 size={22}/><strong>10/10</strong><span>Accuracy</span><small>Scope: labeled scanner fixtures, not Gemini answers</small></article>
        </div>
      </section>
      <section className="memory-section" aria-labelledby="memory-heading">
        <div className="memory-intro"><p className="eyebrow">A MENTOR THAT LEARNS HOW YOU LEARN</p><h2 id="memory-heading">Every question becomes<br/><em>part of your progress.</em></h2><p>ProofForge remembers your goal, the concepts you have explored, and the explanations that helped—separately for every signed-in user and project.</p></div>
        <div className="memory-cards">
          <article><Brain size={22}/><span>01 / REMEMBER</span><h3>Project-aware memory</h3><p>Your learning goal, recent discussion, and concept trail stay connected to the repository you are studying.</p></article>
          <article><MessageCircle size={22}/><span>02 / TEACH</span><h3>A friendly AI mentor</h3><p>Ask “how,” “why,” or “what next.” Get plain-language teaching, a concrete example, and a check-for-understanding.</p></article>
          <article><Target size={22}/><span>03 / GROW</span><h3>Guidance that adapts</h3><p>Choose a guided, concise, or deep-dive teaching style. The mentor builds on topics you have already visited.</p></article>
        </div>
      </section>
      <section id="approach" className="approach-section">
        <div className="section-heading"><p className="eyebrow">THE PRACTICE OF BETTER ENGINEERING</p><h2>Don’t just get an answer.<br/><em>Get the understanding.</em></h2><p>A thoughtful workspace for the journey from unfamiliar code to independent problem solving.</p></div>
        <div className="chapter-grid">{chapters.map(([number, title, description, art]) => <article key={number} className="chapter">
          <div className={`chapter-art art-${art}`} aria-hidden="true">{art === 'map' ? <><i/><i/><i/><i/><div className="map-line"/></> : art === 'repair' ? <div className="paper-code"><span>− trust the input</span><strong>+ check the boundary</strong><span>+ protect the resource</span><b>Small change. Clear intent.</b></div> : <div className="transfer-rings"><i/><i/><i/><span>↗</span></div>}</div>
          <p className="chapter-number">{number} / {art === 'map' ? 'EXPLORE' : art === 'repair' ? 'REPAIR' : 'TRANSFER'}</p><h3>{title}</h3><p>{description}</p>
        </article>)}</div>
      </section>
      <section id="architecture" className="inside-section"><div><p className="eyebrow">STRUCTURE WITH SUBSTANCE</p><h2>Beautiful on the surface.<br/><em>Grounded underneath.</em></h2><p>Repository analysis, security auditing, guided repair, and independent challenges share one workspace. Inspect the architecture in an optional interactive 3D view.</p><button className="ink-button" onClick={() => setShow3D(v => !v)} aria-expanded={show3D} aria-controls="architecture-view">{show3D ? <X size={16}/> : <Play size={16}/>} {show3D ? 'Close 3D view' : 'Explore in 3D'}</button></div><div className="architecture-print" aria-hidden="true"><div/><div/><div/><span>CODE → REASON → REPAIR → VERIFY</span></div></section>
      {show3D && <section id="architecture-view" className="architecture-view"><p className="eyebrow">ILLUSTRATIVE PLATFORM ARCHITECTURE · NOT LIVE REPOSITORY DATA</p><Suspense fallback={<p role="status">Loading interactive architecture…</p>}><Architecture/></Suspense></section>}
      <section className="closing-section"><p className="eyebrow">PROOF BEFORE CONFIDENCE</p><h2>Every fix needs evidence.</h2><Link className="ink-button" to="/prototype">Open judge prototype <ArrowUpRight size={18}/></Link></section>
    </main>
    <footer className="editorial-footer"><Link className="wordmark" to="/">proofforge</Link><span>Evidence-first engineering for AI-built software.</span><span>INFINEX 2K26</span></footer>
  </div>;
};
export default LandingPage;
