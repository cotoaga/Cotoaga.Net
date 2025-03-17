import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const input = searchParams.get('input') || '';
  const style = searchParams.get('style') || 'genz-woke';

  const patterns: { [key: string]: { pattern?: RegExp; response: string; default?: boolean }[] } = {
    'genz-woke': [
      { pattern: /feel/i, response: 'Oof, bestie, let’s unpack that feel—how’s it vibing with your aura?' },
      { pattern: /lost/i, response: 'Lost? Babe, we’re manifesting a glow-up—where’s your energy at?' },
      { pattern: /stressed/i, response: 'Stress is giving toxic energy—let’s yeet that vibe, fam!' },
      { default: true, response: 'Spill more tea, fam—what’s the universe serving you today?' }
    ]
  };
  const match = patterns[style]?.find(p => p.pattern?.test(input)) || patterns[style]?.find(p => p.default);
  return new Response(match?.response || 'Oops, bestie—vibes are off, try again!'); // Fixed!
  // fake change to fake vercel - just ignore this line
}
