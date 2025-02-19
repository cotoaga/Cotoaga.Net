'use client';

import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// --- Simulation Constants ---
const REPULSION = 10;
const ATTRACTION = 0.03;
const DAMPING = 0.85;
const CENTER_GRAVITY = 0.008;
const ANNEAL_DURATION = 10; // seconds

// --- Data Interfaces ---
interface Node {
  id: string;
  label: string;
  color: string; // not used for text drawing now
  position: THREE.Vector3;
  velocity: THREE.Vector3;
}

interface Edge {
  from: string;
  to: string;
}

// --- Initial Data ---
// Nodes – Expanded to reflect your world, with a nod to your scorpion-Mars-Pluto-Athene branding
const initialNodes: Node[] = [
  // Core Frameworks & Mindsets
  { id: 'cynefin',    label: 'Cynefin',         color: '#2E2E2E', position: new THREE.Vector3(0, 0, 0), velocity: new THREE.Vector3() }, // Charcoal for complexity
  { id: 'safe',       label: 'SAFe',            color: '#8B0000', position: new THREE.Vector3(0, 0, 0), velocity: new THREE.Vector3() }, // Dark red for Mars energy
  { id: 'less',       label: 'LeSS',            color: '#548235', position: new THREE.Vector3(0, 0, 0), velocity: new THREE.Vector3() }, // Green for lean roots
  { id: 'agile',      label: 'Agile',           color: '#C0C0C0', position: new THREE.Vector3(0, 0, 0), velocity: new THREE.Vector3() }, // Silver for tech sheen
  { id: 'devops',     label: 'DevOps',          color: '#4682B4', position: new THREE.Vector3(0, 0, 0), velocity: new THREE.Vector3() }, // Steel blue for flow

  // Your Must-Haves: Management & Growth Domains
  { id: 'product',    label: 'Product Mgmt',    color: '#FFD700', position: new THREE.Vector3(0, 0, 0), velocity: new THREE.Vector3() }, // Gold for value creation
  { id: 'project',    label: 'Project Mgmt',    color: '#A9A9A9', position: new THREE.Vector3(0, 0, 0), velocity: new THREE.Vector3() }, // Dark silver for structure
  { id: 'program',    label: 'Program Mgmt',    color: '#A9A9A9', position: new THREE.Vector3(0, 0, 0), velocity: new THREE.Vector3() }, // Dark silver, tied to project
  { id: 'marketing',  label: 'Marketing',       color: '#FF4500', position: new THREE.Vector3(0, 0, 0), velocity: new THREE.Vector3() }, // Orange-red for visibility
  { id: 'bizdev',     label: 'Business Dev',    color: '#FF4500', position: new THREE.Vector3(0, 0, 0), velocity: new THREE.Vector3() }, // Orange-red, paired with marketing
  { id: 'partner',    label: 'Partner Mgmt',    color: '#DAA520', position: new THREE.Vector3(0, 0, 0), velocity: new THREE.Vector3() }, // Goldenrod for collaboration
  { id: 'interim',    label: 'Interim Mgmt',    color: '#483D8B', position: new THREE.Vector3(0, 0, 0), velocity: new THREE.Vector3() }, // Dark slate for adaptability

  // Your Secret Sauce: Complexity, Optimization, and Vision
  { id: 'complexity', label: 'Complexity',      color: '#2E2E2E', position: new THREE.Vector3(0, 0, 0), velocity: new THREE.Vector3() }, // Charcoal, tied to Cynefin
  { id: 'optimize',   label: 'Optimization',    color: '#FFD700', position: new THREE.Vector3(0, 0, 0), velocity: new THREE.Vector3() }, // Gold for your Maximizer soul
  { id: 'dao',        label: 'DAO',             color: '#800080', position: new THREE.Vector3(0, 0, 0), velocity: new THREE.Vector3() }, // Purple for futuristic edge
  { id: 'ai',         label: 'AI',              color: '#4682B4', position: new THREE.Vector3(0, 0, 0), velocity: new THREE.Vector3() }, // Steel blue, tied to DevOps
  { id: 'knowledge',  label: 'Knowledge Mgmt',  color: '#C0C0C0', position: new THREE.Vector3(0, 0, 0), velocity: new THREE.Vector3() }, // Silver for Pallas Athene wisdom
];

