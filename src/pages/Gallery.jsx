import { useEffect, useMemo, useState } from 'react'
import { listFoods, listShops, listPlaces, seedIfEmpty } from '../storage/db.js'
import Rating from '../components/Rating.jsx'
import { formatPrice } from '../utils/format.js'
import SearchBox from '../components/SearchBox.jsx'
import Modal from '../components/Modal.jsx'
import { useLocation } from 'react-router-dom'

const KINDS = {
    noodle: { label: 'Noodle', icon: '🍜' },
    rice: { label: 'Rice', icon: '🍚' },
    soup: { label: 'Soup', icon: '🍲' },
    snack: { label: 'Snack', icon: '🥟' },
    drink: { label: 'Drink', icon: '🥤' },
    dessert: { label: 'Dessert', icon: '🍰' },
}

export default function Gallery() {
    const [foods, setFoods] = useState([])
    const [shops, setShops] = useState([])
    const [places, setPlaces] = useState([])
    const [view, setView] = useState('foods') // 'foods' | 'shops'
    const [search, setSearch] = useState('')
    const [kind, setKind] = useState('')
    const [foodSortKey, setFoodSortKey] = useState('rating') // rating | price | name | date
    const [foodSortAsc, setFoodSortAsc] = useState(false)
    const [shopSortKey, setShopSortKey] = useState('avgRating') // avgRating | foods | name | avgPrice
    const [shopSortAsc, setShopSortAsc] = useState(false)
    const [preview, setPreview] = useState(null) // { url, title }
    const location = useLocation()

    useEffect(() => {
        seedIfEmpty()
        setFoods(listFoods())
        setShops(listShops())
        setPlaces(listPlaces())
    }, [])

    // Sync global q
    useEffect(() => {
        const q = new URLSearchParams(location.search).get('q') || ''
        setSearch(q)
    }, [location.search])

    const foodsFiltered = useMemo(() => {
        const q = search.toLowerCase()
        const base = foods.filter(f => {
            const shop = shops.find(s => s.id === f.shopId)
            const matchSearch = !q || (f.name || '').toLowerCase().includes(q) || (shop?.name || '').toLowerCase().includes(q)
            const matchKind = !kind || f.kind === kind
            return matchSearch && matchKind
        })
        base.sort((a, b) => {
            const dir = foodSortAsc ? 1 : -1
            if (foodSortKey === 'name') return dir * (a.name || '').localeCompare(b.name || '')
            if (foodSortKey === 'rating') return dir * (((a.rating || 0) - (b.rating || 0)))
            if (foodSortKey === 'price') return dir * (((Number(a.price) || 0) - (Number(b.price) || 0)))
            if (foodSortKey === 'date') return dir * ((a.createdAt ? Date.parse(a.createdAt) : 0) - (b.createdAt ? Date.parse(b.createdAt) : 0))
            return 0
        })
        return base
    }, [foods, shops, search, kind, foodSortKey, foodSortAsc])

    const shopsFiltered = useMemo(() => {
        const q = search.toLowerCase()
        const withStats = shops.map(s => {
            const place = places.find(p => p.id === s.placeId)
            const fs = foods.filter(f => f.shopId === s.id)
            const count = fs.length
            const avgRating = count ? (fs.reduce((a, f) => a + (f.rating || 0), 0) / count) : 0
            const priceNums = fs.map(f => Number(f.price)).filter(n => !isNaN(n))
            const avgPrice = priceNums.length ? (priceNums.reduce((a, b) => a + b, 0) / priceNums.length) : 0
            return { s, place, count, avgRating, avgPrice }
        })
        const filtered = withStats.filter(({ s, place }) => {
            return !q || (s.name || '').toLowerCase().includes(q) || (place?.name || '').toLowerCase().includes(q) || (place?.city || '').toLowerCase().includes(q)
        })
        filtered.sort((a, b) => {
            const dir = shopSortAsc ? 1 : -1
            if (shopSortKey === 'name') return dir * (a.s.name || '').localeCompare(b.s.name || '')
            if (shopSortKey === 'foods') return dir * (a.count - b.count)
            if (shopSortKey === 'avgRating') return dir * (a.avgRating - b.avgRating)
            if (shopSortKey === 'avgPrice') return dir * (a.avgPrice - b.avgPrice)
            return 0
        })
        return filtered
    }, [shops, places, foods, search, shopSortKey, shopSortAsc])

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Gallery</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">A beautiful showcase of your foods and shops</p>
                </div>
                <div className="inline-flex rounded overflow-hidden border dark:border-gray-800">
                    <button className={`px-4 py-2 text-sm ${view === 'foods' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-900'}`} onClick={() => setView('foods')}>Foods</button>
                    <button className={`px-4 py-2 text-sm ${view === 'shops' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-900'}`} onClick={() => setView('shops')}>Shops</button>
                </div>
            </div>

            <div className="flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[220px]">
                    <SearchBox value={search} onChange={setSearch} placeholder={`Search ${view}...`} />
                </div>
                {view === 'foods' && (
                    <>
                        <select className="input w-48" value={kind} onChange={(e) => setKind(e.target.value)}>
                            <option value="">All kinds</option>
                            {Object.entries(KINDS).map(([id, v]) => (
                                <option key={id} value={id}>{v.icon} {v.label}</option>
                            ))}
                        </select>
                        <select className="input w-48" value={foodSortKey} onChange={(e) => setFoodSortKey(e.target.value)}>
                            <option value="rating">Sort: Rating</option>
                            <option value="price">Sort: Price</option>
                            <option value="name">Sort: Name</option>
                            <option value="date">Sort: Added</option>
                        </select>
                        <button className="btn" onClick={() => setFoodSortAsc(v => !v)} title="Toggle order">{foodSortAsc ? 'Asc' : 'Desc'}</button>
                    </>
                )}
                {view === 'shops' && (
                    <>
                        <select className="input w-48" value={shopSortKey} onChange={(e) => setShopSortKey(e.target.value)}>
                            <option value="avgRating">Sort: Avg Rating</option>
                            <option value="foods">Sort: Foods Count</option>
                            <option value="avgPrice">Sort: Avg Price</option>
                            <option value="name">Sort: Name</option>
                        </select>
                        <button className="btn" onClick={() => setShopSortAsc(v => !v)} title="Toggle order">{shopSortAsc ? 'Asc' : 'Desc'}</button>
                    </>
                )}
                <div className="text-sm text-gray-600 dark:text-gray-400">
                    {view === 'foods' ? `${foodsFiltered.length} foods` : `${shopsFiltered.length} shops`}
                </div>
            </div>

            {view === 'foods' ? (
                <FoodsGrid foods={foodsFiltered} shops={shops} onPreview={setPreview} />
            ) : (
                <ShopsGrid items={shopsFiltered} foods={foods} onPreview={setPreview} />
            )}

            {/* Lightbox modal for food images */}
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

function FoodsGrid({ foods, shops, onPreview }) {
    if (foods.length === 0) {
        return <div className="text-center py-16 text-gray-500">No foods yet. Add some and they will appear here.</div>
    }
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {foods.map((f) => {
                const shop = shops.find(s => s.id === f.shopId)
                const kind = KINDS[f.kind] || { icon: '🍽️', label: f.kind }
                return (
                    <div key={f.id} className="group relative bg-white dark:bg-gray-900 rounded-xl overflow-hidden border dark:border-gray-800 shadow hover:shadow-lg transition-shadow">
                        {f.imageUrl ? (
                            <img onClick={() => onPreview?.({ url: f.imageUrl, title: f.name })} src={f.imageUrl} alt={f.name} loading="lazy" className="w-full h-40 object-cover group-hover:scale-105 transition-transform cursor-zoom-in" />
                        ) : (
                            <div className="w-full h-40 bg-gradient-to-br from-indigo-100 to-pink-100 dark:from-indigo-900/40 dark:to-pink-900/30 flex items-center justify-center text-5xl">
                                {kind.icon}
                            </div>
                        )}
                        <div className="p-4 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                                <div className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">{f.name}</div>
                                {f.favorite && <span className="text-yellow-400" title="Favorite">★</span>}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{kind.icon} {kind.label}</div>
                            <div className="flex items-center justify-between gap-2">
                                <div className="text-sm text-gray-700 dark:text-gray-300 line-clamp-1">{shop?.name || '—'}</div>
                                <div className="text-sm font-medium text-indigo-700 dark:text-indigo-400">{f.price ? formatPrice(f.price) : '—'}</div>
                            </div>
                            <div className="pt-1">
                                <Rating value={f.rating || 0} />
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

function ShopsGrid({ items, foods, onPreview }) {
    if (items.length === 0) {
        return <div className="text-center py-16 text-gray-500">No shops yet. Add some and they will appear here.</div>
    }
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {items.map(({ s, place, count, avgRating, avgPrice }) => {
                const initial = (s.name || '?').charAt(0).toUpperCase()
                return (
                    <div key={s.id} className="bg-white dark:bg-gray-900 rounded-xl overflow-hidden border dark:border-gray-800 shadow hover:shadow-lg transition-shadow">
                        <div className="h-24 bg-gradient-to-r from-indigo-500 to-fuchsia-500"></div>
                        <div className="-mt-8 px-4">
                            <div className="w-16 h-16 rounded-full bg-white dark:bg-gray-800 border dark:border-gray-700 grid place-items-center text-xl font-bold text-indigo-600 shadow-md">
                                {initial}
                            </div>
                        </div>
                        <div className="p-4 space-y-2">
                            <div className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">{s.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{place?.name || '—'} • {place?.city || '—'}{place?.state ? `, ${place.state}` : ''}</div>
                            <div className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300">
                                <div>{count} foods</div>
                                <div>{avgRating ? `${avgRating.toFixed(1)}★` : '—'} {avgPrice ? `• ${formatPrice(avgPrice)}` : ''}</div>
                            </div>
                            {(s.address || place?.city) && (
                                <div className="pt-1">
                                    <a
                                        className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm"
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([s.name, s.address, place?.city, place?.state].filter(Boolean).join(' '))}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Open in Maps
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
