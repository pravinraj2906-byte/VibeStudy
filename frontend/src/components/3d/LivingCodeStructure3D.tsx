import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { 
  ShieldCheck, 
  RotateCcw, 
  Layers, 
  Cpu, 
  Lock, 
  Database,
  Terminal,
  Activity
} from 'lucide-react';
import { ArchitectureIllustration } from '../illustrations/ArchitectureIllustration';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface LayerData {
  id: string;
  name: string;
  category: string;
  description: string;
  securityRole: string;
  color: number;
  hexColor: string;
  yPos: number;
  icon: typeof ShieldCheck;
  metrics: string;
}

const ARCH_LAYERS: LayerData[] = [
  {
    id: 'client',
    name: 'Presentation & Interface',
    category: 'Client Layer',
    description: 'React 18 SPA with strict Content Security Policy, zero external unvetted CDN runtime dependencies, and token-refresh resilience.',
    securityRole: 'XSS mitigation, CSRF guard tokens, client-side route sanitization',
    color: 0x3b82f6,
    hexColor: '#3B82F6',
    yPos: 3.2,
    icon: Terminal,
    metrics: 'Vite • React 18 • TypeScript'
  },
  {
    id: 'gateway',
    name: 'Authentication & API Gateway',
    category: 'Ingress & Perimeter',
    description: 'FastAPI gateway enforcing dual JWT & Firebase verification, rate-limiting, and strict schema validation.',
    securityRole: 'JWT / Firebase Token validation, OAuth claims verification, CORS perimeter',
    color: 0x60a5fa,
    hexColor: '#60A5FA',
    yPos: 1.6,
    icon: Lock,
    metrics: 'Dual Auth • Rate Limiting • Ingress Validation'
  },
  {
    id: 'analysis',
    name: 'Static Security Intelligence',
    category: 'Analysis Pipeline',
    description: 'Multi-scanner orchestration running Semgrep SAST, Gitleaks secrets detection, OSV dependency audits, and Python AST parsing.',
    securityRole: 'Deep static vulnerability scanning, deterministic rule mapping, secret leak prevention',
    color: 0x397b67,
    hexColor: '#397b67',
    yPos: 0.0,
    icon: Activity,
    metrics: 'Semgrep • Gitleaks • OSV • AST'
  },
  {
    id: 'sandbox',
    name: 'Hardened Execution Sandbox',
    category: 'Dynamic Verification',
    description: 'Fail-closed Docker execution environment with read-only rootfs, dropped Linux capabilities, no host network, and memory/CPU limits.',
    securityRole: 'Non-root execution, seccomp profiles, zero host fallback for untrusted code',
    color: 0x10b981,
    hexColor: '#10B981',
    yPos: -1.6,
    icon: Cpu,
    metrics: 'Docker • Isolated Net • Dropped Capabilities'
  },
  {
    id: 'persistence',
    name: 'Zero-Leak Data Foundation',
    category: 'Storage Tier',
    description: 'Neon Serverless PostgreSQL with user-scoped data segregation, parameterized queries, and encrypted connection pooling.',
    securityRole: 'Tenant isolation, encrypted transit (SSL), automated migration idempotency',
    color: 0xf59e0b,
    hexColor: '#F59E0B',
    yPos: -3.2,
    icon: Database,
    metrics: 'Neon Postgres • SQLAlchemy • Alembic'
  }
];

