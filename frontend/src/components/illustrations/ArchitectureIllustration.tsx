import React from 'react';

export const ArchitectureIllustration: React.FC<{ className?: string }> = ({ className = 'w-full max-w-xl' }) => {
  return (
    <svg 
      className={className} 
      viewBox="0 0 640 320" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      aria-label="ProofForge Software Architecture Diagram"
      role="img"
    >
      <defs>
        <linearGradient id="layerGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#eef2ea" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id="blueGlow" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.3" />
        </linearGradient>
        <filter id="subtleShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#000000" floodOpacity="0.6" />
        </filter>
      </defs>

      {/* Grid Background */}
      <g opacity="0.15">
        <line x1="40" y1="40" x2="600" y2="40" stroke="#53665b" strokeWidth="0.5" strokeDasharray="4 4" />
        <line x1="40" y1="120" x2="600" y2="120" stroke="#53665b" strokeWidth="0.5" strokeDasharray="4 4" />
        <line x1="40" y1="200" x2="600" y2="200" stroke="#53665b" strokeWidth="0.5" strokeDasharray="4 4" />
        <line x1="40" y1="280" x2="600" y2="280" stroke="#53665b" strokeWidth="0.5" strokeDasharray="4 4" />
        <line x1="160" y1="20" x2="160" y2="300" stroke="#53665b" strokeWidth="0.5" strokeDasharray="4 4" />
        <line x1="320" y1="20" x2="320" y2="300" stroke="#53665b" strokeWidth="0.5" strokeDasharray="4 4" />
        <line x1="480" y1="20" x2="480" y2="300" stroke="#53665b" strokeWidth="0.5" strokeDasharray="4 4" />
      </g>

      {/* Layer 1: Ingestion & Codebase AST */}
      <g filter="url(#subtleShadow)">
        <rect x="50" y="70" width="160" height="180" rx="12" fill="url(#layerGrad1)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        <rect x="66" y="86" width="32" height="32" rx="8" fill="#3B82F6" fillOpacity="0.15" stroke="#3B82F6" strokeWidth="1" />
        <path d="M78 96L84 102L90 96" stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <text x="66" y="142" fill="#20352f" fontSize="13" fontWeight="600" fontFamily="sans-serif">Ingestion & AST</text>
        <text x="66" y="162" fill="#53665b" fontSize="11" fontFamily="sans-serif">Repo Tokenization</text>
        <text x="66" y="178" fill="#53665b" fontSize="11" fontFamily="sans-serif">Route & Call Graph</text>
        <text x="66" y="194" fill="#53665b" fontSize="11" fontFamily="sans-serif">Secret Redaction</text>
        <rect x="66" y="214" width="70" height="18" rx="4" fill="#10B981" fillOpacity="0.15" stroke="#10B981" strokeWidth="0.5" />
        <text x="73" y="227" fill="#34D399" fontSize="9" fontWeight="600" fontFamily="monospace">DETERMINISTIC</text>
      </g>

      {/* Connection 1 -> 2 */}
      <path d="M210 160 L240 160" stroke="url(#blueGlow)" strokeWidth="2" strokeDasharray="2 2" />
      <circle cx="225" cy="160" r="3" fill="#3B82F6" />

      {/* Layer 2: Security & Analysis Core */}
      <g filter="url(#subtleShadow)">
        <rect x="240" y="50" width="160" height="220" rx="12" fill="url(#layerGrad1)" stroke="rgba(59,130,246,0.3)" strokeWidth="1" />
        <rect x="256" y="66" width="32" height="32" rx="8" fill="#397b67" fillOpacity="0.15" stroke="#397b67" strokeWidth="1" />
        <path d="M266 82L272 76L278 82M272 76V90" stroke="#397b67" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <text x="256" y="122" fill="#20352f" fontSize="13" fontWeight="600" fontFamily="sans-serif">Intelligence Core</text>
        <text x="256" y="142" fill="#53665b" fontSize="11" fontFamily="sans-serif">Semgrep + Gitleaks</text>
        <text x="256" y="158" fill="#53665b" fontSize="11" fontFamily="sans-serif">OSV Dependency CVE</text>
        <text x="256" y="174" fill="#53665b" fontSize="11" fontFamily="sans-serif">AI Socratic Mentor</text>
        <text x="256" y="190" fill="#53665b" fontSize="11" fontFamily="sans-serif">CWE Classification</text>
        <rect x="256" y="234" width="76" height="18" rx="4" fill="#397b67" fillOpacity="0.15" stroke="#397b67" strokeWidth="0.5" />
        <text x="263" y="247" fill="#397b67" fontSize="9" fontWeight="600" fontFamily="monospace">MULTI-ENGINE</text>
      </g>

      {/* Connection 2 -> 3 */}
      <path d="M400 160 L430 160" stroke="url(#blueGlow)" strokeWidth="2" strokeDasharray="2 2" />
      <circle cx="415" cy="160" r="3" fill="#3B82F6" />

      {/* Layer 3: Hardened Docker Sandbox */}
      <g filter="url(#subtleShadow)">
        <rect x="430" y="70" width="160" height="180" rx="12" fill="url(#layerGrad1)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        <rect x="446" y="86" width="32" height="32" rx="8" fill="#10B981" fillOpacity="0.15" stroke="#10B981" strokeWidth="1" />
        <path d="M456 102L460 106L468 98" stroke="#34D399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <text x="446" y="142" fill="#20352f" fontSize="13" fontWeight="600" fontFamily="sans-serif">Docker Sandbox</text>
        <text x="446" y="162" fill="#53665b" fontSize="11" fontFamily="sans-serif">--network none</text>
        <text x="446" y="178" fill="#53665b" fontSize="11" fontFamily="sans-serif">--cap-drop ALL</text>
        <text x="446" y="194" fill="#53665b" fontSize="11" fontFamily="sans-serif">Read-Only Filesystem</text>
        <rect x="446" y="214" width="84" height="18" rx="4" fill="#10B981" fillOpacity="0.15" stroke="#10B981" strokeWidth="0.5" />
        <text x="453" y="227" fill="#34D399" fontSize="9" fontWeight="600" fontFamily="monospace">FAIL-CLOSED GATE</text>
      </g>
    </svg>
  );
};
