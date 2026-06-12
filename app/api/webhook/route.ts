export const runtime = 'nodejs';

export async function POST() {
  return Response.json({ error: 'Payment processing is not enabled.' }, { status: 410 });
}
