// scripts/fetch-tmdb.js
/* eslint-disable no-console */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_KEY = process.env.TMDB_API_KEY;
if (!API_KEY) {
  console.error('Missing TMDB_API_KEY in .env');
  process.exit(1);
}

const API = 'https://api.themoviedb.org/3';
const OUT = path.join(__dirname, '..', 'public', 'data', 'movies_seed.json');

async function get(pathname, params = {}) {
  const url = new URL(API + pathname);
  url.searchParams.set('api_key', API_KEY);
  url.searchParams.set('language', 'en-US');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

async function collect() {
  const pages = 3; // tweak if you want more
  const buckets = [
    { path: '/movie/top_rated', label: 'top' },
    { path: '/movie/popular', label: 'popular' },
    { path: '/trending/movie/week', label: 'trending', paged: false },
  ];

  const items = new Map(); // tmdbId -> movie

  // paged lists
  for (const b of buckets) {
    if (b.paged === false) {
      const data = await get(b.path);
      data.results.forEach(add);
    } else {
      for (let p = 1; p <= pages; p++) {
        const data = await get(b.path, { page: String(p) });
        data.results.forEach(add);
      }
    }
  }

  function add(m) {
    const year = (m.release_date || '').slice(0, 4) || '????';
    const title = `${m.title} (${year})`;
    // Map to your schema with blanks for game fields:
    items.set(m.id, {
      title,
      description: m.overview || '',
      output: '',
      hints: [],
      breakdown: [],
    });
  }

  const list = Array.from(items.values());
  fs.writeFileSync(OUT, JSON.stringify(list, null, 2));
  console.log(`Seeded ${list.length} movies → ${path.relative(process.cwd(), OUT)}`);
}

collect().catch((e) => {
  console.error(e);
  process.exit(1);
});