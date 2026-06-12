import { NextRequest } from 'next/server';
import { updateLeadStatus } from '@/lib/db';

export const runtime = 'nodejs';

const VALID_STATUSES = new Set([
  'pending', 'reviewing', 'clarifying', 'awaiting_customer',
  'ready_to_dispatch', 'matching', 'assigned', 'executing',
  'waiting_third_party', 'completed', 'not_converted', 'cancelled',
  'long_term_followup',
]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { status } = await req.json() as { status?: string };

  if (!status || !VALID_STATUSES.has(status)) {
    return Response.json({ error: '无效的 status 值' }, { status: 400 });
  }

  const lead = await updateLeadStatus(Number(id), status);
  if (!lead) {
    return Response.json({ error: '线索不存在' }, { status: 404 });
  }
  return Response.json({ lead });
}
