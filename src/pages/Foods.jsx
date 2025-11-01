import { useEffect, useMemo, useState } from 'react'
import { listFoods, addFood, updateFood, deleteFood, listShops, seedIfEmpty } from '../storage/db.js'
import Modal from '../components/Modal.jsx'
import SearchBox from '../components/SearchBox.jsx'
import { ToastContainer, useToast } from '../components/Toast.jsx'
import Rating from '../components/Rating.jsx'
import { formatPrice } from '../utils/format.js'
import { getSettings } from '../storage/settings.js'
import { useLocation } from 'react-router-dom'

const KINDS = [
    { id: 'noodle', label: '🍜 Noodle', icon: '🍜' },
    { id: 'rice', label: '🍚 Rice', icon: '🍚' },
    { id: 'soup', label: '🍲 Soup', icon: '🍲' },
    { id: 'snack', label: '🥟 Snack', icon: '🥟' },
    { id: 'drink', label: '🥤 Drink', icon: '🥤' },
    { id: 'dessert', label: '🍰 Dessert', icon: '🍰' },
]

export default function Foods() {
    const [items, setItems] = useState([])
    const [shops, setShops] = useState([])
    const [search, setSearch] = useState('')
    const [modalOpen, setModalOpen] = useState(false)
    const [editingItem, setEditingItem] = useState(null)
    const [form, setForm] = useState({ name: '', kind: 'noodle', shopId: '', price: '', favorite: false, rating: 0, imageUrl: '' })
    const [filter, setFilter] = useState({ kind: '', shopId: '', favoritesOnly: false, minRating: 0, minPrice: '', maxPrice: '' })
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(getSettings().defaultPageSize || 10)
    const [sortKey, setSortKey] = useState('name')
    const [sortAsc, setSortAsc] = useState(true)
    const [preview, setPreview] = useState(null) // { url, name }
    const [viewMode, setViewMode] = useState('table') // 'table' | 'grid'
    const [csvIncludeFormatted, setCsvIncludeFormatted] = useState(true)
    const { toasts, addToast } = useToast()
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
        setItems(listFoods())
        setShops(listShops())
    }

    function resetFilters() {
        setSearch('')
        setFilter({ kind: '', shopId: '', favoritesOnly: false, minRating: 0, minPrice: '', maxPrice: '' })
        setPage(1)
        setPageSize(getSettings().defaultPageSize || 10)
        setSortKey('name')
        setSortAsc(true)
    }

    function exportCsv() {
        const settings = getSettings()
        const rows = sorted.map((f) => {
            const shop = shops.find((s) => s.id === f.shopId)
            const priceNum = Number(f.price)
            return {
                Name: f.name,
                Kind: f.kind,
                Shop: shop?.name || '',
                Price: !isNaN(priceNum) ? priceNum : '',
                ...(csvIncludeFormatted ? { Currency: settings.currency, PriceFormatted: f.price ? formatPrice(f.price) : '' } : {}),
                Rating: f.rating || 0,
                Favorite: f.favorite ? 'yes' : 'no',
                ImageURL: f.imageUrl || '',
                CreatedAt: f.createdAt || ''
            }
        })
        const headers = Object.keys(rows[0] || { Name: '', Kind: '', Shop: '', Price: '', Currency: '', PriceFormatted: '', Rating: '', Favorite: '', ImageURL: '', CreatedAt: '' })
        const esc = (v) => String(v ?? '').replace(/"/g, '""')
        const csv = [
            headers.join(','),
            ...rows.map(r => headers.map(h => `"${esc(r[h])}"`).join(','))
        ].join('\n')
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'foods.csv'
        a.click()
        URL.revokeObjectURL(url)
    }

    const filtered = useMemo(() => {
        return items.filter((f) => {
            const matchSearch = search === '' || f.name.toLowerCase().includes(search.toLowerCase())
            const matchKind = !filter.kind || f.kind === filter.kind
            const matchShop = !filter.shopId || f.shopId === filter.shopId
            const matchRating = (f.rating || 0) >= (filter.minRating || 0)
            const priceNum = Number(f.price)
            const minOk = filter.minPrice === '' || (!isNaN(priceNum) && priceNum >= Number(filter.minPrice))
            const maxOk = filter.maxPrice === '' || (!isNaN(priceNum) && priceNum <= Number(filter.maxPrice))
            return matchSearch && matchKind && matchShop && matchRating && minOk && maxOk
        })
    }, [items, search, filter])

    // further filter favorites and paginate
    const fullyFiltered = useMemo(() => {
        return filtered.filter((f) => !filter.favoritesOnly || f.favorite)
    }, [filtered, filter])

    // sort before pagination
    const sorted = useMemo(() => {
        const arr = [...fullyFiltered]
        arr.sort((a, b) => {
            const dir = sortAsc ? 1 : -1
            if (sortKey === 'name') {
                return dir * (a.name || '').localeCompare(b.name || '')
            }
            if (sortKey === 'rating') {
                return dir * (((a.rating || 0) - (b.rating || 0)))
            }
            if (sortKey === 'price') {
                const ap = Number(a.price) || 0
                const bp = Number(b.price) || 0
                return dir * (ap - bp)
            }
            if (sortKey === 'shop') {
                const sa = shops.find((s) => s.id === a.shopId)?.name || ''
                const sb = shops.find((s) => s.id === b.shopId)?.name || ''
                return dir * sa.localeCompare(sb)
            }
            if (sortKey === 'date') {
                const da = a.createdAt ? Date.parse(a.createdAt) : 0
                const db = b.createdAt ? Date.parse(b.createdAt) : 0
                return dir * (da - db)
            }
            return 0
        })
        return arr
    }, [fullyFiltered, sortKey, sortAsc, shops])

    const total = sorted.length
    const pageCount = Math.max(1, Math.ceil(total / pageSize))
    const curPage = Math.min(page, pageCount)
    const start = (curPage - 1) * pageSize
    const pageItems = sorted.slice(start, start + pageSize)

    function toggleSort(key) {
        if (sortKey === key) setSortAsc(!sortAsc)
        else { setSortKey(key); setSortAsc(true) }
    }

    function toggleFavorite(item) {
        updateFood(item.id, { favorite: !item.favorite })
        reload()
    }

    function openAddModal() {
        setEditingItem(null)
        setForm({ name: '', kind: 'noodle', shopId: '', price: '', favorite: false, rating: 0, imageUrl: '' })
        setModalOpen(true)
    }

    function openEditModal(item) {
        setEditingItem(item)
        setForm({ name: item.name, kind: item.kind, shopId: item.shopId, price: item.price || '', favorite: !!item.favorite, rating: item.rating || 0, imageUrl: item.imageUrl || '' })
        setModalOpen(true)
    }

    function onSubmit(e) {
        e.preventDefault()
        if (!form.name.trim() || !form.shopId) {
            addToast('Name and shop are required', 'error')
            return
        }
        if (editingItem) {
            updateFood(editingItem.id, form)
            addToast('Food updated successfully!', 'success')
        } else {
            addFood(form)
            addToast('Food added successfully!', 'success')
        }
        setModalOpen(false)
        reload()
    }

    function handleDelete(item) {
        if (confirm(`Delete "${item.name}"?`)) {
            deleteFood(item.id)
            addToast('Food deleted successfully!', 'success')
            reload()
        }
    }

    return (
        <div className="space-y-6">
            <ToastContainer toasts={toasts} />

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Foods</h1>
                    <p className="text-gray-600 mt-1">Manage food items and menu entries</p>
                </div>
                <button onClick={openAddModal} className="btn-primary">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Food
                </button>
            </div>

            <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                    <SearchBox value={search} onChange={setSearch} placeholder="Search foods..." />
                </div>
                <select
                    className="input w-36"
                    value={filter.kind}
                    onChange={(e) => setFilter({ ...filter, kind: e.target.value })}
                >
                    <option value="">All kinds</option>
                    {KINDS.map((k) => (
                        <option key={k.id} value={k.id}>{k.label}</option>
                    ))}
                </select>
                <select
                    className="input w-48"
                    value={filter.shopId}
                    onChange={(e) => setFilter({ ...filter, shopId: e.target.value })}
                >
                    <option value="">All shops</option>
                    {shops.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                    <span>Min rating:</span>
                    <select
                        className="input w-24"
                        value={filter.minRating}
                        onChange={(e) => { setFilter({ ...filter, minRating: Number(e.target.value) }); setPage(1) }}
                    >
                        {[0, 1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" className="rounded" checked={filter.favoritesOnly} onChange={(e) => { setFilter({ ...filter, favoritesOnly: e.target.checked }); setPage(1) }} />
                    Favorites only
                </label>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                    <span>Price:</span>
                    <input
                        className="input w-28"
                        type="number"
                        placeholder="Min"
                        value={filter.minPrice}
                        onChange={(e) => { setFilter({ ...filter, minPrice: e.target.value }); setPage(1) }}
                    />
                    <span>-</span>
                    <input
                        className="input w-28"
                        type="number"
                        placeholder="Max"
                        value={filter.maxPrice}
                        onChange={(e) => { setFilter({ ...filter, maxPrice: e.target.value }); setPage(1) }}
                    />
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>Per page:</span>
                    <select className="input w-24" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}>
                        {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                </div>
                <div className="text-sm text-gray-600 self-center">
                    {total} items • Page {curPage}/{pageCount}
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <button type="button" className="btn" onClick={resetFilters}>Reset</button>
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                        <input type="checkbox" className="rounded" checked={csvIncludeFormatted} onChange={(e) => setCsvIncludeFormatted(e.target.checked)} />
                        CSV: include formatted
                    </label>
                    <button type="button" className="btn" onClick={exportCsv}>Export CSV</button>
                    <div className="ml-2 inline-flex rounded overflow-hidden border">
                        <button
                            type="button"
                            className={`px-3 py-2 text-sm ${viewMode === 'table' ? 'bg-indigo-600 text-white' : 'bg-white'}`}
                            onClick={() => setViewMode('table')}
                            title="Table view"
                        >
                            Table
                        </button>
                        <button
                            type="button"
                            className={`px-3 py-2 text-sm ${viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'bg-white'}`}
                            onClick={() => setViewMode('grid')}
                            title="Grid view"
                        >
                            Grid
                        </button>
                    </div>
                    <button
                        type="button"
                        className="btn"
                        onClick={() => {
                            const pool = fullyFiltered
                            if (pool.length === 0) { addToast('No items to pick from', 'error'); return }
                            const pick = pool[Math.floor(Math.random() * pool.length)]
                            const shop = shops.find(s => s.id === pick.shopId)
                            addToast(`Try: ${pick.name}${shop ? ' @ ' + shop.name : ''}`, 'success')
                        }}
                    >
                        Random Pick
                    </button>
                </div>
            </div>

            {viewMode === 'table' ? (
                <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                    <table className="table">
                        <thead>
                            <tr>
                                <SortableHeader label="Name" sortKey="name" current={sortKey} asc={sortAsc} onClick={toggleSort} />
                                <th>Kind</th>
                                <SortableHeader label="Rating" sortKey="rating" current={sortKey} asc={sortAsc} onClick={toggleSort} />
                                <SortableHeader label="Shop" sortKey="shop" current={sortKey} asc={sortAsc} onClick={toggleSort} />
                                <SortableHeader label="Price" sortKey="price" current={sortKey} asc={sortAsc} onClick={toggleSort} />
                                <th>Image</th>
                                <SortableHeader label="Added" sortKey="date" current={sortKey} asc={sortAsc} onClick={toggleSort} />
                                <th className="w-48">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pageItems.map((f, idx) => {
                                const shop = shops.find((s) => s.id === f.shopId)
                                const kind = KINDS.find((k) => k.id === f.kind)
                                return (
                                    <tr key={f.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                        <td className="font-medium text-gray-900">{f.name}</td>
                                        <td>
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                                                {kind?.icon} {kind?.label.split(' ')[1] || f.kind}
                                            </span>
                                        </td>
                                        <td>
                                            <Rating value={f.rating || 0} onChange={(v) => { updateFood(f.id, { rating: v }); reload() }} />
                                        </td>
                                        <td className="text-gray-600">
                                            {shop?.name || '—'}
                                            {shop && (
                                                <a
                                                    className="ml-2 text-indigo-600 hover:underline text-xs"
                                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([shop.name, shop.address].filter(Boolean).join(' '))}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    title="Open shop in Google Maps"
                                                >
                                                    map
                                                </a>
                                            )}
                                        </td>
                                        <td className="text-gray-600">{f.price ? formatPrice(f.price) : '—'}</td>
                                        <td>
                                            {f.imageUrl ? (
                                                <img
                                                    src={f.imageUrl}
                                                    alt={f.name}
                                                    className="w-10 h-10 object-cover rounded cursor-zoom-in hover:opacity-90"
                                                    onClick={() => setPreview({ url: f.imageUrl, name: f.name })}
                                                />
                                            ) : (
                                                <span className="text-gray-400">—</span>
                                            )}
                                        </td>
                                        <td className="text-gray-600">{f.createdAt ? new Date(f.createdAt).toLocaleDateString() : '—'}</td>
                                        <td className="space-x-2">
                                            <button className="btn-sm" title={f.favorite ? 'Unfavorite' : 'Favorite'} onClick={() => toggleFavorite(f)}>
                                                {f.favorite ? '★' : '☆'}
                                            </button>
                                            <button className="btn-sm" onClick={() => openEditModal(f)}>Edit</button>
                                            <button className="btn-sm" onClick={() => { addFood({ name: f.name + ' (copy)', kind: f.kind, shopId: f.shopId, price: f.price, favorite: f.favorite, rating: f.rating, imageUrl: f.imageUrl }); reload(); addToast('Food duplicated', 'success') }}>Duplicate</button>
                                            <button className="btn-danger-sm" onClick={() => handleDelete(f)}>Delete</button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                    {total === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            {search || filter.kind || filter.shopId || filter.favoritesOnly
                                ? 'No foods found matching your filters'
                                : 'No foods yet. Add one to get started!'}
                        </div>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pageItems.map((f) => {
                        const shop = shops.find((s) => s.id === f.shopId)
                        const kind = KINDS.find((k) => k.id === f.kind)
                        return (
                            <div key={f.id} className="bg-white rounded-lg border shadow-sm overflow-hidden">
                                {f.imageUrl ? (
                                    <img src={f.imageUrl} alt={f.name} className="w-full h-40 object-cover cursor-zoom-in" onClick={() => setPreview({ url: f.imageUrl, name: f.name })} />
                                ) : (
                                    <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400">No image</div>
                                )}
                                <div className="p-3 space-y-2">
                                    <div className="flex items-start justify-between">
                                        <div className="font-semibold text-gray-900">{f.name}</div>
                                        <button className="btn-sm" title={f.favorite ? 'Unfavorite' : 'Favorite'} onClick={() => toggleFavorite(f)}>
                                            {f.favorite ? '★' : '☆'}
                                        </button>
                                    </div>
                                    <div>
                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                                            {kind?.icon} {kind?.label.split(' ')[1] || f.kind}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm text-gray-700">
                                            {shop?.name || '—'}
                                            {shop && (
                                                <a
                                                    className="ml-2 text-indigo-600 hover:underline text-xs"
                                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([shop.name, shop.address].filter(Boolean).join(' '))}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    title="Open shop in Google Maps"
                                                >
                                                    map
                                                </a>
                                            )}
                                        </div>
                                        <div className="text-sm text-gray-700">{f.price ? formatPrice(f.price) : '—'}</div>
                                    </div>
                                    <Rating value={f.rating || 0} onChange={(v) => { updateFood(f.id, { rating: v }); reload() }} />
                                    <div className="flex items-center gap-2 pt-1">
                                        <button className="btn-sm" onClick={() => openEditModal(f)}>Edit</button>
                                        <button className="btn-sm" onClick={() => { addFood({ name: f.name + ' (copy)', kind: f.kind, shopId: f.shopId, price: f.price, favorite: f.favorite, rating: f.rating, imageUrl: f.imageUrl }); reload(); addToast('Food duplicated', 'success') }}>Duplicate</button>
                                        <button className="btn-danger-sm" onClick={() => handleDelete(f)}>Delete</button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                    {total === 0 && (
                        <div className="col-span-full text-center py-12 text-gray-500">
                            {search || filter.kind || filter.shopId || filter.favoritesOnly
                                ? 'No foods found matching your filters'
                                : 'No foods yet. Add one to get started!'}
                        </div>
                    )}
                </div>
            )}

            {pageCount > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <button className="btn" onClick={() => setPage(1)} disabled={curPage === 1}>« First</button>
                    <button className="btn" onClick={() => setPage(Math.max(1, curPage - 1))} disabled={curPage === 1}>‹ Prev</button>
                    <span className="text-sm text-gray-600">Page {curPage} of {pageCount}</span>
                    <button className="btn" onClick={() => setPage(Math.min(pageCount, curPage + 1))} disabled={curPage === pageCount}>Next ›</button>
                    <button className="btn" onClick={() => setPage(pageCount)} disabled={curPage === pageCount}>Last »</button>
                </div>
            )}

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingItem ? 'Edit Food' : 'Add Food'}>
                <form onSubmit={onSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                        <input
                            className="input"
                            placeholder="Enter food name"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Kind *</label>
                        <select
                            className="input"
                            value={form.kind}
                            onChange={(e) => setForm({ ...form, kind: e.target.value })}
                            required
                        >
                            {KINDS.map((k) => (
                                <option key={k.id} value={k.id}>{k.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Shop *</label>
                        <select
                            className="input"
                            value={form.shopId}
                            onChange={(e) => setForm({ ...form, shopId: e.target.value })}
                            required
                        >
                            <option value="">Select a shop...</option>
                            {shops.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Price (optional)</label>
                        <input
                            className="input"
                            placeholder="Enter price"
                            value={form.price}
                            onChange={(e) => setForm({ ...form, price: e.target.value })}
                        />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
                            <Rating value={form.rating} onChange={(v) => setForm({ ...form, rating: v })} />
                        </div>
                        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                            <input type="checkbox" className="rounded" checked={form.favorite} onChange={(e) => setForm({ ...form, favorite: e.target.checked })} />
                            Favorite
                        </label>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Image URL (optional)</label>
                        <input
                            className="input"
                            placeholder="https://..."
                            value={form.imageUrl}
                            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
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

            {/* Image preview modal */}
            <Modal isOpen={!!preview} onClose={() => setPreview(null)} title={preview?.name || 'Preview'}>
                {preview && (
                    <div className="flex items-center justify-center">
                        <img src={preview.url} alt={preview.name} className="max-h-[70vh] rounded shadow" />
                    </div>
                )}
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
