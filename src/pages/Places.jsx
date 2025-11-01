import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { listPlaces, listShops, listFoods, addPlace, updatePlace, deletePlace, seedIfEmpty } from '../storage/db.js'
import { formatPrice } from '../utils/format.js'
import { getSettings } from '../storage/settings.js'
import Modal from '../components/Modal.jsx'
import SearchBox from '../components/SearchBox.jsx'
import { ToastContainer, useToast } from '../components/Toast.jsx'

export default function Places() {
    const [items, setItems] = useState([])
    const [shops, setShops] = useState([])
    const [foods, setFoods] = useState([])
    const [search, setSearch] = useState('')
    const [modalOpen, setModalOpen] = useState(false)
    const [editingItem, setEditingItem] = useState(null)
    const [form, setForm] = useState({ name: '', address: '', city: '', state: '' })
    const { toasts, addToast } = useToast()
    const [sortKey, setSortKey] = useState('name')
    const [sortAsc, setSortAsc] = useState(true)
    const [filterState, setFilterState] = useState('')
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
        setItems(listPlaces())
        setShops(listShops())
        setFoods(listFoods())
    }

    const filtered = useMemo(() => {
        let result = items.filter((p) => {
            const q = search.toLowerCase()
            const matchSearch = search === '' ||
                (p.name || '').toLowerCase().includes(q) ||
                (p.city || '').toLowerCase().includes(q) ||
                (p.state || '').toLowerCase().includes(q) ||
                (p.address || '').toLowerCase().includes(q)
            const matchState = !filterState || p.state === filterState
            return matchSearch && matchState
        })
        result.sort((a, b) => {
            const aVal = a[sortKey] || ''
            const bVal = b[sortKey] || ''
            return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
        })
        return result
    }, [items, search, filterState, sortKey, sortAsc])

    function openAddModal() {
        setEditingItem(null)
        setForm({ name: '', address: '', city: '', state: '' })
        setModalOpen(true)
    }

    function openEditModal(item) {
        setEditingItem(item)
        setForm({ name: item.name, address: item.address, city: item.city, state: item.state || '' })
        setModalOpen(true)
    }

    function onSubmit(e) {
        e.preventDefault()
        if (!form.name.trim()) {
            addToast('Name is required', 'error')
            return
        }
        if (editingItem) {
            updatePlace(editingItem.id, form)
            addToast('Place updated successfully!', 'success')
        } else {
            addPlace(form)
            addToast('Place added successfully!', 'success')
        }
        setModalOpen(false)
        reload()
    }

    function handleDelete(item) {
        if (confirm(`Delete "${item.name}"? This will also delete associated shops and foods.`)) {
            deletePlace(item.id)
            addToast('Place deleted successfully!', 'success')
            reload()
        }
    }

    function toggleSort(key) {
        if (sortKey === key) {
            setSortAsc(!sortAsc)
        } else {
            setSortKey(key)
            setSortAsc(true)
        }
    }

    return (
        <div className="space-y-6">
            <ToastContainer toasts={toasts} />

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Places</h1>
                    <p className="text-gray-600 mt-1">Manage locations and areas</p>
                </div>
                <button onClick={openAddModal} className="btn-primary">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Place
                </button>
            </div>

            <div className="flex gap-4 items-center flex-wrap">
                <div className="flex-1">
                    <SearchBox value={search} onChange={setSearch} placeholder="Search places..." />
                </div>
                <select
                    className="input w-48"
                    value={filterState}
                    onChange={(e) => setFilterState(e.target.value)}
                >
                    <option value="">All states</option>
                    {Array.from(new Set(items.map(p => p.state).filter(Boolean))).sort().map(s => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>
                <div className="text-sm text-gray-600">
                    {filtered.length} of {items.length} places
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
                                ? ['Name', 'Address', 'City', 'State', 'Shops', 'Foods', 'AvgRating', 'AvgPrice', 'Currency', 'AvgPriceFormatted']
                                : ['Name', 'Address', 'City', 'State', 'Shops', 'Foods', 'AvgRating', 'AvgPrice']
                            const rows = filtered.map(p => {
                                const placeShops = shops.filter(s => s.placeId === p.id)
                                const shopCount = placeShops.length
                                const foodInPlace = foods.filter(f => placeShops.some(s => s.id === f.shopId))
                                const foodCount = foodInPlace.length
                                const avgRating = foodCount ? (foodInPlace.reduce((a, f) => a + (f.rating || 0), 0) / foodCount) : 0
                                const nums = foodInPlace.map(f => Number(f.price)).filter(n => !isNaN(n))
                                const avgPrice = nums.length ? (nums.reduce((a, b) => a + b, 0) / nums.length) : 0
                                const base = {
                                    Name: p.name,
                                    Address: p.address || '',
                                    City: p.city || '',
                                    State: p.state || '',
                                    Shops: shopCount,
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
                            a.download = 'places.csv'
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
                            <SortableHeader label="City" sortKey="city" current={sortKey} asc={sortAsc} onClick={toggleSort} />
                            <SortableHeader label="State" sortKey="state" current={sortKey} asc={sortAsc} onClick={toggleSort} />
                            <th>Shops</th>
                            <th>Foods</th>
                            <th className="w-20">Map</th>
                            <th className="w-32">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((p, idx) => {
                            const placeShops = shops.filter((s) => s.placeId === p.id)
                            const shopCount = placeShops.length
                            const foodInPlace = foods.filter((f) => placeShops.some((s) => s.id === f.shopId))
                            const foodCount = foodInPlace.length
                            const avgRating = foodCount ? (foodInPlace.reduce((a, f) => a + (f.rating || 0), 0) / foodCount) : 0
                            const avgPriceNum = (() => { const ns = foodInPlace.map(f => Number(f.price)).filter(n => !isNaN(n)); return ns.length ? (ns.reduce((a, b) => a + b, 0) / ns.length) : 0 })()
                            return (
                                <tr key={p.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className="font-medium text-gray-900">
                                        {p.name}
                                        {foodCount > 0 && (
                                            <div className="text-xs text-gray-500">{avgRating ? `${avgRating.toFixed(1)}★` : '—'} {avgPriceNum ? `• ${formatPrice(avgPriceNum)}` : ''}</div>
                                        )}
                                    </td>
                                    <td className="text-gray-600">{p.address || '—'}</td>
                                    <td className="text-gray-600">{p.city || '—'}</td>
                                    <td className="text-gray-600">{p.state || '—'}</td>
                                    <td className="text-gray-700">{shopCount}</td>
                                    <td className="text-gray-700">{foodCount}</td>
                                    <td>
                                        {(p.address || p.city || p.name) ? (
                                            <a
                                                className="text-blue-600 hover:text-blue-800 underline"
                                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([p.name, p.address, p.city, p.state].filter(Boolean).join(' '))}`}
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
                                        <button className="btn-sm" onClick={() => openEditModal(p)}>Edit</button>
                                        <button className="btn-danger-sm" onClick={() => handleDelete(p)}>Delete</button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
                {filtered.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        {search ? 'No places found matching your search' : 'No places yet. Add one to get started!'}
                    </div>
                )}
            </div>

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingItem ? 'Edit Place' : 'Add Place'}>
                <form onSubmit={onSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                        <input
                            className="input"
                            placeholder="Enter place name"
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                        <input
                            className="input"
                            placeholder="Enter city"
                            value={form.city}
                            onChange={(e) => setForm({ ...form, city: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                        <input
                            className="input"
                            placeholder="Enter state / region"
                            value={form.state}
                            onChange={(e) => setForm({ ...form, state: e.target.value })}
                        />
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
        <th
            className="cursor-pointer hover:bg-gray-100 transition-colors select-none"
            onClick={() => onClick(sortKey)}
        >
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
} function Row({ item, onChange }) {
    const [edit, setEdit] = useState(false)
    const [data, setData] = useState(item)
    useEffect(() => setData(item), [item.id])
    return (
        <tr>
            <td>{edit ? <input className="input" value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} /> : item.name}</td>
            <td>{edit ? <input className="input" value={data.address} onChange={(e) => setData({ ...data, address: e.target.value })} /> : item.address}</td>
            <td>{edit ? <input className="input" value={data.city} onChange={(e) => setData({ ...data, city: e.target.value })} /> : item.city}</td>
            <td className="space-x-2">
                {edit ? (
                    <>
                        <button className="btn" onClick={() => { updatePlace(item.id, data); setEdit(false); onChange() }}>Save</button>
                        <button className="btn" onClick={() => setEdit(false)}>Cancel</button>
                    </>
                ) : (
                    <>
                        <button className="btn" onClick={() => setEdit(true)}>Edit</button>
                        <button className="btn-danger" onClick={() => { deletePlace(item.id); onChange() }}>Delete</button>
                    </>
                )}
            </td>
        </tr>
    )
}
