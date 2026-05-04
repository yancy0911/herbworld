import { NextRequest } from 'next/server';
import { getDb, type Lead } from '@/lib/db';

export const runtime = 'nodejs';

const VALID_STATUSES = new Set(['pending', 'contacted', 'done']);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { status } = await req.json() as { status?: string };

  if (!status || !VALID_STATUSES.has(status)) {
    return Response.json({ error: '无效的 status 值' }, { status: 400 });
  }

  const db = getDb();
  const info = db.prepare('UPDATE leads SET status = ? WHERE id = ?').run(status, Number(id));
  if (info.changes === 0) {
    return Response.json({ error: '线索不存在' }, { status: 404 });
  }

  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(Number(id)) as Lead;
  return Response.json({ lead });
}
