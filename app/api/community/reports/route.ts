import { NextRequest } from 'next/server';
import { insertCommunityReport } from '@/lib/db';
import { clean, noStoreJson, rateLimit } from '@/lib/community';
import { notifyCommunitySubmission } from '@/services/notifier';

export const runtime = 'nodejs';

const reasons = ['疑似危险或召回产品', '虚假或误导信息', '骚扰或不当内容', '疑似收费或欺诈', '其他'];

export async function POST(req: NextRequest) {
  if (!await rateLimit(req, 'community-report', 10)) return noStoreJson({ error: '提交过于频繁，请稍后再试' }, { status: 429 });
  let body: { item_id?: number; reason?: string; details?: string; contact?: string };
  try { body = await req.json(); } catch { return noStoreJson({ error: '提交格式无效' }, { status: 400 }); }
  if (!body.reason || !reasons.includes(body.reason)) return noStoreJson({ error: '请选择举报原因' }, { status: 400 });
  if (body.item_id !== undefined && (!Number.isInteger(body.item_id) || body.item_id <= 0)) {
    return noStoreJson({ error: '关联物品编号无效' }, { status: 400 });
  }
  try {
    const report = await insertCommunityReport({
      item_id: body.item_id || null,
      reason: clean(body.reason, 100),
      details: clean(body.details, 1000) || null,
      contact: clean(body.contact, 300) || null,
    });
    await notifyCommunitySubmission({
      kind: '内容举报',
      contact: clean(body.contact, 300) || '未留下',
      summary: `物品 #${body.item_id || '未知'}；${clean(body.reason, 100)}；${clean(body.details, 1000)}`,
      recordId: Number(report.id),
    }).catch(error => console.error('[community-notify]', (error as Error).message));
    return noStoreJson({ report: { id: report.id, status: report.status } }, { status: 201 });
  } catch {
    return noStoreJson({ error: '举报暂时未保存，请稍后重试' }, { status: 503 });
  }
}
