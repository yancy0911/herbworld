export const runtime = 'nodejs';

export async function POST() {
  return Response.json(
    {
      error: '自动法律、税务、移民和投资问答尚未开放。此类问题应咨询相应持牌专业人士。',
    },
    { status: 410 },
  );
}
