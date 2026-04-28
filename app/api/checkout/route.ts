import Stripe from 'stripe';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function POST(_req: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) return new Response('Missing STRIPE_SECRET_KEY', { status: 500 });

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2026-04-22.dahlia',
  });

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          product_data: { name: 'AI Advisor Pro' },
          unit_amount: 990,
        },
      },
    ],
    success_url: 'https://herbworld.app/success',
    cancel_url: 'https://herbworld.app/',
  });

  return Response.json({ url: session.url });
}

