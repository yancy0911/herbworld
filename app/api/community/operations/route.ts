import { NextRequest } from 'next/server';
import { insertCommunityAuditLog, issueClaimHandoffCode, listCommunityOperations, updateCommunityItemStatus, updateCommunityRecordStatus } from '@/lib/db';
import { generateHandoffCode, HANDOFF_CODE_TTL_HOURS, hashHandoffCode, noStoreJson } from '@/lib/community';

export const runtime = 'nodejs';

export async function GET() {
  try {
    return noStoreJson(await listCommunityOperations());
  } catch {
    return noStoreJson({ error: '运营数据暂时不可用' }, { status: 503 });
  }
}

export async function PATCH(req: NextRequest) {
  let body: { kind?: string; id?: number; status?: string; review_checks?: Record<string, boolean> };
  try { body = await req.json(); } catch {
    return noStoreJson({ error: '提交格式无效' }, { status: 400 });
  }
  if (!Number.isInteger(body.id) || Number(body.id) <= 0 || !body.kind || !body.status) {
    return noStoreJson({ error: '缺少更新参数' }, { status: 400 });
  }
  const id = Number(body.id);
  const allowed: Record<string, string[]> = {
    item: ['available', 'claimed', 'rejected'],
    claim: ['contacted'],
    service: ['quoted', 'completed'],
    report: ['reviewing', 'resolved'],
  };
  if (!allowed[body.kind]?.includes(body.status)) {
    return noStoreJson({ error: '不允许的状态更新' }, { status: 400 });
  }
  if (body.kind === 'item' && body.status === 'available') {
    const checks = body.review_checks ?? {};
    if (!['ownership', 'condition', 'recall', 'privacy'].every(key => checks[key])) {
      return noStoreJson({ error: '批准前必须完成全部安全审核' }, { status: 400 });
    }
  }
  try {
    if (body.kind === 'claim' && body.status === 'contacted') {
      const handoffCode = generateHandoffCode();
      const expiresAt = new Date(Date.now() + HANDOFF_CODE_TTL_HOURS * 60 * 60 * 1000);
      const record = await issueClaimHandoffCode(id, hashHandoffCode(id, handoffCode), expiresAt);
      if (record) await insertCommunityAuditLog({
        actor: 'admin',
        action: 'issue_handoff_code',
        resource_type: 'claim',
        resource_id: String(id),
        detail: { status: body.status, expires_at: expiresAt.toISOString() },
      });
      return record
        ? noStoreJson({ record, handoff_code: handoffCode, expires_at: expiresAt.toISOString() })
        : noStoreJson({ error: '无法生成取货码：物品可能已被领取，或已有其他有效领取码' }, { status: 409 });
    }
    const record = body.kind === 'item'
      ? await updateCommunityItemStatus(id, body.status)
      : await updateCommunityRecordStatus(body.kind === 'claim' ? 'item_claims' : body.kind === 'service' ? 'service_requests' : 'community_reports', id, body.status);
    if (record) await insertCommunityAuditLog({
      actor: 'admin',
      action: 'update_status',
      resource_type: body.kind,
      resource_id: String(id),
      detail: { status: body.status, review_checks: body.review_checks ?? null },
    });
    return record ? noStoreJson({ record }) : noStoreJson({ error: '记录不存在' }, { status: 404 });
  } catch {
    return noStoreJson({ error: '状态更新失败' }, { status: 503 });
  }
}
