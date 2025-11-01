import { useEffect, useState } from 'react'
import { getSettings, saveSettings, resetSettings } from '../storage/settings.js'
import { ToastContainer, useToast } from '../components/Toast.jsx'
import { formatPrice } from '../utils/format.js'

export default function Settings() {
    const [form, setForm] = useState(getSettings())
    const { toasts, addToast } = useToast()

    useEffect(() => {
        setForm(getSettings())
    }, [])

    function onSubmit(e) {
        e.preventDefault()
        saveSettings(form)
        addToast('Settings saved', 'success')
    }

    function onReset() {
        const next = resetSettings()
        setForm(next)
        addToast('Settings reset to defaults', 'success')
    }

    return (
        <div className="space-y-6">
            <ToastContainer toasts={toasts} />
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Customize currency and locale preferences.</p>
            </div>

            <form onSubmit={onSubmit} className="bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-800 shadow-sm p-6 space-y-4 max-w-xl">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Currency</label>
                    <select
                        className="input"
                        value={form.currency}
                        onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    >
                        <option value="VND">VND - Vietnamese Dong</option>
                        <option value="USD">USD - US Dollar</option>
                        <option value="EUR">EUR - Euro</option>
                        <option value="JPY">JPY - Japanese Yen</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Locale</label>
                    <select
                        className="input"
                        value={form.locale}
                        onChange={(e) => setForm({ ...form, locale: e.target.value })}
                    >
                        <option value="vi-VN">vi-VN (Vietnamese)</option>
                        <option value="en-US">en-US (English - US)</option>
                        <option value="en-GB">en-GB (English - UK)</option>
                        <option value="ja-JP">ja-JP (Japanese)</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price fraction digits</label>
                    <select
                        className="input w-40"
                        value={form.priceFractionDigits}
                        onChange={(e) => setForm({ ...form, priceFractionDigits: Number(e.target.value) })}
                    >
                        <option value={0}>0</option>
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default page size (Foods)</label>
                    <select
                        className="input w-40"
                        value={form.defaultPageSize}
                        onChange={(e) => setForm({ ...form, defaultPageSize: Number(e.target.value) })}
                    >
                        {[5, 10, 20, 50].map(n => (
                            <option key={n} value={n}>{n}</option>
                        ))}
                    </select>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                    Preview: {formatPrice(123456.78)}
                </div>
                <div className="flex gap-2 pt-2">
                    <button type="submit" className="btn-primary">Save</button>
                    <button type="button" className="btn" onClick={onReset}>Reset</button>
                </div>
            </form>
        </div>
    )
}
