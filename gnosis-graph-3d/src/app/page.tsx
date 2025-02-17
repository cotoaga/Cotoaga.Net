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
