import Stripe from 'stripe';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function POST(_req: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return Response.json(
      { error: 'Missing STRIPE_SECRET_KEY. Set it in your environment (.env.local).' },
      { status: 500 }
    );
  }

  try {
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
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Stripe checkout session creation failed';
    return Response.json({ error: message }, { status: 500 });
  }
}

