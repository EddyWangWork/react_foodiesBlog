import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getAll, seedIfEmpty } from '../storage/db.js'
import { formatPrice } from '../utils/format.js'

export default function Dashboard() {
    seedIfEmpty()
    const { places, shops, foods, trips } = useMemo(() => getAll(), [])

    const foodsByKind = foods.reduce((acc, food) => {
        acc[food.kind] = (acc[food.kind] || 0) + 1
        return acc
    }, {})

    const recentFoods = foods.slice(-5).reverse()

    // Trend over last 6 months
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
    const byMonth = foods.reduce((acc, f) => {
        const k = monthKey(f.createdAt || Date.now())
        acc[k] = (acc[k] || 0) + 1
        return acc
    }, {})
    const trend = months.map((k) => ({ key: k, count: byMonth[k] || 0 }))

    // statistics
    const favoritesCount = foods.filter((f) => !!f.favorite).length
    const rated = foods.filter((f) => typeof f.rating === 'number')
    const avgRating = rated.length ? (rated.reduce((s, f) => s + (f.rating || 0), 0) / rated.length) : 0
    const numericPrices = foods
        .map((f) => Number(f.price))
        .filter((n) => !isNaN(n) && isFinite(n))
    const avgPrice = numericPrices.length ? (numericPrices.reduce((a, b) => a + b, 0) / numericPrices.length) : 0

    const topShops = (() => {
        const counts = shops.map((s) => ({
            shop: s,
            count: foods.filter((f) => f.shopId === s.id).length,
        }))
        counts.sort((a, b) => b.count - a.count)
        return counts.slice(0, 5)
    })()

    const topFoods = [...foods]
        .sort((a, b) => (b.rating || 0) - (a.rating || 0) || (a.name || '').localeCompare(b.name || ''))
        .slice(0, 5)

    // Trips stats
    const tripMain = trips.filter(t => !t.parentId)
    const tripEntries = trips.filter(t => !!t.parentId)
    const tripAvgRating = trips.length ? (trips.reduce((s, t) => s + (t.rating || 0), 0) / trips.length) : 0
    const tripTotalExpense = trips.reduce((sum, t) => sum + (t.expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0), 0)
    const tripTagsCount = trips.reduce((acc, t) => {
        (t.tags || []).forEach(tag => acc[tag] = (acc[tag] || 0) + 1)
        return acc
    }, {})
    const topTripTags = Object.entries(tripTagsCount).sort((a, b) => b[1] - a[1]).slice(0, 6)

    // Trips by month (count) and expenses by month (sum)
    const tripsByMonth = trips.reduce((acc, t) => {
        const k = monthKey(t.date || Date.now())
        acc[k] = (acc[k] || 0) + 1
        return acc
    }, {})
    const tripCountTrend = months.map((k) => ({ key: k, count: tripsByMonth[k] || 0 }))
    const tripsExpenseByMonth = trips.reduce((acc, t) => {
        const k = monthKey(t.date || Date.now())
        const amt = (t.expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0)
        acc[k] = (acc[k] || 0) + amt
        return acc
    }, {})
    const tripExpenseTrend = months.map((k) => ({ key: k, amount: tripsExpenseByMonth[k] || 0 }))

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                    <p className="text-gray-600 mt-1">Overview of your food blog data</p>
                </div>
                <div className="flex gap-2">
                    <Link to="/places" className="btn-primary">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Place
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Places"
                    value={places.length}
                    icon="📍"
                    color="bg-gradient-to-br from-blue-500 to-blue-600"
                    link="/places"
                />
                <StatCard
                    title="Shops"
                    value={shops.length}
                    icon="🏪"
                    color="bg-gradient-to-br from-purple-500 to-purple-600"
                    link="/shops"
                />
                <StatCard
                    title="Foods"
                    value={foods.length}
                    icon="🍜"
                    color="bg-gradient-to-br from-orange-500 to-orange-600"
                    link="/foods"
                />
                <StatCard
                    title="Trips"
                    value={trips.length}
                    icon="✈️"
                    color="bg-gradient-to-br from-pink-500 to-rose-600"
                    link="/trips"
                />
            </div>

            {/* Trip quick stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Main Trips"
                    value={tripMain.length}
                    icon="🗺️"
                    color="bg-gradient-to-br from-sky-500 to-blue-600"
                    link="/trips"
                />
                <StatCard
                    title="Journal Entries"
                    value={tripEntries.length}
                    icon="📝"
                    color="bg-gradient-to-br from-fuchsia-500 to-pink-600"
                    link="/trips"
                />
                <StatCard
                    title="Trip Avg Rating"
                    value={tripAvgRating.toFixed(1)}
                    icon="⭐"
                    color="bg-gradient-to-br from-lime-500 to-emerald-600"
                    link="/trips"
                />
                <StatCard
                    title="Trip Total Expense"
                    value={tripTotalExpense ? formatPrice(tripTotalExpense) : '—'}
                    icon="💳"
                    color="bg-gradient-to-br from-rose-500 to-red-600"
                    link="/trips"
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <StatCard
                    title="Favorites"
                    value={favoritesCount}
                    icon="⭐"
                    color="bg-gradient-to-br from-yellow-500 to-amber-500"
                    link="/foods"
                />
                <StatCard
                    title="Avg Rating"
                    value={avgRating.toFixed(1)}
                    icon="📈"
                    color="bg-gradient-to-br from-emerald-500 to-green-600"
                    link="/foods"
                />
                <StatCard
                    title="Avg Price"
                    value={avgPrice ? formatPrice(avgPrice) : '—'}
                    icon="💵"
                    color="bg-gradient-to-br from-cyan-500 to-sky-600"
                    link="/foods"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg border shadow-sm p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <span>📊</span>
                        Foods by Kind
                    </h2>
                    <div className="space-y-3">
                        {Object.entries(foodsByKind).length > 0 ? (
                            Object.entries(foodsByKind).map(([kind, count]) => {
                                const pct = foods.length ? Math.round((count / foods.length) * 100) : 0
                                return (
                                    <div key={kind} className="space-y-1">
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                                                <span className="capitalize text-gray-700">{kind}</span>
                                            </div>
                                            <span className="font-medium text-gray-900">{count} • {pct}%</span>
                                        </div>
                                        <div className="w-full h-2 bg-gray-100 rounded">
                                            <div className="h-2 bg-indigo-500 rounded" style={{ width: `${pct}%` }}></div>
                                        </div>
                                    </div>
                                )
                            })
                        ) : (
                            <p className="text-gray-500 text-sm">No food items yet</p>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-lg border shadow-sm p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <span>🆕</span>
                        Recent Foods
                    </h2>
                    <div className="space-y-2">
                        {recentFoods.length > 0 ? (
                            recentFoods.map((food) => {
                                const shop = shops.find((s) => s.id === food.shopId)
                                return (
                                    <div key={food.id} className="flex items-center justify-between py-2 border-b last:border-0">
                                        <div>
                                            <p className="font-medium text-gray-900">{food.name}</p>
                                            <p className="text-xs text-gray-500">{shop?.name || 'Unknown Shop'}</p>
                                        </div>
                                        <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full capitalize">
                                            {food.kind}
                                        </span>
                                    </div>
                                )
                            })
                        ) : (
                            <p className="text-gray-500 text-sm">No recent foods</p>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-lg border shadow-sm p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <span>🏷️</span>
                        Top Trip Tags
                    </h2>
                    <div className="space-y-2">
                        {topTripTags.length ? (
                            <ul className="divide-y">
                                {topTripTags.map(([tag, count]) => (
                                    <li key={tag} className="py-2 flex items-center justify-between">
                                        <span className="text-gray-700">#{tag}</span>
                                        <span className="text-sm font-semibold text-gray-900">{count}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-500 text-sm">No trip tags yet</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg border shadow-sm p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <span>📅</span>
                        Foods Added (last 6 months)
                    </h2>
                    <div className="space-y-3">
                        {trend.map(({ key, count }) => {
                            const max = Math.max(1, ...trend.map(t => t.count))
                            const pct = Math.round((count / max) * 100)
                            const [y, m] = key.split('-')
                            return (
                                <div key={key} className="space-y-1">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-700">{y}-{m}</span>
                                        <span className="font-medium text-gray-900">{count}</span>
                                    </div>
                                    <div className="w-full h-2 bg-gray-100 rounded">
                                        <div className="h-2 bg-emerald-500 rounded" style={{ width: `${pct}%` }}></div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                <div className="bg-white rounded-lg border shadow-sm p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <span>✈️</span>
                        Trips (last 6 months)
                    </h2>
                    <div className="space-y-3">
                        {tripCountTrend.map(({ key, count }) => {
                            const max = Math.max(1, ...tripCountTrend.map(t => t.count))
                            const pct = Math.round((count / max) * 100)
                            const [y, m] = key.split('-')
                            return (
                                <div key={key} className="space-y-1">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-700">{y}-{m}</span>
                                        <span className="font-medium text-gray-900">{count}</span>
                                    </div>
                                    <div className="w-full h-2 bg-gray-100 rounded">
                                        <div className="h-2 bg-pink-500 rounded" style={{ width: `${pct}%` }}></div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                <div className="bg-white rounded-lg border shadow-sm p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <span>💸</span>
                        Trip Expenses (last 6 months)
                    </h2>
                    <div className="space-y-3">
                        {tripExpenseTrend.map(({ key, amount }) => {
                            const max = Math.max(1, ...tripExpenseTrend.map(t => t.amount))
                            const pct = Math.round((amount / max) * 100)
                            const [y, m] = key.split('-')
                            return (
                                <div key={key} className="space-y-1">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-700">{y}-{m}</span>
                                        <span className="font-medium text-gray-900">{amount ? formatPrice(amount) : '—'}</span>
                                    </div>
                                    <div className="w-full h-2 bg-gray-100 rounded">
                                        <div className="h-2 bg-rose-500 rounded" style={{ width: `${pct}%` }}></div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                <AvgRatingShops places={places} shops={shops} foods={foods} />
                <AvgRatingPlaces places={places} shops={shops} foods={foods} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg border shadow-sm p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <span>🏆</span>
                        Top Shops by Foods
                    </h2>
                    {topShops.length ? (
                        <ul className="divide-y">
                            {topShops.map(({ shop, count }) => {
                                const place = places.find((p) => p.id === shop.placeId)
                                return (
                                    <li key={shop.id} className="py-2 flex items-center justify-between">
                                        <div>
                                            <div className="font-medium text-gray-900">{shop.name}</div>
                                            <div className="text-xs text-gray-500">{place?.name || '—'} {place?.city ? `• ${place.city}` : ''}</div>
                                        </div>
                                        <div className="text-sm font-semibold text-gray-800">{count}</div>
                                    </li>
                                )
                            })}
                        </ul>
                    ) : (
                        <p className="text-gray-500 text-sm">No shops yet</p>
                    )}
                </div>

                <div className="bg-white rounded-lg border shadow-sm p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <span>⭐</span>
                        Top Foods by Rating
                    </h2>
                    {topFoods.length ? (
                        <ul className="divide-y">
                            {topFoods.map((food) => {
                                const shop = shops.find((s) => s.id === food.shopId)
                                return (
                                    <li key={food.id} className="py-2 flex items-center justify-between">
                                        <div>
                                            <div className="font-medium text-gray-900">{food.name}</div>
                                            <div className="text-xs text-gray-500">{shop?.name || '—'}</div>
                                        </div>
                                        <div className="text-sm font-semibold text-yellow-600">{food.rating || 0}★</div>
                                    </li>
                                )
                            })}
                        </ul>
                    ) : (
                        <p className="text-gray-500 text-sm">No foods yet</p>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AvgPriceShops places={places} shops={shops} foods={foods} />
                <AvgPricePlaces places={places} shops={shops} foods={foods} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <QuickAction title="Add Place" icon="📍" link="/places" color="border-blue-500" />
                <QuickAction title="Add Shop" icon="🏪" link="/shops" color="border-purple-500" />
                <QuickAction title="Add Food" icon="🍜" link="/foods" color="border-orange-500" />
                <QuickAction title="Add Trip" icon="✈️" link="/trips" color="border-pink-500" />
            </div>
        </div>
    )
}

function StatCard({ title, value, icon, color, link }) {
    return (
        <Link to={link} className="group">
            <div className={`${color} text-white rounded-xl shadow-lg p-6 transition-transform duration-200 hover:scale-105`}>
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-white/80 text-sm font-medium">{title}</div>
                        <div className="text-4xl font-bold mt-2">{value}</div>
                    </div>
                    <div className="text-5xl opacity-80">{icon}</div>
                </div>
                <div className="mt-4 text-xs text-white/80">View all →</div>
            </div>
        </Link>
    )
}

function QuickAction({ title, icon, link, color }) {
    return (
        <Link
            to={link}
            className={`bg-white border-2 ${color} rounded-lg p-4 hover:shadow-md transition-all flex items-center gap-3 group`}
        >
            <span className="text-2xl">{icon}</span>
            <span className="font-medium text-gray-700 group-hover:text-gray-900">{title}</span>
        </Link>
    )
}

function AvgRatingShops({ places, shops, foods }) {
    const rows = shops.map((s) => {
        const fs = foods.filter((f) => f.shopId === s.id)
        const rated = fs.filter((f) => typeof f.rating === 'number')
        const avg = rated.length ? rated.reduce((a, f) => a + (f.rating || 0), 0) / rated.length : 0
        const place = places.find((p) => p.id === s.placeId)
        return { shop: s, place, avg, count: fs.length }
    }).filter(r => r.count > 0).sort((a, b) => b.avg - a.avg).slice(0, 5)
    return (
        <div className="bg-white rounded-lg border shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span>🏪</span>
                Top Shops by Avg Rating
            </h2>
            {rows.length ? (
                <ul className="divide-y">
                    {rows.map(({ shop, place, avg, count }) => (
                        <li key={shop.id} className="py-2 flex items-center justify-between">
                            <div>
                                <div className="font-medium text-gray-900">{shop.name}</div>
                                <div className="text-xs text-gray-500">{place?.name || '—'} {place?.city ? `• ${place.city}` : ''} • {count} foods</div>
                            </div>
                            <div className="text-sm font-semibold text-yellow-600">{avg.toFixed(1)}★</div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-gray-500 text-sm">No ratings yet</p>
            )}
        </div>
    )
}

function AvgRatingPlaces({ places, shops, foods }) {
    const rows = places.map((p) => {
        const sIds = shops.filter((s) => s.placeId === p.id).map(s => s.id)
        const fs = foods.filter((f) => sIds.includes(f.shopId))
        const rated = fs.filter((f) => typeof f.rating === 'number')
        const avg = rated.length ? rated.reduce((a, f) => a + (f.rating || 0), 0) / rated.length : 0
        return { place: p, avg, count: fs.length }
    }).filter(r => r.count > 0).sort((a, b) => b.avg - a.avg).slice(0, 5)
    return (
        <div className="bg-white rounded-lg border shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span>📍</span>
                Top Places by Avg Rating
            </h2>
            {rows.length ? (
                <ul className="divide-y">
                    {rows.map(({ place, avg, count }) => (
                        <li key={place.id} className="py-2 flex items-center justify-between">
                            <div>
                                <div className="font-medium text-gray-900">{place.name} ({place.city || '—'})</div>
                                <div className="text-xs text-gray-500">{count} foods</div>
                            </div>
                            <div className="text-sm font-semibold text-yellow-600">{avg.toFixed(1)}★</div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-gray-500 text-sm">No ratings yet</p>
            )}
        </div>
    )
}

function AvgPriceShops({ places, shops, foods }) {
    const rows = shops.map((s) => {
        const fs = foods.filter((f) => f.shopId === s.id)
        const nums = fs.map((f) => Number(f.price)).filter((n) => !isNaN(n))
        const avg = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0
        const place = places.find((p) => p.id === s.placeId)
        return { shop: s, place, avg, count: fs.length }
    }).filter(r => r.count > 0).sort((a, b) => b.avg - a.avg).slice(0, 5)
    return (
        <div className="bg-white rounded-lg border shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span>💵</span>
                Top Shops by Avg Price
            </h2>
            {rows.length ? (
                <ul className="divide-y">
                    {rows.map(({ shop, place, avg, count }) => (
                        <li key={shop.id} className="py-2 flex items-center justify-between">
                            <div>
                                <div className="font-medium text-gray-900">{shop.name}</div>
                                <div className="text-xs text-gray-500">{place?.name || '—'} {place?.city ? `• ${place.city}` : ''} • {count} foods</div>
                            </div>
                            <div className="text-sm font-semibold text-gray-800">{avg ? formatPrice(avg) : '—'}</div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-gray-500 text-sm">No prices yet</p>
            )}
        </div>
    )
}

function AvgPricePlaces({ places, shops, foods }) {
    const rows = places.map((p) => {
        const sIds = shops.filter((s) => s.placeId === p.id).map(s => s.id)
        const fs = foods.filter((f) => sIds.includes(f.shopId))
        const nums = fs.map((f) => Number(f.price)).filter((n) => !isNaN(n))
        const avg = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0
        return { place: p, avg, count: fs.length }
    }).filter(r => r.count > 0).sort((a, b) => b.avg - a.avg).slice(0, 5)
    return (
        <div className="bg-white rounded-lg border shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span>💵</span>
                Top Places by Avg Price
            </h2>
            {rows.length ? (
                <ul className="divide-y">
                    {rows.map(({ place, avg, count }) => (
                        <li key={place.id} className="py-2 flex items-center justify-between">
                            <div>
                                <div className="font-medium text-gray-900">{place.name} ({place.city || '—'})</div>
                                <div className="text-xs text-gray-500">{count} foods</div>
                            </div>
                            <div className="text-sm font-semibold text-gray-800">{avg ? formatPrice(avg) : '—'}</div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-gray-500 text-sm">No prices yet</p>
            )}
        </div>
    )
}