const KEY = 'foodiesblog:settings'

const DEFAULTS = {
    currency: 'VND',
    locale: 'vi-VN',
    priceFractionDigits: 0,
    defaultPageSize: 10,
}

export function getSettings() {
    try {
        const raw = localStorage.getItem(KEY)
        if (!raw) return { ...DEFAULTS }
        const parsed = JSON.parse(raw)
        return { ...DEFAULTS, ...parsed }
    } catch (_) {
        return { ...DEFAULTS }
    }
}

export function saveSettings(partial) {
    const current = getSettings()
    const next = { ...current, ...partial }
    localStorage.setItem(KEY, JSON.stringify(next))
    return next
}

export function resetSettings() {
    localStorage.removeItem(KEY)
    return { ...DEFAULTS }
}
