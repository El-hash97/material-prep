import { neon } from '@neondatabase/serverless';

// Satu-satunya tempat yang bicara ke Neon. DATABASE_URL hanya ada di env Netlify.
const sql = neon(process.env.DATABASE_URL);

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export default async (req) => {
  const parts = new URL(req.url).pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);
  const [res, id] = parts;
  const body = ['POST', 'PUT', 'PATCH'].includes(req.method) ? await req.json().catch(() => null) : null;

  try {
    if (req.method === 'GET' && res === 'data') {
      const [s] = await sql`select data from settings where id = 1`;
      const shifts = await sql`select data from shifts order by seq desc`;
      return json({ settings: s?.data ?? null, shifts: shifts.map(r => r.data) });
    }

    if (req.method === 'PUT' && res === 'settings' && body) {
      await sql`insert into settings (id, data) values (1, ${JSON.stringify(body)}::jsonb)
                on conflict (id) do update set data = excluded.data, updated_at = now()`;
      return json({ ok: true });
    }

    if (req.method === 'POST' && res === 'shifts' && body?.id) {
      await sql`insert into shifts (id, status, data) values (${body.id}, ${body.status ?? null}, ${JSON.stringify(body)}::jsonb)
                on conflict (id) do nothing`;
      return json({ ok: true });
    }

    if (req.method === 'PATCH' && res === 'shifts' && id && body) {
      await sql`update shifts set data = data || ${JSON.stringify(body)}::jsonb,
                status = coalesce(${body.status ?? null}, status) where id = ${id}`;
      return json({ ok: true });
    }

    if (req.method === 'DELETE' && res === 'shifts' && id) {
      await sql`delete from shifts where id = ${id}`;
      return json({ ok: true });
    }

    // Impor sekali dari localStorage: hanya jika database masih kosong.
    if (req.method === 'POST' && res === 'import' && body) {
      const [{ n }] = await sql`select (select count(*) from settings) + (select count(*) from shifts) as n`;
      if (Number(n) > 0) return json({ imported: false });
      if (body.settings) await sql`insert into settings (id, data) values (1, ${JSON.stringify(body.settings)}::jsonb)`;
      // localStorage menyimpan terbaru di depan; insert dari yang terlama agar urutan seq benar.
      for (const s of [...(body.shifts ?? [])].reverse()) {
        await sql`insert into shifts (id, status, data) values (${s.id}, ${s.status ?? null}, ${JSON.stringify(s)}::jsonb) on conflict (id) do nothing`;
      }
      return json({ imported: true });
    }

    return json({ error: 'not found' }, 404);
  } catch (e) {
    console.error(e);
    return json({ error: 'database error' }, 500);
  }
};

export const config = { path: '/api/*' };
