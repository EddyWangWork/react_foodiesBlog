import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { listShops, addShop, updateShop, deleteShop, listPlaces, listFoods, seedIfEmpty } from '../storage/db.js'
import { formatPrice } from '../utils/format.js'
import { getSettings } from '../storage/settings.js'
import Modal from '../components/Modal.jsx'
import SearchBox from '../components/SearchBox.jsx'
import { ToastContainer, useToast } from '../components/Toast.jsx'

export default function Shops() {
    const [items, setItems] = useState([])
    const [places, setPlaces] = useState([])
    const [foods, setFoods] = useState([])
    const [search, setSearch] = useState('')
    const [filterPlace, setFilterPlace] = useState('')
    const [filterState, setFilterState] = useState('')
    const [sortKey, setSortKey] = useState('name')
    const [sortAsc, setSortAsc] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [editingItem, setEditingItem] = useState(null)
    const [form, setForm] = useState({ name: '', address: '', placeId: '' })
    const { toasts, addToast } = useToast()
    const [csvIncludeFormatted, setCsvIncludeFormatted] = useState(true)
    const location = useLocation()

    useEffect(() => {
        seedIfEmpty()
        reload()
    }, [])

    // Sync search from global q param
    useEffect(() => {
        const q = new URLSearchParams(location.search).get('q') || ''
        setSearch(q)
    }, [location.search])

    function reload() {
        setItems(listShops())
        setPlaces(listPlaces())
        setFoods(listFoods())
    }

    const filtered = useMemo(() => {
        const base = items.filter((s) => {
            const place = places.find((p) => p.id === s.placeId)
            const q = search.toLowerCase()
            const matchSearch = search === '' ||
                (s.name || '').toLowerCase().includes(q) ||
                (s.address || '').toLowerCase().includes(q) ||
                (place?.name || '').toLowerCase().includes(q) ||
                (place?.city || '').toLowerCase().includes(q) ||
                ((place?.state || '')).toLowerCase().includes(q)
            const matchPlace = !filterPlace || s.placeId === filterPlace
            const matchState = !filterState || (place?.state === filterState)
            return matchSearch && matchPlace && matchState
        })
        const foodCountMap = base.reduce((acc, s) => {
            acc[s.id] = foods.filter((f) => f.shopId === s.id).length
            return acc
        }, {})
        base.sort((a, b) => {
            const dir = sortAsc ? 1 : -1
            if (sortKey === 'name') return dir * (a.name || '').localeCompare(b.name || '')
            if (sortKey === 'address') return dir * (a.address || '').localeCompare(b.address || '')
            if (sortKey === 'place') {
                const pa = places.find((p) => p.id === a.placeId)?.name || ''
                const pb = places.find((p) => p.id === b.placeId)?.name || ''
                return dir * pa.localeCompare(pb)
            }
            if (sortKey === 'city') {
                const ca = places.find((p) => p.id === a.placeId)?.city || ''
                const cb = places.find((p) => p.id === b.placeId)?.city || ''
                return dir * ca.localeCompare(cb)
            }
            if (sortKey === 'state') {
                const sa = places.find((p) => p.id === a.placeId)?.state || ''
                const sb = places.find((p) => p.id === b.placeId)?.state || ''
                return dir * sa.localeCompare(sb)
            }
            if (sortKey === 'foods') return dir * ((foodCountMap[a.id] || 0) - (foodCountMap[b.id] || 0))
            return 0
        })
        return base
    }, [items, foods, places, search, filterPlace, filterState, sortKey, sortAsc])

    function toggleSort(key) {
        if (sortKey === key) setSortAsc(!sortAsc)
        else { setSortKey(key); setSortAsc(true) }
    }

    function openAddModal() {
        setEditingItem(null)
        setForm({ name: '', address: '', placeId: '' })
        setModalOpen(true)
    }

    function openEditModal(item) {
        setEditingItem(item)
        setForm({ name: item.name, address: item.address, placeId: item.placeId })
        setModalOpen(true)
    }

    function onSubmit(e) {
        e.preventDefault()
        if (!form.name.trim() || !form.placeId) {
            addToast('Name and place are required', 'error')
            return
        }
        if (editingItem) {
            updateShop(editingItem.id, form)
            addToast('Shop updated successfully!', 'success')
        } else {
            addShop(form)
            addToast('Shop added successfully!', 'success')
        }
        setModalOpen(false)
        reload()
    }

    function handleDelete(item) {
        if (confirm(`Delete "${item.name}"? This will also delete associated foods.`)) {
            deleteShop(item.id)
            addToast('Shop deleted successfully!', 'success')
            reload()
        }
    }

    return (
        <div className="space-y-6">
            <ToastContainer toasts={toasts} />

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Shops</h1>
                    <p className="text-gray-600 mt-1">Manage restaurants and food establishments</p>
                </div>
                <button onClick={openAddModal} className="btn-primary">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Shop
                </button>
            </div>

            <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                    <SearchBox value={search} onChange={setSearch} placeholder="Search shops..." />
                </div>
                <select
                    className="input w-48"
                    value={filterPlace}
                    onChange={(e) => setFilterPlace(e.target.value)}
                >
                    <option value="">All places</option>
                    {places.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
                <select
                    className="input w-48"
                    value={filterState}
                    onChange={(e) => setFilterState(e.target.value)}
                >
                    <option value="">All states</option>
                    {Array.from(new Set(places.map(p => p.state).filter(Boolean))).sort().map(s => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>
                <div className="text-sm text-gray-600 self-center">
                    {filtered.length} of {items.length} shops
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                        <input type="checkbox" className="rounded" checked={csvIncludeFormatted} onChange={(e) => setCsvIncludeFormatted(e.target.checked)} />
                        CSV: include formatted
                    </label>
                    <button
                        className="btn"
                        onClick={() => {
                            const settings = getSettings()
                            const headers = csvIncludeFormatted
                                ? ['Name', 'Address', 'Place', 'City', 'State', 'Foods', 'AvgRating', 'AvgPrice', 'Currency', 'AvgPriceFormatted']
                                : ['Name', 'Address', 'Place', 'City', 'State', 'Foods', 'AvgRating', 'AvgPrice']
                            const rows = filtered.map(s => {
                                const place = places.find(p => p.id === s.placeId)
                                const fs = foods.filter(f => f.shopId === s.id)
                                const foodCount = fs.length
                                const avgRating = foodCount ? (fs.reduce((a, f) => a + (f.rating || 0), 0) / foodCount) : 0
                                const nums = fs.map(f => Number(f.price)).filter(n => !isNaN(n))
                                const avgPrice = nums.length ? (nums.reduce((a, b) => a + b, 0) / nums.length) : 0
                                const base = {
                                    Name: s.name,
                                    Address: s.address || '',
                                    Place: place?.name || '',
                                    City: place?.city || '',
                                    State: place?.state || '',
                                    Foods: foodCount,
                                    AvgRating: avgRating.toFixed(1),
                                    AvgPrice: Math.round(avgPrice)
                                }
                                return csvIncludeFormatted
                                    ? { ...base, Currency: settings.currency, AvgPriceFormatted: avgPrice ? formatPrice(avgPrice) : '' }
                                    : base
                            })
                            const esc = v => String(v ?? '').replace(/"/g, '""')
                            const csv = [
                                headers.join(','),
                                ...rows.map(r => headers.map(h => `"${esc(r[h])}"`).join(','))
                            ].join('\n')
                            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                            const url = URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = url
                            a.download = 'shops.csv'
                            a.click()
                            URL.revokeObjectURL(url)
                        }}
                    >
                        Export CSV
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                <table className="table">
                    <thead>
                        <tr>
                            <SortableHeader label="Name" sortKey="name" current={sortKey} asc={sortAsc} onClick={toggleSort} />
                            <SortableHeader label="Address" sortKey="address" current={sortKey} asc={sortAsc} onClick={toggleSort} />
                            <SortableHeader label="Place" sortKey="place" current={sortKey} asc={sortAsc} onClick={toggleSort} />
                            <SortableHeader label="City" sortKey="city" current={sortKey} asc={sortAsc} onClick={toggleSort} />
                            <SortableHeader label="State" sortKey="state" current={sortKey} asc={sortAsc} onClick={toggleSort} />
                            <SortableHeader label="Foods" sortKey="foods" current={sortKey} asc={sortAsc} onClick={toggleSort} />
                            <th className="w-20">Map</th>
                            <th className="w-32">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((s, idx) => {
                            const place = places.find((p) => p.id === s.placeId)
                            const fs = foods.filter((f) => f.shopId === s.id)
                            const foodCount = fs.length
                            const avgRating = fs.length ? (fs.reduce((a, f) => a + (f.rating || 0), 0) / fs.length) : 0
                            const avgPriceNum = (() => { const ns = fs.map(f => Number(f.price)).filter(n => !isNaN(n)); return ns.length ? (ns.reduce((a, b) => a + b, 0) / ns.length) : 0 })()
                            return (
                                <tr key={s.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className="font-medium text-gray-900">
                                        {s.name}
                                        {foodCount > 0 && (
                                            <div className="text-xs text-gray-500">{avgRating ? `${avgRating.toFixed(1)}★` : '—'} {avgPriceNum ? `• ${formatPrice(avgPriceNum)}` : ''}</div>
                                        )}
                                    </td>
                                    <td className="text-gray-600">{s.address || '—'}</td>
                                    <td className="text-gray-600">{place?.name || '—'}</td>
                                    <td className="text-gray-600">{place?.city || '—'}</td>
                                    <td className="text-gray-600">{place?.state || '—'}</td>
                                    <td className="text-gray-700">{foodCount}</td>
                                    <td>
                                        {(s.address || place?.city || place?.state || s.name) ? (
                                            <a
                                                className="text-indigo-600 dark:text-indigo-400 hover:underline"
                                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([s.name, s.address, place?.city, place?.state].filter(Boolean).join(' '))}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                title="Open in Google Maps"
                                            >
                                                Open
                                            </a>
                                        ) : (
                                            <span className="text-gray-400">—</span>
                                        )}
                                    </td>
                                    <td className="space-x-2">
                                        <button className="btn-sm" onClick={() => openEditModal(s)}>Edit</button>
                                        <button className="btn-danger-sm" onClick={() => handleDelete(s)}>Delete</button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
                {filtered.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        {search || filterPlace ? 'No shops found matching your filters' : 'No shops yet. Add one to get started!'}
                    </div>
                )}
            </div>

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingItem ? 'Edit Shop' : 'Add Shop'}>
                <form onSubmit={onSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                        <input
                            className="input"
                            placeholder="Enter shop name"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                        <input
                            className="input"
                            placeholder="Enter address"
                            value={form.address}
                            onChange={(e) => setForm({ ...form, address: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Place *</label>
                        <select
                            className="input"
                            value={form.placeId}
                            onChange={(e) => setForm({ ...form, placeId: e.target.value })}
                            required
                        >
                            <option value="">Select a place...</option>
                            {places.map((p) => (
                                <option key={p.id} value={p.id}>{p.name} ({p.city})</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex gap-2 justify-end pt-4">
                        <button type="button" className="btn" onClick={() => setModalOpen(false)}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary">
                            {editingItem ? 'Update' : 'Add'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}

function SortableHeader({ label, sortKey, current, asc, onClick }) {
    const active = current === sortKey
    return (
        <th className="cursor-pointer hover:bg-gray-100 transition-colors select-none" onClick={() => onClick(sortKey)}>
            <div className="flex items-center gap-1">
                {label}
                {active && (
                    <svg className={`w-4 h-4 transition-transform ${asc ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                )}
            </div>
        </th>
    )
}
