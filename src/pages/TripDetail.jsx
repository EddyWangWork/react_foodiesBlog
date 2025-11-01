import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { listTrips, listPlaces, listShops, listFoods } from '../storage/db.js'
import Rating from '../components/Rating.jsx'
import { formatPrice } from '../utils/format.js'
import Modal from '../components/Modal.jsx'

export default function TripDetail() {
    const { id } = useParams()
    const { trip, places, shops, foods, allTrips } = useMemo(() => {
        const trips = listTrips()
        return { trip: trips.find(t => t.id === id), places: listPlaces(), shops: listShops(), foods: listFoods(), allTrips: trips }
    }, [id])

    if (!trip) {
        return (
            <div className="space-y-4">
                <Link className="text-indigo-600 hover:underline" to="/trips">← Back to Trips</Link>
                <div className="text-gray-500">Trip not found.</div>
            </div>
        )
    }

    const tripPlaces = places.filter(p => (trip.placeIds || []).includes(p.id))
    const tripShops = shops.filter(s => (trip.shopIds || []).includes(s.id))
    const tripFoods = foods.filter(f => (trip.foodIds || []).includes(f.id))
    const totalExpense = (trip.expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0)
    const children = allTrips.filter(t => t.parentId === trip.id)
    const parent = trip.parentId ? allTrips.find(t => t.id === trip.parentId) : null
    const budget = trip.budget ?? 0
    const remaining = budget - totalExpense
    const byCategory = (trip.expenses || []).reduce((acc, e) => {
        const k = (e.category || 'Other')
        acc[k] = (acc[k] || 0) + (Number(e.amount) || 0)
        return acc
    }, {})
    const childrenTotals = children.map(ch => (ch.expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0))
    const childrenTotalExpense = childrenTotals.reduce((a, b) => a + b, 0)
    const combinedTotalExpense = totalExpense + childrenTotalExpense
    const combinedByCategory = children.reduce((acc, ch) => {
        for (const e of (ch.expenses || [])) {
            const k = (e.category || 'Other')
            acc[k] = (acc[k] || 0) + (Number(e.amount) || 0)
        }
        return acc
    }, { ...byCategory })

    function nameBy(type, id) {
        if (!id) return ''
        if (type === 'food') return foods.find(f => f.id === id)?.name || ''
        if (type === 'shop') return shops.find(s => s.id === id)?.name || ''
        if (type === 'place') return places.find(p => p.id === id)?.name || ''
        return ''
    }

    const timelineSorted = [...(trip.timeline || [])].sort((a, b) => (a.time || '').localeCompare(b.time || ''))

    const [preview, setPreview] = useState(null)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <Link className="text-indigo-600 hover:underline" to="/trips">← Back to Trips</Link>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">{trip.title}</h1>
                    <div className="text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-3">
                        <span>📅 {trip.date || '—'}</span>
                        <span>•</span>
                        <Rating value={trip.rating || 0} />
                        {parent && (
                            <>
                                <span>•</span>
                                <span className="text-sm">Part of: <Link className="text-indigo-600 hover:underline" to={`/trips/${parent.id}`}>{parent.title}</Link></span>
                            </>
                        )}
                    </div>
                </div>
                <div className="flex gap-2">
                    <button className="btn" onClick={() => window.print()} title="Print trip">Print</button>
                    <button className="btn" onClick={() => exportTripJSON(trip)} title="Export JSON">Export JSON</button>
                </div>
            </div>

            {trip.description && (
                <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-5">
                    <h2 className="text-lg font-semibold mb-2">Description</h2>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{trip.description}</p>
                </div>
            )}

            {(trip.tags || []).length > 0 && (
                <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-5">
                    <h2 className="text-lg font-semibold mb-3">Tags</h2>
                    <div className="flex flex-wrap gap-2">
                        {(trip.tags || []).map((t, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border dark:border-gray-700">#{t}</span>
                        ))}
                    </div>
                </div>
            )}

            {children.length > 0 && (
                <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-5">
                    <h2 className="text-lg font-semibold mb-3">Overview</h2>
                    <div className="flex flex-wrap gap-6 text-sm text-gray-700 dark:text-gray-300">
                        <span>Entries: <strong>{children.length}</strong></span>
                        <span>Used (parent): <strong>{formatPrice(totalExpense)}</strong></span>
                        <span>Used (entries): <strong>{formatPrice(childrenTotalExpense)}</strong></span>
                        <span>Total Used: <strong>{formatPrice(combinedTotalExpense)}</strong></span>
                        {budget > 0 && (
                            <span>Remaining vs budget: <strong className={`${(budget - combinedTotalExpense) < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatPrice(budget - combinedTotalExpense)}</strong></span>
                        )}
                    </div>
                    {Object.keys(combinedByCategory).length > 0 && (
                        <div className="mt-4">
                            <h3 className="font-semibold mb-2">Total by Category</h3>
                            <ul className="text-sm text-gray-700 dark:text-gray-300 list-disc pl-5">
                                {Object.entries(combinedByCategory).map(([cat, amt]) => (
                                    <li key={cat}>{cat}: {formatPrice(amt)}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {children.length > 0 && (
                <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-5">
                    <h2 className="text-lg font-semibold mb-3">Journal Entries</h2>
                    <ul className="divide-y">
                        {children.map(ch => {
                            const chTotal = (ch.expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0)
                            return (
                                <li key={ch.id} className="py-2 text-sm flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                        <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{ch.title}</div>
                                        <div className="text-gray-500 dark:text-gray-400">📅 {ch.date || '—'} • ⭐ {ch.rating || 0} • 💵 {formatPrice(chTotal)}</div>
                                    </div>
                                    <Link className="btn-sm btn-secondary" to={`/trips/${ch.id}`}>View</Link>
                                </li>
                            )
                        })}
                    </ul>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-5">
                    <h2 className="text-lg font-semibold mb-3">Places</h2>
                    {tripPlaces.length ? (
                        <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300">
                            {tripPlaces.map(p => (
                                <li key={p.id}>
                                    {p.name} {p.city ? `• ${p.city}` : ''}
                                    <a className="ml-2 text-indigo-600 hover:underline" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.name} ${p.city || ''}`)}`} target="_blank" rel="noreferrer">Open in Maps</a>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-gray-500">—</p>}
                </div>
                <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-5">
                    <h2 className="text-lg font-semibold mb-3">Shops</h2>
                    {tripShops.length ? (
                        <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300">
                            {tripShops.map(s => (
                                <li key={s.id}>
                                    {s.name}
                                    <a className="ml-2 text-indigo-600 hover:underline" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.name)}`} target="_blank" rel="noreferrer">Open in Maps</a>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-gray-500">—</p>}
                </div>
            </div>

            <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-5">
                <h2 className="text-lg font-semibold mb-3">Foods</h2>
                {tripFoods.length ? (
                    <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300">
                        {tripFoods.map(f => (<li key={f.id}>{f.name}</li>))}
                    </ul>
                ) : <p className="text-gray-500">—</p>}
            </div>

            {(trip.photos || []).length > 0 && (
                <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-5">
                    <h2 className="text-lg font-semibold mb-3">Photos</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {trip.photos.map((url, i) => (
                            <img
                                key={i}
                                src={url}
                                alt="Trip"
                                className="aspect-square object-cover rounded shadow cursor-zoom-in"
                                onClick={() => setPreview({ url, title: `Photo ${i + 1}` })}
                            />
                        ))}
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-5">
                <h2 className="text-lg font-semibold mb-3">Timeline</h2>
                {timelineSorted.length ? (
                    <ul className="divide-y">
                        {timelineSorted.map((it, idx) => (
                            <li key={idx} className="py-2 text-sm flex items-start gap-3">
                                <span className="text-gray-500 w-16">{it.time || '—'}</span>
                                <div className="min-w-0">
                                    <div className="font-medium text-gray-900 dark:text-gray-100">{it.title}</div>
                                    <div className="text-gray-500 dark:text-gray-400">
                                        {it.note}
                                        {it.placeId && <span className="ml-2">• 📍 {nameBy('place', it.placeId)}</span>}
                                        {it.shopId && <span className="ml-2">• 🏪 {nameBy('shop', it.shopId)}</span>}
                                        {it.foodId && <span className="ml-2">• 🍽️ {nameBy('food', it.foodId)}</span>}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-gray-500">—</p>}
            </div>

            {children.length > 0 && (
                <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-5">
                    <h2 className="text-lg font-semibold mb-3">Timeline by Day</h2>
                    <div className="space-y-4">
                        {[...children].sort((a, b) => (a.date || '').localeCompare(b.date || '')).map((ch) => {
                            const chTimeline = [...(ch.timeline || [])].sort((a, b) => (a.time || '').localeCompare(b.time || ''))
                            if (chTimeline.length === 0) return null
                            return (
                                <div key={ch.id}>
                                    <div className="font-semibold text-gray-900 dark:text-gray-100">{ch.date || '—'} • {ch.title}</div>
                                    <ul className="divide-y mt-1">
                                        {chTimeline.map((it, idx) => (
                                            <li key={idx} className="py-2 text-sm flex items-start gap-3">
                                                <span className="text-gray-500 w-16">{it.time || '—'}</span>
                                                <div className="min-w-0">
                                                    <div className="font-medium text-gray-900 dark:text-gray-100">{it.title}</div>
                                                    <div className="text-gray-500 dark:text-gray-400">
                                                        {it.note}
                                                        {it.placeId && <span className="ml-2">• 📍 {nameBy('place', it.placeId)}</span>}
                                                        {it.shopId && <span className="ml-2">• 🏪 {nameBy('shop', it.shopId)}</span>}
                                                        {it.foodId && <span className="ml-2">• 🍽️ {nameBy('food', it.foodId)}</span>}
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-5">
                <h2 className="text-lg font-semibold mb-3">Activities</h2>
                {(trip.activities || []).length ? (
                    <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300">
                        {(trip.activities || []).map((it, idx) => (
                            <li key={idx}>
                                <div className="font-medium">{it.title}</div>
                                {it.note && <div className="text-gray-500 dark:text-gray-400">{it.note}</div>}
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-gray-500">—</p>}
            </div>

            <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-5">
                <h2 className="text-lg font-semibold mb-3">Expenses</h2>
                <div className="flex flex-wrap items-center gap-4 mb-3 text-sm">
                    {budget > 0 && (
                        <>
                            <span className="font-medium">Budget: {formatPrice(budget)}</span>
                            <span>Used: {formatPrice(totalExpense)}</span>
                            <span className={`${remaining < 0 ? 'text-red-600' : 'text-emerald-600'} font-medium`}>Remaining: {formatPrice(remaining)}</span>
                        </>
                    )}
                </div>
                {(trip.expenses || []).length ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-gray-500">
                                    <th className="py-2">Label</th>
                                    <th className="py-2">Category</th>
                                    <th className="py-2">Linked</th>
                                    <th className="py-2 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(trip.expenses || []).map((e, i) => (
                                    <tr key={i} className="border-t dark:border-gray-800">
                                        <td className="py-2">{e.label}</td>
                                        <td className="py-2">{e.category || '—'}</td>
                                        <td className="py-2">
                                            {e.relatedType ? `${e.relatedType}: ${nameBy(e.relatedType, e.relatedId)}` : '—'}
                                        </td>
                                        <td className="py-2 text-right font-medium">{formatPrice(Number(e.amount) || 0)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t dark:border-gray-800">
                                    <td colSpan={3} className="py-2 text-right font-semibold">Total</td>
                                    <td className="py-2 text-right font-semibold">{formatPrice(totalExpense)}</td>
                                </tr>
                            </tfoot>
                        </table>
                        {Object.keys(byCategory).length > 0 && (
                            <div className="mt-4">
                                <h3 className="font-semibold mb-2">By Category</h3>
                                <ul className="text-sm text-gray-700 dark:text-gray-300 list-disc pl-5">
                                    {Object.entries(byCategory).map(([cat, amt]) => (
                                        <li key={cat}>{cat}: {formatPrice(amt)}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                ) : <p className="text-gray-500">—</p>}
            </div>
            <Modal isOpen={!!preview} onClose={() => setPreview(null)} title={preview?.title || 'Preview'}>
                {preview && (
                    <div className="flex items-center justify-center">
                        <img src={preview.url} alt={preview.title} className="max-h-[70vh] rounded shadow" />
                    </div>
                )}
            </Modal>
        </div>
    )
}

function exportTripJSON(trip) {
    try {
        const blob = new Blob([JSON.stringify(trip, null, 2)], { type: 'application/json;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${(trip.title || 'trip').replace(/[^a-z0-9]+/gi, '_')}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    } catch {
        alert('Failed to export')
    }
}
