import { cors, json, serviceClient, stripeClient } from '../_shared/util.ts';

type Sub = {
  id: string;
  customer: string | { id: string; metadata?: Record<string, string> };
  status: string;
  current_period_end: number;
  metadata?: Record<string, string>;
};

function mapStatus(status: string): string {
  if (status === 'active' || status === 'trialing') return 'active';
  if (status === 'past_due') return 'past_due';
  return 'canceled';
}

async function resolveUserId(sub: Sub): Promise<string | null> {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  const fromMeta = sub.metadata?.supabase_user_id
    || (typeof sub.customer === 'object' ? sub.customer.metadata?.supabase_user_id : null);
  if (fromMeta) return fromMeta;
  const sb = serviceClient();
  const { data } = await sb
    .from('memberships')
    .select('user_id')
    .or(`stripe_subscription_id.eq.${sub.id},stripe_customer_id.eq.${customerId}`)
    .maybeSingle();
  return data?.user_id || null;
}

async function applySubscription(sub: Sub) {
  const userId = await resolveUserId(sub);
  if (!userId) return;
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  await serviceClient().from('memberships').upsert({
    user_id: userId,
    status: mapStatus(sub.status),
    plan: 'annual',
    current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    updated_at: new Date().toISOString(),
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  const signature = req.headers.get('stripe-signature');
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!signature || !secret) return json({ error: 'webhook not configured' }, 500);

  const stripe = stripeClient();
  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(await req.text(), signature, secret);
  } catch {
    return json({ error: 'invalid signature' }, 400);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as { subscription?: string | null };
      if (session.subscription) {
        await applySubscription(await stripe.subscriptions.retrieve(session.subscription) as unknown as Sub);
      }
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await applySubscription(event.data.object as unknown as Sub);
      break;
    case 'invoice.payment_failed': {
      const invoice = event.data.object as { subscription?: string | null };
      if (invoice.subscription) {
        const sub = await stripe.subscriptions.retrieve(invoice.subscription) as unknown as Sub;
        await applySubscription({ ...sub, status: 'past_due' });
      }
      break;
    }
    default:
      break;
  }

  return json({ received: true });
});