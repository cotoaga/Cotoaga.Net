import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const input = searchParams.get('input') || '';
  const style = searchParams.get('style') || 'genz-woke';

  const buzzwords = ['synergy', 'vibes', 'late-stage capitalism', 'slay', 'praxis', 'disrupt'];
  const base = input.split(' ').map(word => Math.random() < 0.4 ? `${word} ${buzzwords[Math.floor(Math.random() * buzzwords.length)]}` : word).join(' ');
  const rants = [
    `The ${base} dances wickedly in the void of digital praxis.`,
    `${base} shatters the algorithm’s fragile ego—slay, comrade!`,
    `In the shadow of ${base}, the system trembles—vibes eternal.`
  ];
  return new Response(rants[Math.floor(Math.random() * rants.length)]);
}
