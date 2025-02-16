// src/components/KnowledgeNetwork/index.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';

// Define types for our data structures
type Node = {
  id: string;
  label: string;
  group: string;
  x: number;
  y: number;
};

type Edge = {
  source: string;
  target: string;
};

const KnowledgeNetwork = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<Node[]>([
    // Core nodes
    { id: 'business-value', label: 'Business Value', group: 'core', x: 400, y: 300 },
    { id: 'digital-tetrahedron', label: 'Digital Tetrahedron', group: 'core', x: 300, y: 200 },
    { id: 'complexity', label: 'Complexity', group: 'core', x: 500, y: 200 },
    
    // Methods & Frameworks
    { id: 'cynefin', label: 'Cynefin', group: 'framework', x: 400, y: 100 },
    { id: 'product-management', label: 'Product Management', group: 'framework', x: 300, y: 400 },
    
    // Regions
    { id: 'europe', label: 'Europe', group: 'region', x: 200, y: 400 },
    { id: 'latin-america', label: 'Latin America', group: 'region', x: 600, y: 400 }
  ]);

  const edges: Edge[] = [
    { source: 'business-value', target: 'digital-tetrahedron' },
    { source: 'business-value', target: 'complexity' },
    { source: 'complexity', target: 'cynefin' },
    { source: 'digital-tetrahedron', target: 'product-management' },
    { source: 'europe', target: 'business-value' },
    { source: 'latin-america', target: 'business-value' }
  ];

  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragNode, setDragNode] = useState<Node | null>(null);

  const nodeContent: Record<string, string> = {
    'business-value': 'Focusing on measurable outcomes and sustainable growth through value stream optimization',
    'digital-tetrahedron': 'Four interconnected aspects: Complexity thinking, Business Agility, Agile Delivery, and UI/UX',
    'complexity': 'Understanding and navigating complex adaptive systems in organizational transformation',
    'cynefin': 'Framework for decision-making in different contexts: Clear, Complicated, Complex, Chaotic',
    'europe': 'Strategic market entry and scaling in European markets, considering cultural and regulatory aspects',
    'latin-america': 'Market expansion and cultural adaptation strategies for Latin American regions',
    'product-management': 'Agile product development and management practices for sustainable growth'
  };

  const handleNodeClick = (node: Node) => {
    setSelectedNode(selectedNode?.id === node.id ? null : node);
  };

  const handleMouseDown = (node: Node, event: React.MouseEvent) => {
    setIsDragging(true);
    setDragNode(node);
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (isDragging && dragNode && svgRef.current) {
      const svg = svgRef.current;
      const pt = svg.createSVGPoint();
      pt.x = event.clientX;
      pt.y = event.clientY;
      const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
      
      setNodes(nodes.map(node => 
        node.id === dragNode.id 
          ? { ...node, x: svgP.x, y: svgP.y }
          : node
      ));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragNode(null);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="relative h-96 bg-gray-50 rounded-lg shadow-lg">
        <svg 
          ref={svgRef}
          viewBox="0 0 800 600" 
          className="w-full h-full"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Draw edges */}
          {edges.map((edge, index) => {
            const source = nodes.find(n => n.id === edge.source);
            const target = nodes.find(n => n.id === edge.target);
            return source && target && (
              <line
                key={index}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke="#CBD5E1"
                strokeWidth="2"
                className="transition-all duration-300"
              />
            );
          })}
          
          {/* Draw nodes */}
          {nodes.map((node) => (
            <g
              key={node.id}
              transform={`translate(${node.x},${node.y})`}
              onClick={() => handleNodeClick(node)}
              onMouseDown={(e) => handleMouseDown(node, e)}
              className="cursor-pointer"
            >
              <circle
                r={selectedNode?.id === node.id ? "30" : "20"}
                fill={selectedNode?.id === node.id ? "#3B82F6" : "#60A5FA"}
                className="transition-all duration-300"
              />
              <text
                textAnchor="middle"
                dy=".3em"
                fill="white"
                fontSize="12"
                className="select-none pointer-events-none"
              >
                {node.label.split(' ')[0]}
              </text>
            </g>
          ))}
        </svg>
        
        {/* Information panel */}
        {selectedNode && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 rounded-b-lg">
            <h3 className="text-lg font-semibold mb-2">{selectedNode.label}</h3>
            <p className="text-gray-600">{nodeContent[selectedNode.id]}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default KnowledgeNetwork;
