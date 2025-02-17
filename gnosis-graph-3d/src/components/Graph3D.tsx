// src/components/Graph3D.tsx
'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Html } from '@react-three/drei';
import * as THREE from 'three';

interface Node3D {
  id: string;
  label: string;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  mass: number;
  category?: string;
  color?: string;
}

interface Edge3D {
  source: string;
  target: string;
  strength: number;
  restLength: number;
}

interface Graph3DData {
  nodes: Node3D[];
  edges: Edge3D[];
}

// Physics constants
const REPULSION = 80;  // Increased for more spacing
const ATTRACTION = 0.2;
const DAMPING = 0.85;
const CENTER_GRAVITY = 0.03;
const MAX_VELOCITY = 2.0;

interface NodeProps {
  node: Node3D;
  selected: boolean;
  onDragStart: (e: THREE.Event) => void;
  onDragEnd: (e: THREE.Event) => void;
  onClick: (e: THREE.Event) => void;
}

const Node: React.FC<NodeProps> = ({ 
  node, 
  selected, 
  onDragStart, 
  onDragEnd, 
  onClick 
}) => {
  const meshRef = useRef<THREE.Mesh>();
  const { camera } = useThree();
  const [hovered, setHovered] = useState(false);

  useFrame(() => {
    if (meshRef.current && meshRef.current.scale) {
      const scale = selected || hovered ? 1.2 : 1;
      meshRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1);
    }
  });

  return (
    <group position={node.position}>
      <mesh
        ref={meshRef}
        onPointerDown={onDragStart}
        onPointerUp={onDragEnd}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={onClick}
      >
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshPhongMaterial 
          color={selected ? '#ff4a4a' : (hovered ? '#6ab0ff' : (node.color || '#4a9eff'))}
          shininess={50}
        />
      </mesh>
      <Text
        position={[0, 1.2, 0]}
        fontSize={0.8}
        color="white"
        anchorX="center"
        anchorY="middle"
        renderOrder={1}
        depthOffset={10}
        font="/fonts/Inter-Bold.woff"
        outlineWidth={0.1}
        outlineColor="#000000"
      >
        {node.label}
      </Text>
    </group>
  );
};

const Edge: React.FC<{
  start: THREE.Vector3;
  end: THREE.Vector3;
  selected?: boolean;
}> = ({ start, end, selected }) => {
  const ref = useRef<THREE.Line>();

  useFrame(() => {
    if (ref.current) {
      const positions = new Float32Array([
        start.x, start.y, start.z,
        end.x, end.y, end.z
      ]);
      ref.current.geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(positions, 3)
      );
      ref.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <line ref={ref}>
      <bufferGeometry />
      <lineBasicMaterial 
        color={selected ? '#ff4a4a' : '#666666'} 
        linewidth={1}
        transparent
        opacity={0.6}
      />
    </line>
  );
};

const ForceGraph: React.FC<{ data: Graph3DData }> = ({ data }) => {
  const [nodes, setNodes] = useState<Node3D[]>(data.nodes);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const { camera, mouse, viewport } = useThree();
  const dragPlaneRef = useRef<THREE.Plane>(new THREE.Plane());
  const intersectPointRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());

  useFrame(() => {
    if (draggedNode) return;  // Don't apply forces while dragging

    const newNodes = nodes.map(node => {
      const newNode = { ...node };
      newNode.velocity = new THREE.Vector3().copy(node.velocity);
      newNode.position = new THREE.Vector3().copy(node.position);

      // Apply forces
      nodes.forEach(otherNode => {
        if (node.id !== otherNode.id) {
          const dx = node.position.x - otherNode.position.x;
          const dy = node.position.y - otherNode.position.y;
          const dz = node.position.z - otherNode.position.z;
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
          
          if (distance > 0) {
            const force = REPULSION / (distance * distance);
            newNode.velocity.add(
              new THREE.Vector3(dx, dy, dz)
                .normalize()
                .multiplyScalar(force)
            );
          }
        }
      });

      // Edge attraction
      data.edges.forEach(edge => {
        if (edge.source === node.id || edge.target === node.id) {
          const otherNode = nodes.find(n => 
            n.id === (edge.source === node.id ? edge.target : edge.source)
          );
          if (otherNode) {
            const force = new THREE.Vector3()
              .subVectors(otherNode.position, node.position)
              .multiplyScalar(ATTRACTION);
            newNode.velocity.add(force);
          }
        }
      });

      // Center gravity
      newNode.velocity.add(
        new THREE.Vector3(-node.position.x, -node.position.y, -node.position.z)
          .multiplyScalar(CENTER_GRAVITY)
      );

      // Apply velocity with damping and max speed limit
      newNode.velocity.multiplyScalar(DAMPING);
      const speed = newNode.velocity.length();
      if (speed > MAX_VELOCITY) {
        newNode.velocity.multiplyScalar(MAX_VELOCITY / speed);
      }
      newNode.position.add(newNode.velocity);

      return newNode;
    });

    setNodes(newNodes);
  });

  const handleDragStart = (nodeId: string) => (event: THREE.Event) => {
    event.stopPropagation();
    setDraggedNode(nodeId);
    
    // Setup drag plane
    const normal = new THREE.Vector3(0, 0, 1);
    normal.applyQuaternion(camera.quaternion);
    dragPlaneRef.current.setFromNormalAndCoplanarPoint(
      normal,
      nodes.find(n => n.id === nodeId)?.position || new THREE.Vector3()
    );
  };

  const handleDragEnd = () => {
    setDraggedNode(null);
  };

  useFrame(() => {
    if (draggedNode) {
      const node = nodes.find(n => n.id === draggedNode);
      if (!node) return;

      raycasterRef.current.setFromCamera(mouse, camera);
      if (raycasterRef.current.ray.intersectPlane(dragPlaneRef.current, intersectPointRef.current)) {
        const newNodes = nodes.map(n => 
          n.id === draggedNode 
            ? { ...n, position: new THREE.Vector3().copy(intersectPointRef.current) }
            : n
        );
        setNodes(newNodes);
      }
    }
  });

  return (
    <>
      {data.edges.map((edge, i) => {
        const source = nodes.find(n => n.id === edge.source);
        const target = nodes.find(n => n.id === edge.target);
        if (source && target) {
          return (
            <Edge
              key={`edge-${i}`}
              start={source.position}
              end={target.position}
              selected={selectedNode !== null && (edge.source === selectedNode || edge.target === selectedNode)}
            />
          );
        }
        return null;
      })}
      {nodes.map(node => (
        <Node
          key={node.id}
          node={node}
          selected={node.id === selectedNode}
          onDragStart={handleDragStart(node.id)}
          onDragEnd={handleDragEnd}
          onClick={() => setSelectedNode(node.id === selectedNode ? null : node.id)}
        />
      ))}
    </>
  );
};

