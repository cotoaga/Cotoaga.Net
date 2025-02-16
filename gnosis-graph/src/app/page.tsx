// src/app/page.tsx
import KnowledgeNetwork from '@/components/KnowledgeNetwork';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4">
      <h1 className="text-3xl font-bold mb-8">Knowledge Network</h1>
      <KnowledgeNetwork />
    </main>
  );
}
