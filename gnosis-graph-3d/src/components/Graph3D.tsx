'use client';

import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// Physics constants - adjusted for gentler movement
const REPULSION = 10;         // Reduced from 15
const ATTRACTION = 0.03;      // Reduced from 0.05
const DAMPING = 0.85;         // Increased from 0.7 for more stability
const CENTER_GRAVITY = 0.008;   // Reduced from 0.01
const INITIAL_SPREAD = 8;

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

// Helper function for random 3D position
function randomPosition() {
  return new THREE.Vector3(
    (Math.random() - 0.5) * INITIAL_SPREAD,
    (Math.random() - 0.5) * INITIAL_SPREAD,
    (Math.random() - 0.5) * INITIAL_SPREAD
  );
}

const initialNodes: Node[] = [
  { id: 'safe', label: 'SAFe', color: '#4aff4a', position: randomPosition(), velocity: new THREE.Vector3() },
  { id: 'less', label: 'LeSS', color: '#4aff4a', position: randomPosition(), velocity: new THREE.Vector3() },
  { id: 'cynefin', label: 'Cynefin', color: '#4aff4a', position: randomPosition(), velocity: new THREE.Vector3() },
  { id: 'agile', label: 'Agile', color: '#4aff4a', position: randomPosition(), velocity: new THREE.Vector3() },
  { id: 'devops', label: 'DevOps', color: '#4aff4a', position: randomPosition(), velocity: new THREE.Vector3() }
];

const edges: Edge[] = [
  { from: 'safe', to: 'agile' },
  { from: 'less', to: 'agile' },
  { from: 'cynefin', to: 'agile' },
  { from: 'devops', to: 'agile' },
  { from: 'safe', to: 'devops' },
  { from: 'less', to: 'devops' }
];

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
      <lineBasicMaterial color="#999999" transparent opacity={0.4} />
    </line>
  );
}

function NodeMesh({ node, onSelect }: { node: Node; onSelect: (node: Node) => void }) {
  const groupRef = useRef<THREE.Group>(null);

  // Update the mesh's position directly each frame
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.copy(node.position);
    }
  });

  const handleClick = (e: any) => {
    // Stop propagation so OrbitControls doesn't intercept this event
    e.stopPropagation();
    console.log('Selected node:', node.label);
    onSelect(node);
  };

  return (
    <group ref={groupRef}>
      <mesh
        onClick={handleClick}
        onPointerDown={handleClick}
      >
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshPhongMaterial color={node.color} shininess={60} />
      </mesh>
      <sprite scale={[3, 1, 1]}>
        <spriteMaterial>
          <canvasTexture
            attach="map"
            image={(() => {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              canvas.width = 256;
              canvas.height = 64;
              if (ctx) {
                ctx.fillStyle = 'black';
                ctx.font = '32px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(node.label, canvas.width / 2, canvas.height / 2);
              }
              return canvas;
            })()}
          />
        </spriteMaterial>
      </sprite>
    </group>
  );
}

function Graph() {
  // Use a ref for nodes to avoid constant React re-renders.
  const nodesRef = useRef<Node[]>(initialNodes);

  useFrame(() => {
    const nodes = nodesRef.current;
    nodes.forEach((node) => {
      const newPosition = node.position.clone();
      const newVelocity = new THREE.Vector3();

      // Repulsion (3D)
      nodes.forEach((otherNode) => {
        if (otherNode.id !== node.id) {
          const diff = newPosition.clone().sub(otherNode.position);
          const distance = diff.length();
          if (distance > 0 && distance < INITIAL_SPREAD) {
            const force = REPULSION / (distance * distance);
            newVelocity.add(diff.normalize().multiplyScalar(force));
          }
        }
      });

      // Attraction along edges
      edges.forEach((edge) => {
        if (edge.from === node.id || edge.to === node.id) {
          const otherId = edge.from === node.id ? edge.to : edge.from;
          const otherNode = nodes.find((n) => n.id === otherId);
          if (otherNode) {
            const diff = otherNode.position.clone().sub(newPosition);
            newVelocity.add(diff.multiplyScalar(ATTRACTION));
          }
        }
      });

      // Gentle center gravity and damping
      newVelocity.sub(newPosition.clone().multiplyScalar(CENTER_GRAVITY));
      newVelocity.multiplyScalar(DAMPING);

      newPosition.add(newVelocity);
      node.position.copy(newPosition);
      node.velocity.copy(newVelocity);
    });
  });

  return (
    <group>
      {edges.map((edge, i) => {
        const startNode = nodesRef.current.find((n) => n.id === edge.from);
        const endNode = nodesRef.current.find((n) => n.id === edge.to);
        if (startNode && endNode) {
          return <EdgeComponent key={`edge-${i}`} startNode={startNode} endNode={endNode} />;
        }
        return null;
      })}
      {nodesRef.current.map((node) => (
        <NodeMesh
          key={node.id}
          node={node}
          onSelect={(selectedNode) => {
            // This should log when you click a sphere
            console.log('Selected node:', selectedNode.label);
          }}
        />
      ))}
    </group>
  );
}

export default function Graph3D() {
  return (
    <div style={{ width: '100%', height: '500px', background: '#ffffff' }}>
      <Canvas
        camera={{ position: [10, 10, 10], fov: 45 }}
        style={{ touchAction: 'none' }}
        onCreated={({ gl }) => {
          gl.setClearColor('#ffffff');
        }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={0.6} />
        <Graph />
        <OrbitControls
          makeDefault
          enableRotate={true}
          enableZoom={true}
          enablePan={true}
          rotateSpeed={1}
          zoomSpeed={1.2}
          panSpeed={0.8}
        />
      </Canvas>
    </div>
  );
}