export const LivingCodeStructure3D: React.FC<{ className?: string }> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [webglSupported, setWebglSupported] = useState<boolean>(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [activeLayer, setActiveLayer] = useState<LayerData>(ARCH_LAYERS[2]);
  const [isRotating, setIsRotating] = useState<boolean>(true);
  const [hoveredLayerId, setHoveredLayerId] = useState<string | null>(null);

  const interactionRef = useRef({ activeLayerId: activeLayer.id, hoveredLayerId, isRotating });
  interactionRef.current = { activeLayerId: activeLayer.id, hoveredLayerId, isRotating };
  useEffect(() => {
    if (!webglSupported) return;
    // 1. WebGL Support Test
    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
    if (!gl) {
      setWebglSupported(false);
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    // Check user preference for motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setIsRotating(false);
    }

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 450;

    // 2. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xf7f8f3, 0.04);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(9, 4, 11);

    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'low-power'
    }); } catch { setWebglSupported(false); return; }
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    const onContextLost = (event: Event) => { event.preventDefault(); setWebglSupported(false); };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    container.appendChild(renderer.domElement);

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x3b82f6, 1.8);
    keyLight.position.set(10, 15, 10);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x397b67, 1.2);
    fillLight.position.set(-10, -5, -10);
    scene.add(fillLight);

    // 4. Object Group for Architecture
    const structureGroup = new THREE.Group();
    scene.add(structureGroup);

    // Create architectural tier slabs and wireframe grids
    const layerMeshes: { id: string; mesh: THREE.Mesh; ring: THREE.LineSegments }[] = [];
    const raycastTargets: THREE.Object3D[] = [];

    ARCH_LAYERS.forEach((layer) => {
      // Base plate
      const plateGeo = new THREE.BoxGeometry(5.2, 0.18, 5.2);
      const plateMat = new THREE.MeshStandardMaterial({
        color: layer.color,
        roughness: 0.25,
        metalness: 0.8,
        transparent: true,
        opacity: 0.75
      });
      const plateMesh = new THREE.Mesh(plateGeo, plateMat);
      plateMesh.position.y = layer.yPos;
      plateMesh.userData = { layerId: layer.id };

      // Edges highlight
      const edgesGeo = new THREE.EdgesGeometry(plateGeo);
      const edgesMat = new THREE.LineBasicMaterial({
        color: layer.color,
        transparent: true,
        opacity: 0.9,
        linewidth: 1
      });
      const edges = new THREE.LineSegments(edgesGeo, edgesMat);
      plateMesh.add(edges);

      // Core pillar block representing active processing
      const coreGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.6, 6);
      const coreMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.1,
        metalness: 0.9,
        wireframe: true
      });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      coreMesh.position.y = 0.35;
      plateMesh.add(coreMesh);

      structureGroup.add(plateMesh);
      layerMeshes.push({ id: layer.id, mesh: plateMesh, ring: edges });
      raycastTargets.push(plateMesh);
    });

    // Vertical data transmission pathways (columns between tiers)
    const columnGeo = new THREE.CylinderGeometry(0.04, 0.04, 7.5, 8);
    const columnMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.9,
      roughness: 0.2,
      transparent: true,
      opacity: 0.6
    });

    const colPositions = [
      [-2.4, 0, -2.4],
      [2.4, 0, -2.4],
      [-2.4, 0, 2.4],
      [2.4, 0, 2.4]
    ];

    colPositions.forEach(([cx, cy, cz]) => {
      const colMesh = new THREE.Mesh(columnGeo, columnMat);
      colMesh.position.set(cx, cy, cz);
      structureGroup.add(colMesh);
    });

    // Floating particle field representing continuous data flow
    const particleCount = 140;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleVelocities: number[] = [];

    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 6;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 8;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 6;
      particleVelocities.push((Math.random() * 0.02) + 0.005);
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x60a5fa,
      size: 0.08,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    structureGroup.add(particleSystem);

    // 5. Interaction Setup (Raycasting & Mouse Parallax)
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-999, -999);
    let targetRotationY = 0;
    let targetRotationX = 0;

    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      mouse.x = x;
      mouse.y = y;

      targetRotationY = x * 0.45;
      targetRotationX = -y * 0.25;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(raycastTargets, false);

      if (intersects.length > 0) {
        const hitLayerId = intersects[0].object.userData.layerId;
        setHoveredLayerId(hitLayerId);
        container.style.cursor = 'pointer';
      } else {
        setHoveredLayerId(null);
        container.style.cursor = 'default';
      }
    };

    const handleClick = () => {
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(raycastTargets, false);
      if (intersects.length > 0) {
        const hitLayerId = intersects[0].object.userData.layerId;
        const matched = ARCH_LAYERS.find(l => l.id === hitLayerId);
        if (matched) {
          setActiveLayer(matched);
        }
      }
    };

    container.addEventListener('mousemove', handlePointerMove);
    container.addEventListener('click', handleClick);

    // Handle Window Resize
    const handleResize = () => {
      if (!container) return;
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };

    window.addEventListener('resize', handleResize);

    // 6. Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (document.hidden) return;
      const elapsed = clock.getElapsedTime();

      // Slow idle rotation or mouse tilt
      if (interactionRef.current.isRotating && !prefersReducedMotion) {
        structureGroup.rotation.y += 0.0035;
      }

      // Smooth camera tilt towards target
      structureGroup.rotation.x += (targetRotationX - structureGroup.rotation.x) * 0.04;
      structureGroup.rotation.z += ((-targetRotationY * 0.3) - structureGroup.rotation.z) * 0.04;

      // Pulse active layer
      layerMeshes.forEach(({ id, mesh }) => {
        const isHovered = interactionRef.current.hoveredLayerId === id;
        const isSelected = interactionRef.current.activeLayerId === id;
        const targetScale = isSelected ? 1.08 : isHovered ? 1.04 : 1.0;
        mesh.scale.lerp(new THREE.Vector3(targetScale, 1.0, targetScale), 0.08);

        // Highlight active material
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (isSelected) {
          mat.opacity = 0.95;
          mat.emissive.setHex(0x1e3a8a);
        } else if (isHovered) {
          mat.opacity = 0.85;
          mat.emissive.setHex(0x0f172a);
        } else {
          mat.opacity = 0.7;
          mat.emissive.setHex(0x000000);
        }
      });

      // Animate particles upwards
      const positions = particleGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3 + 1] += particleVelocities[i];
        if (positions[i * 3 + 1] > 4.5) {
          positions[i * 3 + 1] = -4.5;
        }
      }
      particleGeo.attributes.position.needsUpdate = true;

      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', handlePointerMove);
      container.removeEventListener('click', handleClick);

      // Thorough cleanup
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments || obj instanceof THREE.Points) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material?.dispose();
          }
        }
      });
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.dispose();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [webglSupported]);

  if (!webglSupported) {
    return (
      <div className={`p-6 bg-canvas-elevated rounded-2xl border border-border-subtle ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <Badge variant="silver" size="sm">Static Hardware Fallback</Badge>
          <span className="text-xs text-text-muted">WebGL unavailable or disabled</span>
        </div>
        <ArchitectureIllustration />
      </div>
    );
  }

  const ActiveIcon = activeLayer.icon;

  return (
    <div className={`relative flex flex-col lg:flex-row items-stretch rounded-2xl bg-canvas-surface border border-border-subtle/80 overflow-hidden shadow-elevated ${className}`}>
      {/* 3D Canvas Viewport */}
      <div className="relative flex-1 min-h-[380px] lg:min-h-[460px] bg-canvas/60">
        <div ref={containerRef} className="w-full h-full min-h-[380px] lg:min-h-[460px]" />

        {/* Floating Controls Overlay */}
        <div className="absolute top-4 left-4 flex items-center space-x-2 z-10">
          <Badge variant="blue" size="sm">
            Interactive Architecture Core
          </Badge>
          <span className="text-[11px] font-mono text-text-muted/80 bg-canvas-elevated/80 px-2 py-0.5 rounded border border-border-subtle backdrop-blur-sm">
            Click layer to inspect
          </span>
        </div>

        <div className="absolute bottom-4 left-4 flex items-center space-x-2 z-10">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsRotating(!isRotating)}
            className="text-xs bg-canvas-elevated/70 backdrop-blur-md border border-border-subtle hover:bg-canvas-elevated text-text-secondary"
          >
            <RotateCcw className={`w-3.5 h-3.5 mr-1.5 ${isRotating ? 'animate-spin-slow' : ''}`} />
            {isRotating ? 'Pause Orbit' : 'Resume Orbit'}
          </Button>
        </div>

        {/* Tier Indicator Chips */}
        <div className="absolute top-4 right-4 flex flex-col space-y-1 z-10">
          {ARCH_LAYERS.map((layer) => (
            <button
              key={layer.id}
              onClick={() => setActiveLayer(layer)}
              className={`text-[11px] font-mono px-2 py-1 rounded transition-all flex items-center space-x-1.5 border text-left ${
                activeLayer.id === layer.id
                  ? 'bg-blue-500/20 border-blue-500/50 text-blue-700 font-semibold shadow-sm'
                  : 'bg-canvas-elevated/60 border-border-subtle/60 text-text-muted hover:text-text-primary hover:bg-canvas-elevated'
              }`}
            >
              <span 
                className="w-1.5 h-1.5 rounded-full" 
                style={{ backgroundColor: layer.hexColor }} 
              />
              <span>{layer.category}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Layer Detail HUD / Inspector */}
      <div className="w-full lg:w-80 p-6 bg-canvas-elevated/50 backdrop-blur-md border-t lg:border-t-0 lg:border-l border-border-subtle flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div 
              className="w-9 h-9 rounded-lg flex items-center justify-center border shadow-inner"
              style={{ 
                backgroundColor: `${activeLayer.hexColor}15`,
                borderColor: `${activeLayer.hexColor}40`,
                color: activeLayer.hexColor
              }}
            >
              <ActiveIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-text-muted">
                {activeLayer.category}
              </span>
              <h4 className="text-sm font-semibold text-text-primary tracking-tight">
                {activeLayer.name}
              </h4>
            </div>
          </div>

          <div className="p-3 bg-canvas/60 rounded-xl border border-border-subtle/80">
            <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider block mb-1">
              Architecture Description
            </span>
            <p className="text-xs text-text-secondary leading-relaxed">
              {activeLayer.description}
            </p>
          </div>

          <div className="p-3 bg-blue-500/5 rounded-xl border border-blue-500/20">
            <div className="flex items-center space-x-1.5 mb-1 text-blue-700">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="text-[10px] font-mono uppercase tracking-wider font-medium">
                Security Posture
              </span>
            </div>
            <p className="text-xs text-text-primary/90 font-mono">
              {activeLayer.securityRole}
            </p>
          </div>

          <div className="pt-1">
            <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider block mb-1.5">
              Technologies & Standards
            </span>
            <div className="flex flex-wrap gap-1.5">
              {activeLayer.metrics.split('•').map((tech, i) => (
                <Badge key={i} variant="silver" size="xs" className="font-mono text-[10px]">
                  {tech.trim()}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-4 mt-4 border-t border-border-subtle/60 flex items-center justify-between text-[11px] text-text-muted font-mono">
          <span className="flex items-center space-x-1">
            <Layers className="w-3 h-3 text-text-muted" />
            <span>Tier Depth: 5 Layers</span>
          </span>
          <span className="text-emerald-700">Illustrative architecture</span>
        </div>
      </div>
    </div>
  );
};
export default LivingCodeStructure3D;
