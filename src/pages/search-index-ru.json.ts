import type { APIRoute } from 'astro';
import { buildSearchIndex } from '../lib/search-index';

export const GET: APIRoute = async () => {
  const index = await buildSearchIndex('ru');
  return new Response(JSON.stringify(index), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
};
