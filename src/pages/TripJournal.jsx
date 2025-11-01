import { useEffect, useMemo, useState, useRef } from 'react'
import { listTrips, addTrip, updateTrip, deleteTrip, listPlaces, listShops, listFoods, seedIfEmpty } from '../storage/db.js'
import Modal from '../components/Modal.jsx'
import Rating from '../components/Rating.jsx'
import { useToast } from '../components/Toast.jsx'
import SearchBox from '../components/SearchBox.jsx'
import { Link, useLocation } from 'react-router-dom'
import { formatPrice } from '../utils/format.js'

export default function TripJournal() {
    const [trips, setTrips] = useState([])
    const [places, setPlaces] = useState([])
    const [shops, setShops] = useState([])
    const [foods, setFoods] = useState([])
    const [search, setSearch] = useState('')
    const [sortKey, setSortKey] = useState('date')
    const [sortAsc, setSortAsc] = useState(false)
    const [tagFilter, setTagFilter] = useState('')
    const [hierarchy, setHierarchy] = useState(true)
    const [showParentsOnly, setShowParentsOnly] = useState(false)
    const [yearFilter, setYearFilter] = useState('')
    const [monthFilter, setMonthFilter] = useState('')
    const [showRollup, setShowRollup] = useState(() => {
        try {
            const v = localStorage.getItem('trip:rollup:visible')
            return v === null ? true : v === 'true'
        } catch { return true }
    })
    const [modalOpen, setModalOpen] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [form, setForm] = useState({
        date: '',
        title: '',
        description: '',
        placeIds: [],
        shopIds: [],
        foodIds: [],
        photos: [],
        rating: 0,
        timeline: [],
        activities: [],
        expenses: [],
    })
    const toast = useToast()
    const location = useLocation()

    useEffect(() => {
        seedIfEmpty()
        refresh()
    }, [])

    // Sync global q
    useEffect(() => {
        const q = new URLSearchParams(location.search).get('q') || ''
        setSearch(q)
    }, [location.search])

    function refresh() {
        setTrips(listTrips())
        setPlaces(listPlaces())
        setShops(listShops())
        setFoods(listFoods())
    }

    const allTags = useMemo(() => {
        const set = new Set()
        trips.forEach(t => (t.tags || []).forEach(tag => set.add(tag)))
        return Array.from(set).sort((a, b) => a.localeCompare(b))
    }, [trips])

    const filtered = useMemo(() => {
        const q = search.toLowerCase()
        const base = trips.filter((t) => {
            return (
                !q ||
                (t.title || '').toLowerCase().includes(q) ||
                (t.description || '').toLowerCase().includes(q)
            )
        })
        const byTag = tagFilter ? base.filter(t => (t.tags || []).includes(tagFilter)) : base
        // apply year/month filters
        const byDate = byTag.filter(t => {
            if (!yearFilter && !monthFilter) return true
            const d = t.date || ''
            if (!d) return false
            // date expected in YYYY-MM-DD format; safely fall back to Date parsing
            const y = d.slice(0, 4)
            const m = d.slice(5, 7)
            if (yearFilter && y !== yearFilter) return false
            if (monthFilter && m !== monthFilter) return false
            return true
        })
        byDate.sort((a, b) => {
            const dir = sortAsc ? 1 : -1
            if (sortKey === 'date') return dir * (a.date || '').localeCompare(b.date || '')
            if (sortKey === 'title') return dir * (a.title || '').localeCompare(b.title || '')
            if (sortKey === 'rating') return dir * ((a.rating || 0) - (b.rating || 0))
            return 0
        })
        return byDate
    }, [trips, search, sortKey, sortAsc, tagFilter, yearFilter, monthFilter])

    function openAdd() {
        setEditingId(null)
        setForm({
            date: new Date().toISOString().split('T')[0],
            title: '',
            description: '',
            placeIds: [],
            shopIds: [],
            foodIds: [],
            photos: [],
            rating: 0,
            timeline: [],
            activities: [],
            expenses: [],
            tags: [],
            budget: 0,
        })
        setModalOpen(true)
    }

    function openEdit(t) {
        setEditingId(t.id)
        setForm({
            date: t.date || '',
            title: t.title || '',
            description: t.description || '',
            placeIds: t.placeIds || [],
            shopIds: t.shopIds || [],
            foodIds: t.foodIds || [],
            photos: t.photos || [],
            rating: t.rating || 0,
            timeline: t.timeline || [],
            activities: t.activities || [],
            expenses: t.expenses || [],
            tags: t.tags || [],
            budget: t.budget ?? 0,
        })
        setModalOpen(true)
    }

    function handleSave() {
        if (!form.title.trim()) {
            toast.error('Title is required')
            return
        }
        try {
            if (editingId) {
                updateTrip(editingId, form)
                toast.success('Trip updated!')
            } else {
                addTrip(form)
                toast.success('Trip added!')
            }
            refresh()
            setModalOpen(false)
        } catch (e) {
            toast.error('Failed to save trip')
        }
    }

    function handleDelete(id) {
        if (!confirm('Delete this trip?')) return
        try {
            deleteTrip(id)
            toast.success('Trip deleted!')
            refresh()
        } catch (e) {
            toast.error('Failed to delete')
        }
    }

    function handleDuplicate(t) {
        const dup = { ...t, title: `${t.title} (copy)` }
        delete dup.id
        delete dup.createdAt
        try {
            addTrip(dup)
            toast.success('Trip duplicated!')
            refresh()
        } catch (e) {
            toast.error('Failed to duplicate')
        }
    }

    function togglePlace(placeId) {
        const current = form.placeIds || []
        if (current.includes(placeId)) {
            setForm((f) => ({ ...f, placeIds: current.filter((id) => id !== placeId) }))
        } else {
            setForm((f) => ({ ...f, placeIds: [...current, placeId] }))
        }
    }

    function toggleShop(shopId) {
        const current = form.shopIds || []
        if (current.includes(shopId)) {
            setForm((f) => ({ ...f, shopIds: current.filter((id) => id !== shopId) }))
        } else {
            setForm((f) => ({ ...f, shopIds: [...current, shopId] }))
        }
    }

    function toggleFood(foodId) {
        const current = form.foodIds || []
        if (current.includes(foodId)) {
            setForm((f) => ({ ...f, foodIds: current.filter((id) => id !== foodId) }))
        } else {
            setForm((f) => ({ ...f, foodIds: [...current, foodId] }))
        }
    }

    function addPhoto() {
        const url = prompt('Enter photo URL:')
        if (url) setForm((f) => ({ ...f, photos: [...(f.photos || []), url] }))
    }

    function removePhoto(url) {
        setForm((f) => ({ ...f, photos: (f.photos || []).filter((u) => u !== url) }))
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Trip Journal</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Document your culinary adventures and memorable food experiences
                    </p>
                </div>
                <button className="btn btn-primary" onClick={openAdd}>
                    + Add Trip
                </button>
            </div>

            <div className="flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[220px]">
                    <SearchBox value={search} onChange={setSearch} placeholder="Search trips..." />
                </div>
                <select className="input w-48" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
                    <option value="">Filter: All tags</option>
                    {allTags.map(tag => (<option key={tag} value={tag}>Tag: {tag}</option>))}
                </select>
                <select className="input w-40" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
                    <option value="">Year: All</option>
                    {Array.from(new Set(trips.map(t => (t.date || '').slice(0, 4)).filter(Boolean))).sort((a, b) => b - a).map(y => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>
                <select className="input w-32" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
                    <option value="">Month: All</option>
                    {[['01', 'Jan'], ['02', 'Feb'], ['03', 'Mar'], ['04', 'Apr'], ['05', 'May'], ['06', 'Jun'], ['07', 'Jul'], ['08', 'Aug'], ['09', 'Sep'], ['10', 'Oct'], ['11', 'Nov'], ['12', 'Dec']].map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                    ))}
                </select>
                <button className="btn" onClick={() => { setYearFilter(''); setMonthFilter('') }} title="Clear date filters">Clear date</button>
                <button className="btn" onClick={() => { const next = !showRollup; setShowRollup(next); try { localStorage.setItem('trip:rollup:visible', String(next)) } catch { } }} title="Toggle main trips roll-up">{showRollup ? 'Hide Roll-up' : 'Show Roll-up'}</button>
                <select className="input w-48" value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
                    <option value="date">Sort: Date</option>
                    <option value="title">Sort: Title</option>
                    <option value="rating">Sort: Rating</option>
                </select>
                <button className="btn" onClick={() => setSortAsc((v) => !v)} title="Toggle order">
                    {sortAsc ? '↑ Asc' : '↓ Desc'}
                </button>
                <button className="btn" onClick={() => setHierarchy((v) => !v)} title="Toggle hierarchy">
                    {hierarchy ? 'View: Hierarchy' : 'View: Flat'}
                </button>
                <button className="btn" onClick={() => setShowParentsOnly((v) => !v)} title="Show only main trips in flat view">
                    {showParentsOnly ? 'Only Parents: On' : 'Only Parents: Off'}
                </button>
                <button className="btn" onClick={exportTripsCSV} title="Export CSV">Export CSV</button>
                <div className="text-sm text-gray-600 dark:text-gray-400">{filtered.length} trips</div>
            </div>

            {/* Stats summary for current view */}
            <TripStats trips={filtered} allTrips={trips} />

            {/* Tag distribution (filtered) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TagDistribution trips={filtered} />
            </div>

            {/* Parent trips roll-up overview (toggleable/compact) */}
            {showRollup ? (
                <ParentsRollup trips={filtered} allTrips={trips} onCollapse={() => setShowRollup(false)} />
            ) : (
                <CompactRollup trips={filtered} allTrips={trips} onExpand={() => setShowRollup(true)} />
            )}

            {filtered.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                    No trips yet. Click <strong>+ Add Trip</strong> to start your journal.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {(
                        hierarchy
                            ? trips.filter(t => !t.parentId)
                            : (showParentsOnly ? filtered.filter(t => !t.parentId) : filtered)
                    ).map((t) => {
                        const isVisible = hierarchy ? (filtered.some(x => x.id === t.id) || filtered.some(x => x.parentId === t.id)) : true
                        if (hierarchy && !isVisible) return null
                        const tripPlaces = places.filter((p) => (t.placeIds || []).includes(p.id))
                        const tripShops = shops.filter((s) => (t.shopIds || []).includes(s.id))
                        const tripFoods = foods.filter((f) => (t.foodIds || []).includes(f.id))
                        const totalExpense = (t.expenses || []).reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
                        const hasBudget = (t.budget ?? 0) > 0
                        const remaining = (t.budget ?? 0) - totalExpense
                        const children = hierarchy ? trips.filter((c) => c.parentId === t.id) : []
                        const childrenTotal = children.reduce((s, ch) => s + (ch.expenses || []).reduce((ss, e) => ss + (Number(e.amount) || 0), 0), 0)
                        const combinedTotal = totalExpense + childrenTotal
                        return (
                            <div
                                key={t.id}
                                className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-5 shadow hover:shadow-lg transition-shadow space-y-3"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                            {t.title}
                                        </h3>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            📅 {t.date || '—'}
                                        </div>
                                    </div>
                                    <Rating value={t.rating || 0} />
                                </div>

                                {t.description && (
                                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                                        {t.description}
                                    </p>
                                )}

                                <div className="flex flex-wrap gap-2 text-xs">
                                    {tripPlaces.length > 0 && (
                                        <span className="px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300">
                                            📍 {tripPlaces.length} place{tripPlaces.length !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                    {tripShops.length > 0 && (
                                        <span className="px-2 py-1 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300">
                                            🏪 {tripShops.length} shop{tripShops.length !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                    {tripFoods.length > 0 && (
                                        <span className="px-2 py-1 rounded bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300">
                                            🍽️ {tripFoods.length} food{tripFoods.length !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                    {(t.timeline || []).length > 0 && (
                                        <span className="px-2 py-1 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
                                            🕒 {(t.timeline || []).length} event{(t.timeline || []).length !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                    {(t.activities || []).length > 0 && (
                                        <span className="px-2 py-1 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300">
                                            ✅ {(t.activities || []).length} activit{(t.activities || []).length !== 1 ? 'ies' : 'y'}
                                        </span>
                                    )}
                                    {totalExpense > 0 && (
                                        <span className="px-2 py-1 rounded bg-cyan-100 dark:bg-cyan-900/40 text-cyan-800 dark:text-cyan-300">
                                            💵 {formatPrice(totalExpense)}
                                        </span>
                                    )}
                                    {hasBudget && (
                                        <span className={`px-2 py-1 rounded ${remaining < 0 ? 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300' : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300'}`}>
                                            Budget {formatPrice(totalExpense)} / {formatPrice(t.budget)}{remaining < 0 ? ' • over' : ''}
                                        </span>
                                    )}
                                    {hierarchy && children.length > 0 && (
                                        <>
                                            <span className="px-2 py-1 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">📝 {children.length} entr{children.length === 1 ? 'y' : 'ies'}</span>
                                            <span className="px-2 py-1 rounded bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300">🧾 Total {formatPrice(combinedTotal)}</span>
                                        </>
                                    )}
                                </div>

                                {(t.tags || []).length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {(t.tags || []).map((tag, i) => (
                                            <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border dark:border-gray-700">#{tag}</span>
                                        ))}
                                    </div>
                                )}

                                {(t.photos || []).length > 0 && (
                                    <div className="flex gap-2 overflow-x-auto">
                                        {t.photos.slice(0, 3).map((url, i) => (
                                            <img
                                                key={i}
                                                src={url}
                                                alt="Trip"
                                                className="h-16 w-16 object-cover rounded shadow"
                                            />
                                        ))}
                                        {t.photos.length > 3 && (
                                            <div className="h-16 w-16 rounded bg-gray-200 dark:bg-gray-700 grid place-items-center text-xs font-medium">
                                                +{t.photos.length - 3}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex gap-2 pt-2">
                                    <Link className="btn-sm btn-secondary" to={`/trips/${t.id}`}>View</Link>
                                    <button className="btn-sm btn-secondary" onClick={() => openEdit(t)}>
                                        Edit
                                    </button>
                                    <button className="btn-sm btn-secondary" onClick={() => handleDuplicate(t)}>
                                        Duplicate
                                    </button>
                                    <button className="btn-sm text-red-600 hover:text-red-700" onClick={() => handleDelete(t.id)}>
                                        Delete
                                    </button>
                                    {hierarchy && (
                                        <button className="btn-sm btn-primary" onClick={() => { setEditingId(null); setForm({ date: new Date().toISOString().split('T')[0], title: '', description: '', placeIds: [], shopIds: [], foodIds: [], photos: [], rating: 0, timeline: [], activities: [], expenses: [], tags: [], budget: 0, parentId: t.id }); setModalOpen(true) }}>+ Add Entry</button>
                                    )}
                                </div>

                                {hierarchy && children.length > 0 && (
                                    <div className="pt-2 border-t dark:border-gray-800">
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Journal entries ({children.length})</div>
                                        <ul className="space-y-2">
                                            {[...children]
                                                .sort((a, b) => ((a.order ?? 0) - (b.order ?? 0)) || (a.date || '').localeCompare(b.date || ''))
                                                .filter(ch => filtered.some(x => x.id === ch.id))
                                                .map((ch) => {
                                                    const chTotal = (ch.expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0)
                                                    return (
                                                        <li
                                                            key={ch.id}
                                                            className="flex items-center justify-between gap-2 text-sm"
                                                            draggable
                                                            onDragStart={(e) => { e.dataTransfer.setData('text/plain', JSON.stringify({ childId: ch.id, parentId: t.id })); }}
                                                            onDragOver={(e) => e.preventDefault()}
                                                            onDrop={(e) => {
                                                                e.preventDefault()
                                                                try {
                                                                    const data = JSON.parse(e.dataTransfer.getData('text/plain') || '{}')
                                                                    if (!data.childId || data.parentId !== t.id) return
                                                                    const srcId = data.childId
                                                                    const dstId = ch.id
                                                                    if (srcId === dstId) return
                                                                    const ordered = [...children].sort((a, b) => ((a.order ?? 0) - (b.order ?? 0)) || (a.date || '').localeCompare(b.date || ''))
                                                                    const srcIdx = ordered.findIndex(c => c.id === srcId)
                                                                    const dstIdx = ordered.findIndex(c => c.id === dstId)
                                                                    if (srcIdx < 0 || dstIdx < 0) return
                                                                    const moved = ordered.splice(srcIdx, 1)[0]
                                                                    ordered.splice(dstIdx, 0, moved)
                                                                    // Persist order indices
                                                                    ordered.forEach((c, idx) => updateTrip(c.id, { order: idx }))
                                                                    refresh()
                                                                    toast.success('Reordered entries')
                                                                } catch { }
                                                            }}
                                                        >
                                                            <div className="min-w-0">
                                                                <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{ch.title}</div>
                                                                <div className="text-gray-500 dark:text-gray-400">📅 {ch.date || '—'} • ⭐ {ch.rating || 0} • 💵 {formatPrice(chTotal)}</div>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <Link className="btn-sm btn-secondary" to={`/trips/${ch.id}`}>View</Link>
                                                                <button className="btn-sm btn-secondary" onClick={() => openEdit(ch)}>Edit</button>
                                                            </div>
                                                        </li>
                                                    )
                                                })}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Trip' : 'Add Trip'}>
                <div className="space-y-4">
                    <div>
                        <label className="label">Date</label>
                        <input
                            type="date"
                            className="input"
                            value={form.date}
                            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="label">
                            Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            className="input"
                            value={form.title}
                            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                            placeholder="e.g., Hanoi Food Tour"
                        />
                    </div>
                    <div>
                        <label className="label">Parent Trip (optional)</label>
                        <select className="input" value={form.parentId || ''} onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value || null }))}>
                            <option value="">— None (Main Trip)</option>
                            {trips.filter(t => !t.parentId && t.id !== editingId).map(t => (
                                <option key={t.id} value={t.id}>{t.title}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="label">Description</label>
                        <textarea
                            className="input resize-y"
                            rows={3}
                            value={form.description}
                            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                            placeholder="Tell the story of your trip..."
                        />
                    </div>
                    <div>
                        <label className="label">Rating</label>
                        <Rating value={form.rating} onChange={(val) => setForm((f) => ({ ...f, rating: val }))} editable />
                    </div>

                    <div>
                        <label className="label">Places Visited</label>
                        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto border dark:border-gray-700 rounded p-3 bg-gray-50 dark:bg-gray-800">
                            {places.length === 0 && <span className="text-sm text-gray-500 dark:text-gray-400">No places available</span>}
                            {places.map((p) => (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => togglePlace(p.id)}
                                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${(form.placeIds || []).includes(p.id)
                                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                                        }`}
                                >
                                    {p.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="label">Shops Visited</label>
                        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto border dark:border-gray-700 rounded p-3 bg-gray-50 dark:bg-gray-800">
                            {shops.length === 0 && <span className="text-sm text-gray-500 dark:text-gray-400">No shops available</span>}
                            {shops.map((s) => (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => toggleShop(s.id)}
                                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${(form.shopIds || []).includes(s.id)
                                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                                        }`}
                                >
                                    {s.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="label">Foods Tried</label>
                        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto border dark:border-gray-700 rounded p-3 bg-gray-50 dark:bg-gray-800">
                            {foods.length === 0 && <span className="text-sm text-gray-500 dark:text-gray-400">No foods available</span>}
                            {foods.map((f) => (
                                <button
                                    key={f.id}
                                    type="button"
                                    onClick={() => toggleFood(f.id)}
                                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${(form.foodIds || []).includes(f.id)
                                        ? 'bg-green-600 text-white hover:bg-green-700'
                                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                                        }`}
                                >
                                    {f.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="label">Photos (URLs)</label>
                        <div className="space-y-2">
                            {(form.photos || []).map((url, i) => (
                                <div key={i} className="flex gap-2">
                                    <input className="input flex-1" value={url} readOnly />
                                    <button className="btn-sm text-red-600" onClick={() => removePhoto(url)}>
                                        ✕
                                    </button>
                                </div>
                            ))}
                            <button className="btn-sm btn-secondary" onClick={addPhoto}>
                                + Add Photo
                            </button>
                        </div>
                    </div>

                    {/* Budget */}
                    <div>
                        <label className="label">Budget</label>
                        <div className="flex items-center gap-3">
                            <input type="number" className="input w-48" value={form.budget} onChange={(e) => setForm((f) => ({ ...f, budget: Number(e.target.value) || 0 }))} />
                            <span className="text-sm text-gray-600 dark:text-gray-400">Used: {formatPrice((form.expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0))}</span>
                            {form.budget > 0 && (
                                <span className={`text-sm font-medium ${((form.budget || 0) - (form.expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0)) < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                    Remaining: {formatPrice((form.budget || 0) - (form.expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0))}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Tags */}
                    <TagsEditor form={form} setForm={setForm} />

                    {/* Timeline */}
                    <TimelineEditor form={form} setForm={setForm} places={places} shops={shops} foods={foods} />

                    {/* Activities */}
                    <ActivitiesEditor form={form} setForm={setForm} />

                    {/* Expenses */}
                    <ExpensesEditor form={form} setForm={setForm} />

                    <div className="flex justify-end gap-3 pt-4">
                        <button className="btn" onClick={() => setModalOpen(false)}>
                            Cancel
                        </button>
                        <button className="btn btn-primary" onClick={handleSave}>
                            {editingId ? 'Save' : 'Add'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}

function TimelineEditor({ form, setForm, places, shops, foods }) {
    const [time, setTime] = useState('')
    const [title, setTitle] = useState('')
    const [note, setNote] = useState('')
    const [linkType, setLinkType] = useState('') // place|shop|food
    const [linkId, setLinkId] = useState('')
    function addItem() {
        if (!title.trim()) return
        const item = { time, title: title.trim(), note }
        if (linkType === 'place') item.placeId = linkId
        if (linkType === 'shop') item.shopId = linkId
        if (linkType === 'food') item.foodId = linkId
        setForm((f) => ({ ...f, timeline: [...(f.timeline || []), item] }))
        setTime('')
        setTitle('')
        setNote('')
        setLinkType('')
        setLinkId('')
    }
    function removeItem(idx) {
        setForm((f) => ({ ...f, timeline: (f.timeline || []).filter((_, i) => i !== idx) }))
    }
    function move(idx, dir) {
        setForm((f) => {
            const arr = [...(f.timeline || [])]
            const j = idx + dir
            if (j < 0 || j >= arr.length) return f
            const tmp = arr[idx]
            arr[idx] = arr[j]
            arr[j] = tmp
            return { ...f, timeline: arr }
        })
    }
    return (
        <div>
            <label className="label">Day Timeline</label>
            <div className="flex flex-col gap-2">
                <div className="flex flex-col sm:flex-row gap-2">
                    <input type="time" className="input sm:w-40" value={time} onChange={(e) => setTime(e.target.value)} />
                    <input className="input flex-1" placeholder="Title (e.g., Breakfast)" value={title} onChange={(e) => setTitle(e.target.value)} />
                    <input className="input flex-1" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
                    <select className="input sm:w-40" value={linkType} onChange={(e) => { setLinkType(e.target.value); setLinkId('') }}>
                        <option value="">Link: none</option>
                        <option value="place">Link: Place</option>
                        <option value="shop">Link: Shop</option>
                        <option value="food">Link: Food</option>
                    </select>
                    {linkType && (
                        <select className="input sm:w-48" value={linkId} onChange={(e) => setLinkId(e.target.value)}>
                            <option value="">Select {linkType}</option>
                            {linkType === 'place' && places.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                            {linkType === 'shop' && shops.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
                            {linkType === 'food' && foods.map(f => (<option key={f.id} value={f.id}>{f.name}</option>))}
                        </select>
                    )}
                    <button type="button" className="btn sm:w-auto" onClick={addItem}>+ Add</button>
                </div>
                {(form.timeline || []).length > 0 && (
                    <ul className="divide-y rounded border dark:border-gray-700">
                        {(form.timeline || []).map((it, idx) => (
                            <li key={idx} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="text-gray-500 w-16">{it.time || '—'}</span>
                                    <div className="truncate">
                                        <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{it.title}</div>
                                        <div className="text-gray-500 dark:text-gray-400 truncate">
                                            {it.note}
                                            {it.placeId && <span className="ml-2">• 📍 {places.find(p => p.id === it.placeId)?.name || 'Place'}</span>}
                                            {it.shopId && <span className="ml-2">• 🏪 {shops.find(s => s.id === it.shopId)?.name || 'Shop'}</span>}
                                            {it.foodId && <span className="ml-2">• 🍽️ {foods.find(f => f.id === it.foodId)?.name || 'Food'}</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button type="button" className="btn-sm" onClick={() => move(idx, -1)} title="Move up">↑</button>
                                    <button type="button" className="btn-sm" onClick={() => move(idx, 1)} title="Move down">↓</button>
                                    <button type="button" className="btn-sm text-red-600" onClick={() => removeItem(idx)}>✕</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}

function ActivitiesEditor({ form, setForm }) {
    const [title, setTitle] = useState('')
    const [note, setNote] = useState('')
    function addItem() {
        if (!title.trim()) return
        const item = { title: title.trim(), note }
        setForm((f) => ({ ...f, activities: [...(f.activities || []), item] }))
        setTitle('')
        setNote('')
    }
    function removeItem(idx) {
        setForm((f) => ({ ...f, activities: (f.activities || []).filter((_, i) => i !== idx) }))
    }
    return (
        <div>
            <label className="label">Activities</label>
            <div className="flex flex-col gap-2">
                <div className="flex flex-col sm:flex-row gap-2">
                    <input className="input flex-1" placeholder="Activity title" value={title} onChange={(e) => setTitle(e.target.value)} />
                    <input className="input flex-1" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
                    <button type="button" className="btn sm:w-auto" onClick={addItem}>+ Add</button>
                </div>
                {(form.activities || []).length > 0 && (
                    <ul className="divide-y rounded border dark:border-gray-700">
                        {(form.activities || []).map((it, idx) => (
                            <li key={idx} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                                <div className="min-w-0">
                                    <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{it.title}</div>
                                    {it.note && <div className="text-gray-500 dark:text-gray-400 truncate">{it.note}</div>}
                                </div>
                                <button type="button" className="btn-sm text-red-600" onClick={() => removeItem(idx)}>✕</button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}

function ExpensesEditor({ form, setForm }) {
    const [label, setLabel] = useState('')
    const [amount, setAmount] = useState('')
    const [category, setCategory] = useState('')
    const [relatedType, setRelatedType] = useState('') // food|shop|place
    const [relatedId, setRelatedId] = useState('')
    function addItem() {
        if (!label.trim() || !amount) return
        const item = { label: label.trim(), amount: Number(amount) || 0, category: category.trim() }
        if (relatedType) item.relatedType = relatedType
        if (relatedId) item.relatedId = relatedId
        setForm((f) => ({ ...f, expenses: [...(f.expenses || []), item] }))
        setLabel('')
        setAmount('')
        setCategory('')
        setRelatedType('')
        setRelatedId('')
    }
    function removeItem(idx) {
        setForm((f) => ({ ...f, expenses: (f.expenses || []).filter((_, i) => i !== idx) }))
    }
    const total = (form.expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0)
    return (
        <div>
            <label className="label">Expenses</label>
            <div className="flex flex-col gap-2">
                <div className="flex flex-col sm:flex-row gap-2">
                    <input className="input flex-1" placeholder="Label" value={label} onChange={(e) => setLabel(e.target.value)} />
                    <input type="number" className="input sm:w-40" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
                    <input className="input flex-1" placeholder="Category (optional)" value={category} onChange={(e) => setCategory(e.target.value)} />
                    <select className="input sm:w-40" value={relatedType} onChange={(e) => { setRelatedType(e.target.value); setRelatedId('') }}>
                        <option value="">Link: none</option>
                        <option value="food">Link: Food</option>
                        <option value="shop">Link: Shop</option>
                        <option value="place">Link: Place</option>
                    </select>
                    {relatedType && (
                        <RelatedSelect type={relatedType} value={relatedId} onChange={setRelatedId} />
                    )}
                    <button type="button" className="btn sm:w-auto" onClick={addItem}>+ Add</button>
                </div>
                {(form.expenses || []).length > 0 && (
                    <>
                        <ul className="divide-y rounded border dark:border-gray-700">
                            {(form.expenses || []).map((it, idx) => (
                                <li key={idx} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                                    <div className="min-w-0">
                                        <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{it.label}</div>
                                        <div className="text-gray-500 dark:text-gray-400 truncate">{it.category || '—'}</div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-semibold">{formatPrice(Number(it.amount) || 0)}</span>
                                        <button type="button" className="btn-sm text-red-600" onClick={() => removeItem(idx)}>✕</button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                        <div className="text-right text-sm text-gray-700 dark:text-gray-300 font-medium">Total: {formatPrice(total)}</div>
                    </>
                )}
            </div>
        </div>
    )
}

function RelatedSelect({ type, value, onChange }) {
    // To keep dependencies minimal, pull from localStorage directly (consistent with db.js storage)
    const opts = (() => {
        try {
            const raw = localStorage.getItem('foodiesblog:data')
            if (!raw) return []
            const data = JSON.parse(raw)
            const list = type === 'food' ? data.foods : type === 'shop' ? data.shops : data.places
            return list || []
        } catch {
            return []
        }
    })()
    return (
        <select className="input sm:w-48" value={value} onChange={(e) => onChange(e.target.value)}>
            <option value="">Select {type}</option>
            {opts.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
            ))}
        </select>
    )
}

function TagsEditor({ form, setForm }) {
    const [tag, setTag] = useState('')
    function addTag() {
        const t = tag.trim()
        if (!t) return
        const exists = (form.tags || []).some(x => x.toLowerCase() === t.toLowerCase())
        if (exists) { setTag(''); return }
        setForm((f) => ({ ...f, tags: [...(f.tags || []), t] }))
        setTag('')
    }
    function removeTag(idx) {
        setForm((f) => ({ ...f, tags: (f.tags || []).filter((_, i) => i !== idx) }))
    }
    return (
        <div>
            <label className="label">Tags</label>
            <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                    <input className="input flex-1" placeholder="Add a tag and press Add/Enter" value={tag} onChange={(e) => setTag(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }} />
                    <button type="button" className="btn" onClick={addTag}>+ Add</button>
                </div>
                {(form.tags || []).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {(form.tags || []).map((t, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border dark:border-gray-700">
                                #{t}
                                <button type="button" className="ml-1 text-red-600" onClick={() => removeTag(idx)}>✕</button>
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

function exportTripsCSV() {
    try {
        const raw = localStorage.getItem('foodiesblog:data')
        if (!raw) return alert('No data to export')
        const data = JSON.parse(raw)
        const parentsById = Object.fromEntries((data.trips || []).map(t => [t.id, t]))
        const rows = (data.trips || []).map(t => {
            const totalExpense = (t.expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0)
            const placeNames = (t.placeIds || []).map(id => (data.places || []).find(p => p.id === id)?.name || '').filter(Boolean).join('; ')
            const shopNames = (t.shopIds || []).map(id => (data.shops || []).find(s => s.id === id)?.name || '').filter(Boolean).join('; ')
            const foodNames = (t.foodIds || []).map(id => (data.foods || []).find(f => f.id === id)?.name || '').filter(Boolean).join('; ')
            return {
                Date: t.date || '',
                Title: t.title || '',
                ParentTitle: t.parentId ? (parentsById[t.parentId]?.title || '') : '',
                Rating: t.rating || 0,
                Places: (t.placeIds || []).length,
                Shops: (t.shopIds || []).length,
                Foods: (t.foodIds || []).length,
                Timeline: (t.timeline || []).length,
                Activities: (t.activities || []).length,
                Expenses: (t.expenses || []).length,
                TotalExpense: totalExpense,
                Budget: t.budget ?? 0,
                BudgetRemaining: (t.budget ?? 0) - totalExpense,
                Tags: (t.tags || []).join('; '),
                PlaceNames: placeNames,
                ShopNames: shopNames,
                FoodNames: foodNames,
                Description: (t.description || '').replace(/\n/g, ' '),
            }
        })
        const headers = Object.keys(rows[0] || { Date: '', Title: '', Rating: 0 })
        const csv = [headers.join(','), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))].join('\n')
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'trips.csv'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    } catch (e) {
        alert('Failed to export CSV')
    }
}

function TripStats({ trips, allTrips }) {
    const total = trips.length
    const mains = trips.filter(t => !t.parentId).length
    const entries = trips.filter(t => !!t.parentId).length
    const avg = total ? (trips.reduce((s, t) => s + (t.rating || 0), 0) / total) : 0
    const totalExpense = trips.reduce((sum, t) => sum + (t.expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0), 0)
    const tagSet = new Set()
    trips.forEach(t => (t.tags || []).forEach(tag => tagSet.add(tag)))

    // Parents with entry counts (from allTrips because filtered may hide siblings)
    const parentCounts = Object.values(allTrips.reduce((acc, t) => {
        if (t.parentId) {
            acc[t.parentId] = (acc[t.parentId] || 0) + 1
        }
        return acc
    }, {}))
    const avgEntriesPerParent = parentCounts.length ? (parentCounts.reduce((a, b) => a + b, 0) / parentCounts.length) : 0

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <SummaryCard label="Trips (view)" value={total} emoji="✈️" />
            <SummaryCard label="Main Trips" value={mains} emoji="🗺️" />
            <SummaryCard label="Entries" value={entries} emoji="📝" />
            <SummaryCard label="Avg Rating" value={avg.toFixed(1)} emoji="⭐" />
            <SummaryCard label="Total Expense" value={formatPrice(totalExpense)} emoji="💳" />
            <SummaryCard label="Unique Tags" value={tagSet.size} emoji="🏷️" />
            <SummaryCard label="Avg Entries/Main" value={avgEntriesPerParent.toFixed(1)} emoji="📚" />
        </div>
    )
}

function SummaryCard({ label, value, emoji }) {
    return (
        <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-lg p-4 flex items-center justify-between">
            <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
                <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">{value}</div>
            </div>
            <div className="text-2xl opacity-80">{emoji}</div>
        </div>
    )
}

function TagDistribution({ trips }) {
    const counts = trips.reduce((acc, t) => {
        (t.tags || []).forEach(tag => { acc[tag] = (acc[tag] || 0) + 1 })
        return acc
    }, {})
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 12)
    const total = entries.reduce((s, [, c]) => s + c, 0)
    if (!entries.length) {
        return (
            <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-lg p-4">
                <h3 className="text-md font-semibold mb-3">Tag Distribution</h3>
                <p className="text-sm text-gray-500">No tags in current view</p>
            </div>
        )
    }
    const max = Math.max(1, ...entries.map(([, c]) => c))
    return (
        <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-lg p-4">
            <h3 className="text-md font-semibold mb-3">Tag Distribution</h3>
            <ul className="space-y-2">
                {entries.map(([tag, count]) => {
                    const pct = Math.round((count / max) * 100)
                    const share = total ? Math.round((count / total) * 100) : 0
                    return (
                        <li key={tag}>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-700 dark:text-gray-200">#{tag}</span>
                                <span className="text-gray-900 dark:text-gray-100 font-medium">{count} • {share}%</span>
                            </div>
                            <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded">
                                <div className="h-2 bg-indigo-500 rounded" style={{ width: `${pct}%` }}></div>
                            </div>
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}

function ParentsRollup({ trips, allTrips, onCollapse }) {
    const parents = allTrips.filter(t => !t.parentId)
    const [sortKey, setSortKey] = useState('combined') // combined|entries|title
    const [respectFilter, setRespectFilter] = useState(true)
    const [showBudget, setShowBudget] = useState(false)
    // Use class-based transitions (tailwind) instead of inline styles
    const [expanded, setExpanded] = useState(true)
    const [mounted, setMounted] = useState(false)
    const containerRef = useRef(null)

    // trigger mount animation
    useEffect(() => {
        requestAnimationFrame(() => setMounted(true))
        return () => setMounted(false)
    }, [])
    function monthKey(d) {
        const dt = new Date(d)
        const y = dt.getFullYear()
        const m = String(dt.getMonth() + 1).padStart(2, '0')
        return `${y}-${m}`
    }
    const now = new Date()
    const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
        return monthKey(d)
    })

    const filteredIds = useMemo(() => new Set((trips || []).map(t => t.id)), [trips])
    const rows = parents
        .filter((p) => {
            if (!respectFilter) return true
            // include parent if parent itself is filtered or any child is filtered
            if (filteredIds.has(p.id)) return true
            return allTrips.some(c => c.parentId === p.id && filteredIds.has(c.id))
        })
        .map((p) => {
            const children = allTrips.filter(c => c.parentId === p.id && (!respectFilter || filteredIds.has(c.id)))
            const includeParentData = !respectFilter || filteredIds.has(p.id)
            const parentExpense = includeParentData ? (p.expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0) : 0
            const childrenExpense = children.reduce((sum, ch) => sum + (ch.expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0), 0)
            const combinedTotal = parentExpense + childrenExpense
            const byCategory = (list) => list.reduce((acc, e) => {
                const k = (e.category || 'Other')
                acc[k] = (acc[k] || 0) + (Number(e.amount) || 0)
                return acc
            }, {})
            const parentCat = includeParentData ? byCategory(p.expenses || []) : {}
            const childrenCat = children.reduce((acc, ch) => {
                const m = byCategory(ch.expenses || [])
                for (const [k, v] of Object.entries(m)) acc[k] = (acc[k] || 0) + v
                return acc
            }, {})
            const combinedCat = { ...parentCat }
            for (const [k, v] of Object.entries(childrenCat)) combinedCat[k] = (combinedCat[k] || 0) + v
            // budget roll-up
            const parentBudget = includeParentData ? (p.budget ?? 0) : 0
            const childrenBudget = children.reduce((s, ch) => s + (ch.budget ?? 0), 0)
            const combinedBudget = parentBudget + childrenBudget
            const budgetRemaining = combinedBudget - combinedTotal
            // entries over time (last 6 months)
            const countsByMonth = (() => {
                const byMonth = children.reduce((acc, ch) => {
                    const k = monthKey(ch.date || Date.now())
                    acc[k] = (acc[k] || 0) + 1
                    return acc
                }, {})
                return months.map((k) => byMonth[k] || 0)
            })()
            return {
                id: p.id,
                title: p.title,
                date: p.date,
                entries: children.length,
                parentExpense,
                childrenExpense,
                combinedTotal,
                categories: combinedCat,
                tags: p.tags || [],
                countsByMonth,
                combinedBudget,
                budgetRemaining,
            }
        })

    rows.sort((a, b) => {
        if (sortKey === 'combined') return (b.combinedTotal - a.combinedTotal) || a.title.localeCompare(b.title)
        if (sortKey === 'entries') return (b.entries - a.entries) || a.title.localeCompare(b.title)
        return a.title.localeCompare(b.title)
    })

    const palette = ['#6366F1', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#84CC16', '#EC4899']

    return (
        <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-md font-semibold">Main Trips Roll-up</h3>
                <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                        <input type="checkbox" className="checkbox" checked={respectFilter} onChange={(e) => setRespectFilter(e.target.checked)} />
                        Respect filters
                    </label>
                    <label className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                        <input type="checkbox" className="checkbox" checked={showBudget} onChange={(e) => setShowBudget(e.target.checked)} />
                        Show budget
                    </label>
                    <select className="input w-40" value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
                        <option value="combined">Sort: Total Spend</option>
                        <option value="entries">Sort: Entries</option>
                        <option value="title">Sort: Title</option>
                    </select>
                    <button className="btn" onClick={() => exportRollupCSV(rows)}>Export CSV</button>
                    <button className="btn" onClick={() => window.print()}>Print</button>
                    {onCollapse && (
                        <button
                            className="btn-sm btn-secondary p-2"
                            onClick={() => {
                                // toggle expanded -> collapse via class transitions
                                if (!expanded) return
                                setExpanded(false)
                            }}
                            title="Collapse roll-up"
                        >
                            <svg className="w-4 h-4 transform rotate-180" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>
            {rows.length === 0 ? (
                <p className="text-sm text-gray-500">No main trips.</p>
            ) : (
                <div
                    ref={containerRef}
                    className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 transition-[max-height,opacity] duration-300 ease overflow-hidden ${mounted && expanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}
                    onTransitionEnd={(e) => {
                        // when collapse transition completes, notify parent to swap to compact view
                        if (e.propertyName && e.propertyName.includes('max-height') && !expanded) {
                            try { onCollapse && onCollapse() } catch { }
                        }
                    }}
                >
                    {rows.map((r) => {
                        const cats = Object.entries(r.categories).sort((a, b) => b[1] - a[1])
                        const total = Math.max(1, r.combinedTotal)
                        return (
                            <div key={r.id} className="border dark:border-gray-800 rounded-lg p-4 space-y-2 bg-white dark:bg-gray-900">
                                <div className="flex items-center justify-between">
                                    <div className="min-w-0">
                                        <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">{r.title}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">📅 {r.date || '—'} • 📝 {r.entries} • 💳 {formatPrice(r.combinedTotal)}</div>
                                    </div>
                                </div>
                                {showBudget ? (
                                    <div className="text-sm mt-2">
                                        <span className={`px-2 py-1 rounded ${r.budgetRemaining < 0 ? 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300' : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300'}`}>
                                            Budget {formatPrice(r.combinedTotal)} / {formatPrice(r.combinedBudget)}{r.budgetRemaining < 0 ? ' • over' : ''}
                                        </span>
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden flex">
                                            {cats.map(([k, v], idx) => (
                                                <div key={k} title={`${k}: ${formatPrice(v)}`} style={{ width: `${Math.round((v / total) * 100)}%`, backgroundColor: palette[idx % palette.length] }} />
                                            ))}
                                        </div>
                                        <div className="text-xs text-gray-600 dark:text-gray-400 flex flex-wrap gap-2">
                                            {cats.slice(0, 4).map(([k, v], idx) => (
                                                <span key={k} className="inline-flex items-center gap-1">
                                                    <span className="inline-block w-2 h-2 rounded" style={{ backgroundColor: palette[idx % palette.length] }}></span>
                                                    {k}: {formatPrice(v)}
                                                </span>
                                            ))}
                                            {cats.length > 4 && <span>+{cats.length - 4} more</span>}
                                        </div>
                                        <div className="mt-1">
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Entries (last 6 months)</div>
                                            <div className="flex items-end gap-1 h-8">
                                                {r.countsByMonth.map((c, i) => {
                                                    const max = Math.max(1, ...r.countsByMonth)
                                                    const h = Math.max(2, Math.round((c / max) * 100))
                                                    return (
                                                        <div key={i} className="w-4 bg-emerald-500/80 rounded" title={`${c}`} style={{ height: `${h}%` }} />
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    </>
                                )}
                                <div className="pt-1">
                                    <Link className="btn-sm btn-secondary" to={`/trips/${r.id}`}>View</Link>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

function CompactRollup({ trips, allTrips, onExpand }) {
    // Compute parent ids that are relevant given the current filtered trips
    const filteredIds = new Set((trips || []).map(t => t.id))
    const parentIdSet = new Set()
        ; (trips || []).forEach(t => {
            if (t.parentId) parentIdSet.add(t.parentId)
            else parentIdSet.add(t.id)
        })

    const parents = Array.from(parentIdSet).map(pid => allTrips.find(p => p.id === pid)).filter(Boolean)

    const parentSummaries = parents.map(p => {
        const parentInFiltered = filteredIds.has(p.id)
        const parentExpense = parentInFiltered ? (p.expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0) : 0
        const children = allTrips.filter(c => c.parentId === p.id && filteredIds.has(c.id))
        const childrenExpense = children.reduce((sum, ch) => sum + (ch.expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0), 0)
        const combinedTotal = parentExpense + childrenExpense
        return { id: p.id, title: p.title, combinedTotal, entries: children.length }
    })

    const totalParents = parentSummaries.length
    const totalEntries = parentSummaries.reduce((s, p) => s + p.entries, 0)
    const totalSpend = parentSummaries.reduce((s, p) => s + p.combinedTotal, 0)

    // Sparkline: entries over last 6 months (based on filtered trips)
    const now = new Date()
    const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    })
    const countsByMonth = months.map(() => 0)
        ; (trips || []).forEach(t => {
            const d = t.date || ''
            if (!d) return
            const key = `${d.slice(0, 4)}-${d.slice(5, 7)}`
            const idx = months.indexOf(key)
            if (idx >= 0) countsByMonth[idx]++
        })

    // Top categories from filtered trips' expenses
    const catMap = {}
        ; (trips || []).forEach(t => {
            ; (t.expenses || []).forEach(e => {
                const k = e.category || 'Other'
                catMap[k] = (catMap[k] || 0) + (Number(e.amount) || 0)
            })
        })
    const topCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 3)

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onExpand}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onExpand() }}
            className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-lg p-4 flex items-center justify-between cursor-pointer hover:shadow-md"
        >
            <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Main Trips Roll-up</div>
                <div className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">{totalParents} main • {totalEntries} entries</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Combined spend: <span className="font-medium">{formatPrice(totalSpend)}</span></div>
                <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-end gap-1 h-6">
                        {countsByMonth.map((c, i) => {
                            const max = Math.max(1, ...countsByMonth)
                            const h = Math.max(4, Math.round((c / max) * 100))
                            return <div key={i} className="w-2 bg-emerald-500/80 rounded" style={{ height: `${h}%` }} title={`${months[i]}: ${c}`} />
                        })}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Last 6 months</div>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="flex flex-col text-right">
                    {topCats.length === 0 ? (
                        <div className="text-xs text-gray-500">No expense categories</div>
                    ) : (
                        topCats.map(([k, v], idx) => (
                            <div key={k} className="text-xs text-gray-700 dark:text-gray-200">
                                <span className="inline-block w-2 h-2 rounded mr-2" style={{ backgroundColor: ['#6366F1', '#06B6D4', '#10B981'][idx % 3] }} />{k}: {formatPrice(v)}
                            </div>
                        ))
                    )}
                </div>
                <button className="btn">Expand</button>
            </div>
        </div>
    )
}

function exportRollupCSV(rows) {
    try {
        const catKeys = Array.from(new Set(rows.flatMap(r => Object.keys(r.categories || {})))).sort()
        const headers = ['Title', 'Date', 'Entries', 'ParentExpense', 'ChildrenExpense', 'CombinedTotal', 'CombinedBudget', 'BudgetRemaining', 'TopCategories', 'Tags', ...catKeys.map(k => `Cat:${k}`)]
        const csvRows = rows.map(r => {
            const topCats = Object.entries(r.categories).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k}:${v}`).join('; ')
            const base = {
                Title: r.title || '',
                Date: r.date || '',
                Entries: r.entries || 0,
                ParentExpense: r.parentExpense || 0,
                ChildrenExpense: r.childrenExpense || 0,
                CombinedTotal: r.combinedTotal || 0,
                CombinedBudget: r.combinedBudget || 0,
                BudgetRemaining: r.budgetRemaining || 0,
                TopCategories: topCats,
                Tags: (r.tags || []).join('; '),
            }
            catKeys.forEach(k => { base[`Cat:${k}`] = r.categories[k] || 0 })
            return base
        })
        const csv = [headers.join(','), ...csvRows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))].join('\n')
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'trip-parents-rollup.csv'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    } catch {
        alert('Failed to export CSV')
    }
}