// Edges – including extra { from: 'devops', to: 'cynefin' } for a 3D layout.
// Edges – Connecting your universe in a 3D dance of brilliance
const edges: Edge[] = [
  // Frameworks to Agile Core
  { from: 'safe',      to: 'agile' },
  { from: 'less',      to: 'agile' },
  { from: 'cynefin',   to: 'agile' },
  { from: 'devops',    to: 'agile' },

  // DevOps as a Bridge
  { from: 'safe',      to: 'devops' },
  { from: 'less',      to: 'devops' },
  { from: 'devops',    to: 'cynefin' },  // Flow meets complexity
  { from: 'devops',    to: 'ai' },       // Tech synergy

  // Management Domains to Core Strengths
  { from: 'product',   to: 'agile' },
  { from: 'product',   to: 'optimize' }, // Product is about value
  { from: 'project',   to: 'agile' },
  { from: 'program',   to: 'agile' },
  { from: 'project',   to: 'program' },   // Natural hierarchy
  { from: 'marketing', to: 'bizdev' },    // Growth twins
  { from: 'marketing', to: 'product' },   // Market informs product
  { from: 'bizdev',    to: 'partner' },   // Partnerships fuel growth
  { from: 'partner',   to: 'dao' },       // DAO as collaboration hub
  { from: 'interim',   to: 'optimize' },  // Interim fixes inefficiencies
  { from: 'interim',   to: 'program' },   // Interim often scopes big

  // Your Secret Sauce Connections
  { from: 'cynefin',   to: 'complexity' }, // Duh
  { from: 'complexity', to: 'knowledge' }, // Complexity demands wisdom
  { from: 'optimize',  to: 'agile' },     // Optimization fuels agility
  { from: 'optimize',  to: 'dao' },       // DAO is optimized org design
  { from: 'ai',        to: 'dao' },       // AI powers DAO
  { from: 'ai',        to: 'knowledge' }, // AI amplifies learning
  { from: 'knowledge', to: 'agile' },     // Knowledge drives adaptability
];

/* --- Edge Component --- */
function EdgeComponent({ startNode, endNode }: { startNode: Node; endNode: Node }) {
  const ref = useRef<THREE.Line>(null);
  useFrame(() => {
    if (ref.current) {
      const positions = new Float32Array([
        startNode.position.x, startNode.position.y, startNode.position.z,
        endNode.position.x, endNode.position.y, endNode.position.z,
      ]);
      ref.current.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      ref.current.geometry.attributes.position.needsUpdate = true;
    }
  });
  return (
    <line ref={ref as any}>
      <bufferGeometry />
      <lineBasicMaterial
        color="#e7e7e7"
        transparent
        opacity={0.4}
        depthTest={false} // so lines do not block pointer events
      />
    </line>
  );
}

/* --- Helper: Create a CanvasTexture from label text --- */
const createLabelTexture = (label: string, textColor: string): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // No background fill: leave transparent.
    ctx.fillStyle = textColor;
    ctx.font = '60px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, canvas.width / 2, canvas.height / 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
};

/* --- NodeMesh Component (Label Sprite) --- */
interface NodeMeshProps {
  node: Node;
  status: 'initial' | 'selected' | 'unselected';
  onSelect: (node: Node) => void;
}

function NodeMesh({ node, status, onSelect }: NodeMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.copy(node.position);
    }
  });

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    console.log('Pointer down on node:', node.label, 'status:', status);
    onSelect(node);
  };

  // Determine text color based on status.
  const textColor =
    status === 'initial' ? 'black' : status === 'selected' ? '#2f6eba' : '#548235';

  // Recreate the texture whenever status or label changes.
  const labelTexture = useMemo(() => {
    return createLabelTexture(node.label, textColor);
  }, [node.label, textColor]);

  const spriteScale: [number, number, number] = status === 'selected' ? [6, 3, 3] : [4, 2, 2];

  return (
    <group ref={groupRef}>
      <sprite
        onPointerDown={handlePointerDown}
        scale={spriteScale}
        renderOrder={999}
        frustumCulled={false}
      >
        <spriteMaterial depthTest={false} transparent map={labelTexture} />
      </sprite>
    </group>
  );
}

