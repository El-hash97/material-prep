// Vercel Function: API yang sama dengan Netlify (netlify/functions/api.mjs), satu sumber kode.
// vercel.json menulis ulang /api/<path> → /api?path=<path>; fallback ke pathname bila tidak ditulis ulang.
import { handle } from '../netlify/functions/api.mjs';

export default {
  fetch(req) {
    const url = new URL(req.url);
    return handle(req, url.searchParams.get('path') ?? url.pathname.replace(/^\/api\/?/, ''));
  },
};
