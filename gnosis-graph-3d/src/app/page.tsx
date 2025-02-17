'use client';

import dynamic from 'next/dynamic';

const Graph3D = dynamic(() => import('../components/Graph3D'), { ssr: false });

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between text-sm lg:flex">
        <div className="border border-gray-800 rounded-lg p-4 bg-gray-900">
          <Graph3D
            width={800}
            height={600}
            className="w-full h-[600px]"
          />
        </div>
      </div>
    </main>
  );
}
