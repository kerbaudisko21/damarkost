// Supabase Edge Function (Deno) — dipanggil pg_cron tiap 08:00 WIB.
// Mengirim 1 notifikasi ringkas ke setiap iPhone pemilik yang berlangganan push.
// Secrets yang dibutuhkan (supabase secrets set ...): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3'

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT')!, Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!)

const jakartaToday = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10)
const addDays = (d: string, n: number) => new Date(Date.parse(d) + n * 86400_000).toISOString().slice(0, 10)

Deno.serve(async (req) => {
  if (req.headers.get('Authorization') !== `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`) return new Response('forbidden', { status: 403 })
  const today = jakartaToday(), tomorrow = addDays(today, 1)
  const { data: owners } = await sb.from('property').select('owner_id, name, lang')
  let sent = 0
  for (const p of owners ?? []) {
    const en = p.lang === 'en'
    const { data: bills } = await sb.from('v_invoice_status').select('due_date, state').eq('owner_id', p.owner_id).neq('state', 'paid')
    const late = (bills ?? []).filter((b) => b.state === 'late').length
    const dueSoon = (bills ?? []).filter((b) => b.state !== 'late' && (b.due_date === today || b.due_date === tomorrow)).length
    const { data: ins } = await sb.from('booking').select('id').eq('owner_id', p.owner_id).eq('check_in', today).neq('status', 'cancelled')
    const { data: outs } = await sb.from('booking').select('id').eq('owner_id', p.owner_id).eq('check_out', today).eq('status', 'in')
    const lines = [
      late && (en ? `${late} bill(s) overdue` : `${late} tagihan telat`),
      dueSoon && (en ? `${dueSoon} due today/tomorrow` : `${dueSoon} jatuh tempo hari ini/besok`),
      ins?.length && (en ? `${ins.length} homestay check-in today` : `${ins.length} tamu check-in hari ini`),
      outs?.length && (en ? `${outs.length} check-out today` : `${outs.length} tamu check-out hari ini`),
    ].filter(Boolean)
    if (!lines.length) continue
    const payload = JSON.stringify({ title: p.name, body: lines.join(' · '), url: late || dueSoon ? '/#/tagihan' : '/#/homestay', badge: late + dueSoon })
    const { data: subs } = await sb.from('push_subscription').select('id, endpoint, p256dh, auth').eq('owner_id', p.owner_id)
    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)
        sent++
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode
        if (code === 404 || code === 410) await sb.from('push_subscription').delete().eq('id', s.id) // langganan kedaluwarsa
      }
    }
  }
  return Response.json({ ok: true, sent })
})
