import { cors, json, requireUser, serviceClient, stripeClient } from '../_shared/util.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const user = await requireUser(req);
  if (!user) return json({ error: 'unauthorized' }, 401);

  const priceId = Deno.env.get('STRIPE_PRICE_ID');
  const siteUrl = (Deno.env.get('SITE_URL') || '').replace(/\/+$/, '');
  if (!priceId || !siteUrl) return json({ error: 'billing not configured' }, 500);

  const sb = serviceClient();
  const { data: membership } = await sb
    .from('memberships')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();

  const stripe = stripeClient();
  let customerId = membership?.stripe_customer_id || null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
  }

  await sb.from('memberships').upsert({
    user_id: user.id,
    stripe_customer_id: customerId,
    updated_at: new Date().toISOString(),
  });

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${siteUrl}/#/records?cloud=success`,
    cancel_url: `${siteUrl}/#/records?cloud=cancel`,
    subscription_data: { metadata: { supabase_user_id: user.id } },
  });

  return json({ url: session.url });
});