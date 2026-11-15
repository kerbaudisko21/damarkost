import { supabase } from './supabase'

export type PushResult = 'unsupported' | 'denied' | 'local' | 'subscribed' | 'install-first'

const isStandalone = () =>
  (navigator as Navigator & { standalone?: boolean }).standalone === true || matchMedia('(display-mode: standalone)').matches
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)

export function notificationsSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator
}

export function pushState(): NotificationPermission | 'unsupported' {
  return notificationsSupported() ? Notification.permission : 'unsupported'
}

/** Angka merah di ikon aplikasi (iOS 16.4+ terpasang & izin notifikasi; Android/Chrome). */
export function setBadge(n: number): void {
  const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> }
  if (!nav.setAppBadge) return
  ;(n > 0 ? nav.setAppBadge(n) : nav.clearAppBadge?.())?.catch(() => undefined)
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

/**
 * Minta izin notifikasi lalu (bila Supabase & VAPID tersedia dan sudah login) daftarkan push
 * supaya pengingat 08:00 WIB dari cron sampai walau aplikasi tertutup.
 */
export async function enableNotifications(): Promise<PushResult> {
  if (!notificationsSupported()) return isIOS() && !isStandalone() ? 'install-first' : 'unsupported'
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') return 'denied'
  const vapid = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
  if (!supabase || !vapid) return 'local'
  const { data: session } = await supabase.auth.getSession()
  if (!session.session) return 'local'
  const reg = await navigator.serviceWorker.ready
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapid) as BufferSource }))
  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
  const { error } = await supabase.from('push_subscription').upsert({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth, user_agent: navigator.userAgent }, { onConflict: 'endpoint' })
  return error ? 'local' : 'subscribed'
}