const Graph3D: React.FC = () => {
  const graphData: Graph3DData = {
    nodes: [
      {
        id: 'cynefin',
        label: 'Cynefin',
        position: new THREE.Vector3(Math.random() * 10 - 5, Math.random() * 10 - 5, Math.random() * 10 - 5),
        velocity: new THREE.Vector3(),
        mass: 1,
        color: '#ff7e7e'
      },
      {
        id: 'safe',
        label: 'SAFe',
        position: new THREE.Vector3(Math.random() * 10 - 5, Math.random() * 10 - 5, Math.random() * 10 - 5),
        velocity: new THREE.Vector3(),
        mass: 1,
        color: '#7eff7e'
      },
      {
        id: 'less',
        label: 'LeSS',
        position: new THREE.Vector3(Math.random() * 10 - 5, Math.random() * 10 - 5, Math.random() * 10 - 5),
        velocity: new THREE.Vector3(),
        mass: 1,
        color: '#7e7eff'
      },
      {
        id: 'agile',
        label: 'Agile',
        position: new THREE.Vector3(Math.random() * 10 - 5, Math.random() * 10 - 5, Math.random() * 10 - 5),
        velocity: new THREE.Vector3(),
        mass: 1.5,
        color: '#ffff7e'
      },
      {
        id: 'devops',
        label: 'DevOps',
        position: new THREE.Vector3(Math.random() * 10 - 5, Math.random() * 10 - 5, Math.random() * 10 - 5),
        velocity: new THREE.Vector3(),
        mass: 1,
        color: '#ff7eff'
      }
    ],
    edges: [
      { source: 'safe', target: 'agile', strength: 1, restLength: 5 },
      { source: 'less', target: 'agile', strength: 1, restLength: 5 },
      { source: 'cynefin', target: 'agile', strength: 0.8, restLength: 6 },
      { source: 'devops', target: 'agile', strength: 0.8, restLength: 6 },
      { source: 'safe', target: 'devops', strength: 0.5, restLength: 7 },
      { source: 'less', target: 'devops', strength: 0.5, restLength: 7 }
    ]
  };

  return (
    <div className="w-full h-screen">
      <Canvas
        camera={{ position: [0, 0, 20], fov: 75 }}
        className="w-full h-full bg-gray-900"
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <OrbitControls 
          enableDamping 
          dampingFactor={0.05} 
          minDistance={10}
          maxDistance={50}
        />
        <ForceGraph data={graphData} />
      </Canvas>
    </div>
  );
};

export default Graph3D;
