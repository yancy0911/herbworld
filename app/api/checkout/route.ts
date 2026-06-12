export const runtime = 'nodejs';

export async function POST() {
  return Response.json(
    { error: '线上支付尚未开放。请勿向任何服务者私下转账；具体事务需经平台审核并书面确认范围、价格和付款安排。' },
    { status: 410 }
  );
}
