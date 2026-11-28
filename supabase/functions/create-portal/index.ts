import { cors, json, requireUser, serviceClient, stripeClient } from '../_shared/util.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const user = await requireUser(req);
  if (!user) return json({ error: 'unauthorized' }, 401);

  const siteUrl = (Deno.env.get('SITE_URL') || '').replace(/\/+$/, '');
  const { data: membership } = await serviceClient()
    .from('memberships')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership?.stripe_customer_id) return json({ error: 'no billing customer' }, 400);

  const session = await stripeClient().billingPortal.sessions.create({
    customer: membership.stripe_customer_id,
    return_url: `${siteUrl}/#/records`,
  });

  return json({ url: session.url });
});