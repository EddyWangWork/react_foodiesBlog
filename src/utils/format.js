import { getSettings } from '../storage/settings.js'

export function formatPrice(value, currency, locale, fractionDigits) {
    if (value === null || value === undefined || value === '') return '—'
    const num = Number(value)
    if (isNaN(num)) return String(value)
    const s = getSettings()
    const cur = currency ?? s.currency ?? 'VND'
    const loc = locale ?? s.locale ?? 'vi-VN'
    const fd = fractionDigits ?? s.priceFractionDigits ?? 0
    try {
        return num.toLocaleString(loc, { style: 'currency', currency: cur, minimumFractionDigits: fd, maximumFractionDigits: fd })
    } catch (_) {
        return num.toLocaleString(loc)
    }
}

export function formatNumber(value, locale = 'vi-VN') {
    const num = Number(value)
    if (isNaN(num)) return String(value)
    return num.toLocaleString(locale)
}