/* --- Graph Component --- */
interface GraphProps {
  nodeStatus: Record<string, 'initial' | 'selected' | 'unselected'>;
  onSelect: (node: Node) => void;
}

function Graph({ nodeStatus, onSelect }: GraphProps) {
  const nodesRef = useRef<Node[]>(initialNodes);
  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime();
    if (elapsed > ANNEAL_DURATION) return;
    const annealFactor = 1 - elapsed / ANNEAL_DURATION;
    const nodes = nodesRef.current;
    nodes.forEach((node) => {
      const newPosition = node.position.clone();
      const newVelocity = new THREE.Vector3();
      nodes.forEach((otherNode) => {
        if (otherNode.id !== node.id) {
          let diff = newPosition.clone().sub(otherNode.position);
          let distance = diff.length();
          if (distance < 0.001) {
            diff = new THREE.Vector3(
              Math.random() - 0.5,
              Math.random() - 0.5,
              Math.random() - 0.5
            );
            distance = diff.length() || 0.001;
          }
          const force = REPULSION / (distance * distance);
          newVelocity.add(diff.normalize().multiplyScalar(force));
        }
      });
      edges.forEach((edge) => {
        if (edge.from === node.id || edge.to === node.id) {
          const otherId = edge.from === node.id ? edge.to : edge.from;
          const otherNode = nodes.find((n) => n.id === otherId);
          if (otherNode) {
            let diff = otherNode.position.clone().sub(newPosition);
            let distance = diff.length();
            if (distance < 0.001) {
              diff = new THREE.Vector3(
                Math.random() - 0.5,
                Math.random() - 0.5,
                Math.random() - 0.5
              );
              distance = diff.length() || 0.001;
            }
            newVelocity.add(diff.multiplyScalar(ATTRACTION));
          }
        }
      });
      newVelocity.sub(newPosition.clone().multiplyScalar(CENTER_GRAVITY));
      newVelocity.multiplyScalar(DAMPING * annealFactor);
      newPosition.add(newVelocity);
      node.position.copy(newPosition);
      node.velocity.copy(newVelocity);
    });
  });

  return (
    <group>
      {edges.map((edge, i) => {
        const startNode = nodesRef.current.find(n => n.id === edge.from);
        const endNode = nodesRef.current.find(n => n.id === edge.to);
        if (startNode && endNode) {
          return <EdgeComponent key={`edge-${i}`} startNode={startNode} endNode={endNode} />;
        }
        return null;
      })}
      {nodesRef.current.map((node) => (
        <NodeMesh
          key={node.id}
          node={node}
          status={nodeStatus[node.id] || 'initial'}
          onSelect={onSelect}
        />
      ))}
    </group>
  );
}

/* --- Graph3D Root Component --- */
export default function Graph3D() {
  const [nodeStatus, setNodeStatus] = useState<Record<string, 'initial' | 'selected' | 'unselected'>>(() => {
    const status: Record<string, 'initial' | 'selected' | 'unselected'> = {};
    initialNodes.forEach((node) => {
      status[node.id] = 'initial';
    });
    return status;
  });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const handleSelect = (node: Node) => {
    setNodeStatus((prev) => {
      const newStatus = { ...prev };
      if (selectedNodeId === node.id) {
        newStatus[node.id] = 'unselected';
        setSelectedNodeId(null);
      } else {
        if (selectedNodeId) {
          newStatus[selectedNodeId] = 'unselected';
        }
        newStatus[node.id] = 'selected';
        setSelectedNodeId(node.id);
      }
      return newStatus;
    });
  };

  // Create a ref for OrbitControls so we can reset the camera.
  const controlsRef = useRef<any>(null);
  const handleCenter = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '300px', background: '#ffffff' }}>
      {/* Center Button */}
      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 2 }}>
        <button onClick={handleCenter} style={{ padding: '8px 12px', fontSize: '16px' }}>
          Center
        </button>
      </div>
      <Canvas
        camera={{ position: [10, 10, 10], fov: 45 }}
        style={{ touchAction: 'none' }}
        onCreated={({ gl }) => {
          gl.setClearColor('#ffffff');
        }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={0.6} />
        <Graph nodeStatus={nodeStatus} onSelect={handleSelect} />
        <OrbitControls makeDefault ref={controlsRef} />
      </Canvas>
    </div>
  );
}
