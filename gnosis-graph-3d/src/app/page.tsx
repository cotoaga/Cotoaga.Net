'use client';

import dynamic from 'next/dynamic';

// Disable SSR for the Graph3D component
const Graph3D = dynamic(() => import('../components/Graph3D'), {
  ssr: false,
  loading: () => <div>Loading Graph...</div>
});

export default function Home() {
  return (
    <main>
      <Graph3D />
    </main>
  );
}

<div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 2 }}>
  <button onClick={handleCenter}>Center</button>
</div>
