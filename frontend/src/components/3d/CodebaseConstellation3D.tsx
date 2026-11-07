import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { useNavigate } from 'react-router-dom';
import { 
  Boxes, 
  RotateCcw, 
  Eye, 
  ExternalLink, 
  ShieldAlert, 
  Layers, 
  Sparkles,
  Maximize2
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

export interface ConstellationNode {
  id: string;
  name: string;
  type: 'hub' | 'component' | 'route' | 'finding' | 'dependency';
  filePath?: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  details?: string;
  connections: string[];
  x?: number;
  y?: number;
  z?: number;
}

interface CodebaseConstellationProps {
  projectId: number;
  repoName: string;
  components?: string[];
  routes?: string[];
  findings?: Array<{ id: number; title: string; file_path: string; severity: string }>;
  dependencies?: string[];
  className?: string;
}

export const CodebaseConstellation: React.FC<CodebaseConstellationProps> = ({
  projectId,
  repoName,
  components = [],
  routes = [],
  findings = [],
  dependencies = [],
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');
  const [hoveredNode, setHoveredNode] = useState<ConstellationNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<ConstellationNode | null>(null);
  const [webglSupported, setWebglSupported] = useState<boolean>(true);
  const navigate = useNavigate();

  // 1. Build Graph Nodes & Edges from Actual Source Data
  const graphData = useMemo(() => {
    const nodes: ConstellationNode[] = [];
    const edges: Array<{ source: string; target: string; color: number }> = [];

    // Central Repository Hub
    nodes.push({
      id: 'hub_root',
      name: repoName || 'Repository Core',
      type: 'hub',
      details: 'Root Architecture Nexus',
      connections: [],
      x: 0,
      y: 0,
      z: 0
    });

    // Components (Orbit 1)
    const compRadius = 45;
    components.slice(0, 14).forEach((comp, idx) => {
      const angle = (idx / Math.min(components.length, 14)) * Math.PI * 2;
      const id = `comp_${idx}`;
      nodes.push({
        id,
        name: comp,
        type: 'component',
        filePath: comp.includes('.') ? comp : `src/${comp}`,
        details: 'React Architecture Component',
        connections: ['hub_root'],
        x: Math.cos(angle) * compRadius,
        y: (Math.sin(angle * 2) * 12),
        z: Math.sin(angle) * compRadius
      });
      edges.push({ source: 'hub_root', target: id, color: 0x45DCE6 });
    });

    // Routes / Endpoints (Orbit 2)
    const routeRadius = 75;
    routes.slice(0, 10).forEach((route, idx) => {
      const angle = (idx / Math.min(routes.length, 10)) * Math.PI * 2 + 0.3;
      const id = `route_${idx}`;
      nodes.push({
        id,
        name: route,
        type: 'route',
        filePath: route,
        details: 'API / Application Endpoint',
        connections: ['hub_root'],
        x: Math.cos(angle) * routeRadius,
        y: -(Math.cos(angle * 2) * 15),
        z: Math.sin(angle) * routeRadius
      });
      edges.push({ source: 'hub_root', target: id, color: 0xF4AC54 });
    });

    // Security Findings (Placed near corresponding component or outer orbit)
    findings.slice(0, 10).forEach((f, idx) => {
      const angle = (idx / Math.min(findings.length, 10)) * Math.PI * 2 + 0.8;
      const findingRadius = 60 + (idx % 3) * 15;
      const id = `finding_${f.id}`;
      nodes.push({
        id,
        name: f.title,
        type: 'finding',
        filePath: f.file_path,
        severity: f.severity as any,
        details: `CWE Security Advisory (${f.severity})`,
        connections: ['hub_root'],
        x: Math.cos(angle) * findingRadius,
        y: 25 - (idx * 5),
        z: Math.sin(angle) * findingRadius
      });
      edges.push({ source: 'hub_root', target: id, color: f.severity === 'critical' ? 0xF36F79 : 0xF4AC54 });
    });

    return { nodes, edges };
  }, [repoName, components, routes, findings]);

  // 2. Three.js WebGL Scene Initialization & Lifecycle
  useEffect(() => {
    if (viewMode !== '3d' || !containerRef.current) return;

    // Detect WebGL capability
    try {
      const testCanvas = document.createElement('canvas');
      if (!window.WebGLRenderingContext || (!testCanvas.getContext('webgl') && !testCanvas.getContext('experimental-webgl'))) {
        setWebglSupported(false);
        setViewMode('2d');
        return;
      }
    } catch {
      setWebglSupported(false);
      setViewMode('2d');
      return;
    }

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight || 420;

    // Scene & Camera
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xf7f8f3, 0.0035);

    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
    camera.position.set(0, 60, 160);

    // Renderer (Hardened for 8GB RAM / Integrated GPU)
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: 'low-power'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Ambient & Directional Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x45DCE6, 2, 300);
    pointLight.position.set(0, 20, 0);
    scene.add(pointLight);

    // Particle Background Field (Subtle starfield / circuit points)
    const particleCount = 120;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 350;
      particlePositions[i + 1] = (Math.random() - 0.5) * 200;
      particlePositions[i + 2] = (Math.random() - 0.5) * 350;
    }
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: 0x32425C,
      size: 1.5,
      transparent: true,
      opacity: 0.6
    });
    const particleField = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particleField);

    // Node Meshes & Raycast Map
    const nodeMeshMap = new Map<THREE.Mesh, ConstellationNode>();
    const nodeSpheres: THREE.Mesh[] = [];

    // Shared Geometries
    const hubGeo = new THREE.SphereGeometry(6, 16, 16);
    const compGeo = new THREE.SphereGeometry(3.2, 14, 14);
    const routeGeo = new THREE.SphereGeometry(2.8, 12, 12);
    const findingGeo = new THREE.OctahedronGeometry(3.5, 0);

    graphData.nodes.forEach(node => {
      let geo: THREE.BufferGeometry = compGeo;
      let matColor = 0x45DCE6;
      let emissiveColor = 0x114455;

      if (node.type === 'hub') {
        geo = hubGeo;
        matColor = 0x45DCE6;
        emissiveColor = 0x008899;
      } else if (node.type === 'route') {
        geo = routeGeo;
        matColor = 0xF4AC54;
        emissiveColor = 0x884400;
      } else if (node.type === 'finding') {
        geo = findingGeo;
        matColor = node.severity === 'critical' ? 0xF36F79 : 0xF4AC54;
        emissiveColor = node.severity === 'critical' ? 0x991122 : 0x884400;
      }

      const mat = new THREE.MeshStandardMaterial({
        color: matColor,
        emissive: emissiveColor,
        emissiveIntensity: 0.5,
        roughness: 0.3,
        metalness: 0.7
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(node.x || 0, node.y || 0, node.z || 0);
      scene.add(mesh);

      nodeMeshMap.set(mesh, node);
      nodeSpheres.push(mesh);
    });

    // Edges (Connected Lines)
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x223046,
      transparent: true,
      opacity: 0.4
    });

    const nodePosMap = new Map<string, THREE.Vector3>();
    graphData.nodes.forEach(n => nodePosMap.set(n.id, new THREE.Vector3(n.x, n.y, n.z)));

    graphData.edges.forEach(edge => {
      const srcPos = nodePosMap.get(edge.source);
      const tgtPos = nodePosMap.get(edge.target);
      if (srcPos && tgtPos) {
        const edgeGeo = new THREE.BufferGeometry().setFromPoints([srcPos, tgtPos]);
        const customLineMat = lineMat.clone();
        customLineMat.color.setHex(edge.color);
        customLineMat.opacity = 0.25;
        const line = new THREE.Line(edgeGeo, customLineMat);
        scene.add(line);
      }
    });

    // Interactive Raycasting & Pointer Tracking
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-999, -999);
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let targetRotationY = 0;
    let targetRotationX = 0;

    const onPointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (isDragging) {
        const deltaX = e.clientX - prevMouseX;
        const deltaY = e.clientY - prevMouseY;
        targetRotationY += deltaX * 0.005;
        targetRotationX += deltaY * 0.005;
        targetRotationX = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, targetRotationX));
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
      }
    };

    const onPointerDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.position.z = Math.max(70, Math.min(260, camera.position.z + e.deltaY * 0.12));
    };

    const onClick = () => {
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodeSpheres);
      if (intersects.length > 0) {
        const clicked = nodeMeshMap.get(intersects[0].object as THREE.Mesh);
        if (clicked) {
          setSelectedNode(clicked);
        }
      }
    };

    container.addEventListener('mousemove', onPointerMove);
    container.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mouseup', onPointerUp);
    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('click', onClick);

    // Animation Loop with Visibility Optimization
    let animationFrameId: number;
    let isVisible = true;

    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
    }, { threshold: 0.1 });
    observer.observe(container);

    const onVisibilityChange = () => {
      isVisible = !document.hidden;
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (!isVisible) return;

      // Gentle auto-rotation when not dragging
      if (!isDragging) {
        targetRotationY += 0.0018;
      }

      scene.rotation.y += (targetRotationY - scene.rotation.y) * 0.05;
      scene.rotation.x += (targetRotationX - scene.rotation.x) * 0.05;
      particleField.rotation.y -= 0.0004;

      // Raycast hover check
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodeSpheres);
      if (intersects.length > 0) {
        const found = nodeMeshMap.get(intersects[0].object as THREE.Mesh);
        setHoveredNode(found || null);
        container.style.cursor = 'pointer';
      } else {
        setHoveredNode(null);
        container.style.cursor = isDragging ? 'grabbing' : 'grab';
      }

      renderer.render(scene, camera);
    };

    animate();

    // Clean Resizing
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight || 420;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup WebGL Resources
    return () => {
      cancelAnimationFrame(animationFrameId);
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mouseup', onPointerUp);
      container.removeEventListener('mousemove', onPointerMove);
      container.removeEventListener('mousedown', onPointerDown);
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('click', onClick);

      // Dispose geometries & materials
      hubGeo.dispose();
      compGeo.dispose();
      routeGeo.dispose();
      findingGeo.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      lineMat.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [viewMode, graphData]);

  const activeFocusNode = selectedNode || hoveredNode;

  return (
    <div className={`terminal-panel-elevated p-5 relative overflow-hidden ${className}`}>
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-graphite-700/80">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
            <Boxes className="w-4 h-4 text-cyan-700" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-text-primary tracking-wide">
                Codebase Constellation
              </h2>
              <Badge variant="cyan" size="xs">Spatial Intelligence</Badge>
            </div>
            <p className="text-[11px] font-mono text-text-muted">
              Interactive 3D architectural graph derived from physical source code AST
            </p>
          </div>
        </div>

        {/* View Controls */}
        <div className="flex items-center space-x-2">
          <div className="flex bg-graphite-950 p-0.5 rounded-lg border border-graphite-700">
            <button
              onClick={() => setViewMode('3d')}
              className={`px-2.5 py-1 text-xs font-mono rounded-md transition-colors ${
                viewMode === '3d' 
                  ? 'bg-cyan-500/20 text-cyan-700 font-bold border border-cyan-500/40'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              3D Spatial
            </button>
            <button
              onClick={() => setViewMode('2d')}
              className={`px-2.5 py-1 text-xs font-mono rounded-md transition-colors ${
                viewMode === '2d' 
                  ? 'bg-cyan-500/20 text-cyan-700 font-bold border border-cyan-500/40'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              2D Matrix
            </button>
          </div>

          <button
            onClick={() => {
              setSelectedNode(null);
              setHoveredNode(null);
            }}
            title="Reset focus"
            className="p-1.5 rounded-lg bg-graphite-850 hover:bg-graphite-750 border border-graphite-700 text-text-muted hover:text-text-primary transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div className="relative h-[380px] w-full rounded-xl bg-graphite-950/80 border border-graphite-800 overflow-hidden">
        {viewMode === '3d' ? (
          <div ref={containerRef} className="w-full h-full" />
        ) : (
          /* 2D Matrix Fallback */
          <div className="w-full h-full p-6 overflow-y-auto space-y-4">
            <div className="text-xs font-mono text-text-muted uppercase tracking-wider mb-2">
              Architecture Nodes by Layer
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Components */}
              <div className="bg-graphite-900/90 border border-graphite-800 rounded-xl p-4">
                <div className="flex items-center space-x-2 text-cyan-700 text-xs font-mono font-bold mb-3">
                  <Layers className="w-4 h-4" />
                  <span>COMPONENTS ({components.length})</span>
                </div>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {components.map((c, i) => (
                    <div 
                      key={i} 
                      onClick={() => setSelectedNode({
                        id: `c_${i}`,
                        name: c,
                        type: 'component',
                        filePath: c.includes('.') ? c : `src/${c}`,
                        connections: []
                      })}
                      className="p-2 rounded-lg bg-graphite-850 hover:bg-cyan-500/10 border border-graphite-750 hover:border-cyan-500/30 text-xs font-mono text-text-primary cursor-pointer transition flex items-center justify-between"
                    >
                      <span className="truncate">{c}</span>
                      <ExternalLink className="w-3 h-3 text-cyan-700 shrink-0 ml-2" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Endpoints */}
              <div className="bg-graphite-900/90 border border-graphite-800 rounded-xl p-4">
                <div className="flex items-center space-x-2 text-amber-700 text-xs font-mono font-bold mb-3">
                  <Sparkles className="w-4 h-4" />
                  <span>ROUTES ({routes.length})</span>
                </div>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {routes.map((r, i) => (
                    <div 
                      key={i} 
                      className="p-2 rounded-lg bg-graphite-850 border border-graphite-700/60 text-xs font-mono text-text-primary"
                    >
                      <span className="truncate">{r}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Findings */}
              <div className="bg-graphite-900/90 border border-graphite-800 rounded-xl p-4">
                <div className="flex items-center space-x-2 text-rose-700 text-xs font-mono font-bold mb-3">
                  <ShieldAlert className="w-4 h-4" />
                  <span>SECURITY FINDINGS ({findings.length})</span>
                </div>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {findings.map((f, i) => (
                    <div 
                      key={i} 
                      onClick={() => setSelectedNode({
                        id: `f_${f.id}`,
                        name: f.title,
                        type: 'finding',
                        filePath: f.file_path,
                        severity: f.severity as any,
                        details: `Security Advisory`,
                        connections: []
                      })}
                      className="p-2 rounded-lg bg-rose-100/20 hover:bg-rose-100/40 border border-rose-500/20 hover:border-rose-500/40 text-xs font-mono cursor-pointer transition"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-rose-700 font-bold truncate">{f.title}</span>
                        <Badge variant="critical" size="xs">{f.severity}</Badge>
                      </div>
                      <div className="text-[10px] text-text-muted truncate mt-1">{f.file_path}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* HUD Node Inspector Drawer (Bottom Overlay) */}
        {activeFocusNode && (
          <div className="absolute bottom-3 left-3 right-3 p-3.5 bg-graphite-900/95 backdrop-blur-md border border-cyan-500/40 rounded-xl shadow-elevated flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center space-x-3 min-w-0">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                activeFocusNode.type === 'finding' 
                  ? 'bg-rose-500/10 border-rose-500/40 text-rose-700'
                  : activeFocusNode.type === 'route'
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-700'
                  : 'bg-cyan-500/10 border-cyan-500/40 text-cyan-700'
              }`}>
                {activeFocusNode.type === 'finding' ? (
                  <ShieldAlert className="w-4 h-4" />
                ) : (
                  <Boxes className="w-4 h-4" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono uppercase text-text-muted">
                    [{activeFocusNode.type}]
                  </span>
                  <h4 className="text-sm font-bold text-text-primary truncate">
                    {activeFocusNode.name}
                  </h4>
                  {activeFocusNode.severity && (
                    <Badge variant="critical" size="xs">{activeFocusNode.severity}</Badge>
                  )}
                </div>
                {activeFocusNode.filePath && (
                  <p className="text-[11px] font-mono text-cyan-700/90 truncate">
                    {activeFocusNode.filePath}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              {activeFocusNode.filePath && (
                <Button
                  size="sm"
                  variant="primary"
                  icon={ExternalLink}
                  onClick={() => navigate(`/projects/${projectId}/explorer?file=${encodeURIComponent(activeFocusNode.filePath || '')}`)}
                >
                  Open in Explorer
                </Button>
              )}
              <button
                onClick={() => {
                  setSelectedNode(null);
                  setHoveredNode(null);
                }}
                className="px-2.5 py-1 text-xs font-mono text-text-muted hover:text-text-primary"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Legend / Status Pill (Top-Right) */}
        <div className="absolute top-3 right-3 px-3 py-1.5 bg-graphite-900/90 backdrop-blur-sm border border-graphite-700/80 rounded-lg text-[11px] font-mono flex items-center space-x-3 text-text-secondary">
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
            <span>Component</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            <span>Route</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
            <span>Finding</span>
          </span>
        </div>
      </div>
    </div>
  );
};
