import { useMemo } from 'react'
import { getAll } from '../storage/db.js'
import { formatPrice } from '../utils/format.js'
import { getSettings } from '../storage/settings.js'

export default function Report() {
    const { places, shops, foods } = useMemo(() => getAll(), [])
    const settings = getSettings()

    const favorites = foods.filter(f => !!f.favorite)
    const avgRating = foods.length ? (foods.reduce((s, f) => s + (f.rating || 0), 0) / foods.length) : 0
    const byKind = foods.reduce((acc, f) => { acc[f.kind] = (acc[f.kind] || 0) + 1; return acc }, {})
    const avgPrice = (() => { const ns = foods.map(f => Number(f.price)).filter(n => !isNaN(n)); return ns.length ? (ns.reduce((a, b) => a + b, 0) / ns.length) : 0 })()

    function onPrint() { window.print() }

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between print:hidden">
                <h1 className="text-2xl font-bold">Report</h1>
                <button className="btn" onClick={onPrint}>Print</button>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 print:text-black/70">
                Prices shown in {settings.currency} • Locale: {settings.locale} • Fraction digits: {settings.priceFractionDigits}
            </div>

            <section>
                <h2 className="text-lg font-semibold mb-2">Overview</h2>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <Card label="Places" value={places.length} />
                    <Card label="Shops" value={shops.length} />
                    <Card label="Foods" value={foods.length} />
                    <Card label="Favorites" value={favorites.length} />
                </div>
            </section>

            <section>
                <h2 className="text-lg font-semibold mb-2">Averages</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Card label="Avg Rating" value={avgRating.toFixed(1)} />
                    <Card label="Avg Price" value={avgPrice ? formatPrice(avgPrice) : '—'} />
                </div>
            </section>

            <section>
                <h2 className="text-lg font-semibold mb-2">Foods by Kind</h2>
                <table className="w-full text-sm border">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="text-left p-2 border">Kind</th>
                            <th className="text-left p-2 border">Count</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(byKind).map(([k, c]) => (
                            <tr key={k}>
                                <td className="p-2 border capitalize">{k}</td>
                                <td className="p-2 border">{c}</td>
                            </tr>
                        ))}
                        {Object.keys(byKind).length === 0 && (
                            <tr><td className="p-2 border" colSpan={2}>No data</td></tr>
                        )}
                    </tbody>
                </table>
            </section>

            <section>
                <h2 className="text-lg font-semibold mb-2">Foods</h2>
                <table className="w-full text-sm border">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="text-left p-2 border">Name</th>
                            <th className="text-left p-2 border">Kind</th>
                            <th className="text-left p-2 border">Shop</th>
                            <th className="text-left p-2 border">Rating</th>
                            <th className="text-left p-2 border">Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        {foods.map(f => {
                            const s = shops.find(x => x.id === f.shopId)
                            return (
                                <tr key={f.id}>
                                    <td className="p-2 border">{f.name}</td>
                                    <td className="p-2 border capitalize">{f.kind}</td>
                                    <td className="p-2 border">{s?.name || '—'}</td>
                                    <td className="p-2 border">{f.rating || 0}</td>
                                    <td className="p-2 border">{f.price ? formatPrice(f.price) : '—'}</td>
                                </tr>
                            )
                        })}
                        {foods.length === 0 && (
                            <tr><td className="p-2 border" colSpan={5}>No foods</td></tr>
                        )}
                    </tbody>
                </table>
            </section>
        </div>
    )
}

function Card({ label, value }) {
    return (
        <div className="border rounded p-4">
            <div className="text-xs text-gray-500">{label}</div>
            <div className="text-xl font-semibold">{value}</div>
        </div>
    )
}
