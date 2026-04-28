import Stripe from 'stripe';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature');
  if (!signature) return new Response('Missing stripe-signature', { status: 400 });

  const rawBody = await req.text();

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) return new Response('Missing STRIPE_SECRET_KEY', { status: 500 });

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) return new Response('Missing STRIPE_WEBHOOK_SECRET', { status: 500 });

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2026-04-22.dahlia',
  });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid signature';
    return new Response(`Webhook Error: ${message}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    console.log('Payment success');
  }

  return new Response('ok', { status: 200 });
}