'use client';

import React, { useRef, useState } from 'react';
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
  color: string;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
}

interface Edge {
  from: string;
  to: string;
}

// --- Initial Data ---
// All nodes start at (0,0,0).
const initialNodes: Node[] = [
  { id: 'safe',    label: 'SAFe',    color: '#548235', position: new THREE.Vector3(0, 0, 0), velocity: new THREE.Vector3() },
  { id: 'less',    label: 'LeSS',    color: '#548235', position: new THREE.Vector3(0, 0, 0), velocity: new THREE.Vector3() },
  { id: 'cynefin', label: 'Cynefin', color: '#548235', position: new THREE.Vector3(0, 0, 0), velocity: new THREE.Vector3() },
  { id: 'agile',   label: 'Agile',   color: '#548235', position: new THREE.Vector3(0, 0, 0), velocity: new THREE.Vector3() },
  { id: 'devops',  label: 'DevOps',  color: '#548235', position: new THREE.Vector3(0, 0, 0), velocity: new THREE.Vector3() }
];

// Edges, including an extra devops->cynefin edge to encourage 3D layout
const edges: Edge[] = [
  { from: 'safe',    to: 'agile' },
  { from: 'less',    to: 'agile' },
  { from: 'cynefin', to: 'agile' },
  { from: 'devops',  to: 'agile' },
  { from: 'safe',    to: 'devops' },
  { from: 'less',    to: 'devops' },
  { from: 'devops',  to: 'cynefin' }
];

/* --- Edge Component --- */
function EdgeComponent({ startNode, endNode }: { startNode: Node; endNode: Node }) {
  const ref = useRef<THREE.Line>(null);

  useFrame(() => {
    if (ref.current) {
      const positions = new Float32Array([
        startNode.position.x, startNode.position.y, startNode.position.z,
        endNode.position.x, endNode.position.y, endNode.position.z
      ]);
      ref.current.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      ref.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <line ref={ref}>
      <bufferGeometry />
      {/* 
        depthTest={false} ensures the line won't occlude or block pointer events for sprites. 
        You could also do depthWrite={false} if you want the line to appear behind labels.
      */}
      <lineBasicMaterial color="#e7e7e7" transparent opacity={0.4} depthTest={false} />
    </line>
  );
}

/* --- Node (Label Sprite) --- */
interface NodeMeshProps {
  node: Node;
  selected: boolean;
  canSelect: boolean; // Whether clicking is allowed (i.e. after annealing)
  onSelect: (node: Node) => void;
}

function NodeMesh({ node, selected, canSelect, onSelect }: NodeMeshProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Keep the sprite at the node's position.
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.copy(node.position);
    }
  });

  // Only allow selection if canSelect is true.
  const handlePointerDown = (e: THREE.Event) => {
    e.stopPropagation();
    console.log('Pointer down on node:', node.label);
    if (!canSelect) {
      console.log('Ignoring click because canSelect is false.');
      return;
    }
    onSelect(node);
  };

  // Create a canvas for the label
  const labelCanvas = (() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'black';
      ctx.font = '60px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.label, canvas.width / 2, canvas.height / 2);
    }
    return canvas;
  })();

  // Scale sprite up if selected
  const spriteScale = selected ? [6, 3, 3] : [4, 2, 2];

  return (
    <group ref={groupRef}>
      <sprite
        // Use pointerDown instead of onClick
        onPointerDown={handlePointerDown}
        scale={spriteScale}
        renderOrder={999} // ensures it's rendered last (helps with picking)
        frustumCulled={false} // ensure sprite is never culled
      >
        <spriteMaterial 
          depthTest={false} 
          transparent={true}
        >
          <canvasTexture attach="map" image={labelCanvas} />
        </spriteMaterial>
      </sprite>
    </group>
  );
}

/* --- Graph (Simulation + Layout) --- */
interface GraphProps {
  frozen: boolean; // Whether the layout is frozen (after annealing)
  selectedNodeId: string | null;
  onSelect: (node: Node) => void;
}

function Graph({ frozen, selectedNodeId, onSelect }: GraphProps) {
  // Using a ref to store node data so we don't re-render all the time.
  const nodesRef = useRef<Node[]>(initialNodes);

  useFrame((state) => {
    // If already frozen, skip simulation
    if (frozen) return;

    const elapsed = state.clock.getElapsedTime();

    // If we exceed the annealing duration, do nothing further (the parent sets frozen)
    if (elapsed > ANNEAL_DURATION) {
      return;
    }

    // Linear annealing factor from 1 to 0 over ANNEAL_DURATION
    const annealFactor = 1 - elapsed / ANNEAL_DURATION;

    const nodes = nodesRef.current;
    nodes.forEach((node) => {
      const newPosition = node.position.clone();
      const newVelocity = new THREE.Vector3();

      // Repulsion
      nodes.forEach((otherNode) => {
        if (otherNode.id !== node.id) {
          let diff = newPosition.clone().sub(otherNode.position);
          let distance = diff.length();
          if (distance < 0.001) {
            // Break symmetry with a small random jitter
            diff = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
            distance = diff.length() || 0.001;
          }
          const force = REPULSION / (distance * distance);
          newVelocity.add(diff.normalize().multiplyScalar(force));
        }
      });

      // Attraction
      edges.forEach((edge) => {
        if (edge.from === node.id || edge.to === node.id) {
          const otherId = edge.from === node.id ? edge.to : edge.from;
          const otherNode = nodes.find(n => n.id === otherId);
          if (otherNode) {
            let diff = otherNode.position.clone().sub(newPosition);
            let distance = diff.length();
            if (distance < 0.001) {
              diff = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
              distance = diff.length() || 0.001;
            }
            newVelocity.add(diff.multiplyScalar(ATTRACTION));
          }
        }
      });

      // Center gravity, damping, annealing factor
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
          selected={node.id === selectedNodeId}
          canSelect={frozen} // only allow clicks after annealing
          onSelect={onSelect}
        />
      ))}
    </group>
  );
}

/* --- Graph3D Root Component --- */
export default function Graph3D() {
  const [frozen, setFrozen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Freeze the layout automatically after 10 seconds in onFrame
  const handleFrame = (state: any) => {
    if (!frozen && state.clock.getElapsedTime() > ANNEAL_DURATION) {
      console.log('Annealing complete, freezing layout and enabling selection.');
      setFrozen(true);
    }
  };

  // Toggle selection if layout is frozen
  const handleSelect = (node: Node) => {
    if (!frozen) {
      console.log('Ignoring click; layout not frozen yet.');
      return;
    }
    setSelectedNodeId(prev => (prev === node.id ? null : node.id));
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '500px', background: '#ffffff' }}>
      <Canvas
        camera={{ position: [10, 10, 10], fov: 45 }}
        style={{ touchAction: 'none' }}
        onCreated={({ gl }) => {
          gl.setClearColor('#ffffff');
        }}
        onFrame={handleFrame} // Called every frame
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={0.6} />
        <Graph
          frozen={frozen}
          selectedNodeId={selectedNodeId}
          onSelect={handleSelect}
        />
        <OrbitControls
          makeDefault
          // If you want to disable camera movement after freeze, do:
          // enabled={!frozen}
        />
      </Canvas>
    </div>
  );
}
