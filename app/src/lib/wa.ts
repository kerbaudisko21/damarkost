/** Ubah nomor lokal ke format internasional untuk wa.me: '0812-3456' → '628123456' */
export function waNumber(phone: string): string {
  let d = phone.replace(/\D/g, '')
  if (d.startsWith('0')) d = '62' + d.slice(1)
  else if (d.startsWith('8')) d = '62' + d
  return d
}

export function waLink(phone: string, text: string): string {
  const n = waNumber(phone)
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`
}

export function openWhatsApp(phone: string, text: string): void {
  window.open(waLink(phone, text), '_blank', 'noopener')
}
