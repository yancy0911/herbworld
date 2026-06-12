import { NextRequest } from 'next/server';
import { insertCommunityItem, listCommunityItems } from '@/lib/db';
import { screenRequestRisk } from '@/lib/risk';
import { clean, ITEM_CATEGORIES, itemSafetyError, noStoreJson, POLICY_VERSION, publicInfoError, publisherKey, rateLimit } from '@/lib/community';
import { notifyCommunitySubmission } from '@/services/notifier';

export const runtime = 'nodejs';

export async function GET() {
  try {
    return noStoreJson({ items: await listCommunityItems() });
  } catch {
    return noStoreJson({ items: [], error: '物品列表暂时不可用' }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  if (!await rateLimit(req, 'community-item', 5)) return noStoreJson({ error: '提交过于频繁，请稍后再试' }, { status: 429 });
  let body: Record<string, string | boolean>;
  try { body = await req.json(); } catch { return noStoreJson({ error: '提交格式无效' }, { status: 400 }); }
  const required = ['title', 'description', 'category', 'condition', 'approximate_area', 'availability', 'contact'];
  if (required.some(key => !String(body[key] ?? '').trim())) {
    return noStoreJson({ error: '请完整填写物品和联系方式' }, { status: 400 });
  }
  if (!body.owns_item || !body.accepted_rules) {
    return noStoreJson({ error: '请确认物品所有权并接受试点规则' }, { status: 400 });
  }
  if (!ITEM_CATEGORIES.includes(body.category as typeof ITEM_CATEGORIES[number])) return noStoreJson({ error: '无效的物品分类' }, { status: 400 });
  const publicText = `${body.title} ${body.description} ${body.approximate_area}`;
  const risk = screenRequestRisk(publicText);
  if (risk.blocked) return noStoreJson({ error: risk.reason }, { status: 422 });
  const safetyError = itemSafetyError(publicText);
  if (safetyError) return noStoreJson({ error: safetyError }, { status: 422 });
  const infoError = publicInfoError(publicText);
  if (infoError) return noStoreJson({ error: infoError }, { status: 422 });
  try {
    const item = await insertCommunityItem({
      publisher_key: publisherKey(clean(body.contact, 300)),
      title: clean(body.title, 100),
      description: clean(body.description, 1200),
      category: clean(body.category, 50),
      condition: clean(body.condition, 200),
      approximate_area: clean(body.approximate_area, 100),
      dimensions: clean(body.dimensions, 200) || null,
      floor_elevator: clean(body.floor_elevator, 300) || null,
      availability: clean(body.availability, 300),
      image_url: clean(body.image_url, 1000) || null,
      contact: clean(body.contact, 300),
      needs_service: clean(body.needs_service, 100) || null,
      policy_version: POLICY_VERSION,
    });
    await notifyCommunitySubmission({
      kind: '物品发布',
      contact: item.contact,
      summary: `${item.title}；${item.approximate_area}；${item.condition}`,
      recordId: item.id,
    }).catch(error => console.error('[community-notify]', (error as Error).message));
    return noStoreJson({ item: { id: item.id, status: item.status } }, { status: 201 });
  } catch {
    return noStoreJson({ error: '发布暂时未保存，请稍后再试' }, { status: 503 });
  }
}
