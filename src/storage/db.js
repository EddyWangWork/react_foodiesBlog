const KEY = 'foodiesblog:data'

const empty = { places: [], shops: [], foods: [], trips: [] }

function load() {
    try {
        const raw = localStorage.getItem(KEY)
        if (!raw) return { ...empty }
        const data = JSON.parse(raw)
        return { ...empty, ...data }
    } catch (_) {
        return { ...empty }
    }
}

function save(data) {
    localStorage.setItem(KEY, JSON.stringify(data))
}

function id() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function getAll() {
    return load()
}

// Places
export function listPlaces() {
    return load().places
}
export function addPlace({ name, address, city, state }) {
    const db = load()
    const item = { id: id(), name, address, city, state }
    db.places.push(item)
    save(db)
    return item
}
export function updatePlace(placeId, patch) {
    const db = load()
    db.places = db.places.map((p) => (p.id === placeId ? { ...p, ...patch } : p))
    save(db)
}
export function deletePlace(placeId) {
    const db = load()
    db.places = db.places.filter((p) => p.id !== placeId)
    // cascade delete shops and foods in that place
    const shopIds = db.shops.filter((s) => s.placeId === placeId).map((s) => s.id)
    db.shops = db.shops.filter((s) => s.placeId !== placeId)
    db.foods = db.foods.filter((f) => !shopIds.includes(f.shopId))
    save(db)
}

// Shops
export function listShops() {
    return load().shops
}
export function addShop({ name, address, placeId }) {
    const db = load()
    const item = { id: id(), name, address, placeId }
    db.shops.push(item)
    save(db)
    return item
}
export function updateShop(shopId, patch) {
    const db = load()
    db.shops = db.shops.map((s) => (s.id === shopId ? { ...s, ...patch } : s))
    save(db)
}
export function deleteShop(shopId) {
    const db = load()
    db.shops = db.shops.filter((s) => s.id !== shopId)
    db.foods = db.foods.filter((f) => f.shopId !== shopId)
    save(db)
}

// Foods
export function listFoods() {
    return load().foods
}
export function addFood({ name, kind, shopId, price, favorite = false, rating = 0, imageUrl = '', createdAt }) {
    const db = load()
    const item = {
        id: id(),
        name,
        kind,
        shopId,
        price: price ?? '',
        favorite,
        rating,
        imageUrl,
        createdAt: createdAt || new Date().toISOString(),
    }
    db.foods.push(item)
    save(db)
    return item
}
export function updateFood(foodId, patch) {
    const db = load()
    db.foods = db.foods.map((f) => (f.id === foodId ? { ...f, ...patch } : f))
    save(db)
}
export function deleteFood(foodId) {
    const db = load()
    db.foods = db.foods.filter((f) => f.id !== foodId)
    save(db)
}

// Trips
export function listTrips() {
    return load().trips
}
export function addTrip({ date, title, description, placeIds = [], shopIds = [], foodIds = [], photos = [], rating = 0, timeline = [], activities = [], expenses = [], tags = [], budget = 0, parentId = null }) {
    const db = load()
    const item = {
        id: id(),
        date: date || new Date().toISOString().split('T')[0],
        title,
        description: description || '',
        placeIds,
        shopIds,
        foodIds,
        photos,
        rating,
        timeline, // [{ time: '09:00', title: 'Breakfast', note: 'Pho Bo at Pho 24', shopId, foodId, placeId }]
        activities, // [{ title: 'Walked around Old Quarter', note: '' }]
        expenses, // [{ label: 'Pho Bo', amount: 45000, category: 'Food', relatedType: 'food', relatedId: '...' }]
        tags,
        budget,
        parentId,
        createdAt: new Date().toISOString(),
    }
    db.trips.push(item)
    save(db)
    return item
}
export function updateTrip(tripId, patch) {
    const db = load()
    db.trips = db.trips.map((t) => (t.id === tripId ? { ...t, ...patch } : t))
    save(db)
}
export function deleteTrip(tripId) {
    const db = load()
    db.trips = db.trips.filter((t) => t.id !== tripId)
    save(db)
}

export function seedIfEmpty() {
    const db = load()
    if (db.places.length || db.shops.length || db.foods.length || db.trips.length) return

    // Places
    const p1 = addPlace({ name: 'Old Town', address: '123 Main St', city: 'Hanoi', state: 'HN' })
    const p2 = addPlace({ name: 'Riverside', address: '200 River Ave', city: 'Saigon', state: 'HCM' })
    const p3 = addPlace({ name: 'Downtown', address: '45 Central Blvd', city: 'Da Nang', state: 'DN' })

    // Shops
    const s1 = addShop({ name: 'Pho 24', address: 'Near market', placeId: p1.id })
    const s2 = addShop({ name: 'Com Tam 79', address: 'Block B', placeId: p2.id })
    const s3 = addShop({ name: 'Banh Mi Hoi An', address: 'Street corner', placeId: p3.id })
    const s4 = addShop({ name: 'Cafe Sua Da', address: 'Old Quarter', placeId: p1.id })

    // Foods
    const f1 = addFood({ name: 'Pho Bo', kind: 'noodle', shopId: s1.id, price: '45000', rating: 5, favorite: true, imageUrl: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=400' })
    const f2 = addFood({ name: 'Com Tam Suon', kind: 'rice', shopId: s2.id, price: '55000', rating: 4, imageUrl: 'https://images.unsplash.com/photo-1596040033229-a0b0c9e2e6b6?w=400' })
    const f3 = addFood({ name: 'Banh Mi Thit', kind: 'snack', shopId: s3.id, price: '25000', rating: 5, favorite: true, imageUrl: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=400' })
    const f4 = addFood({ name: 'Ca Phe Sua Da', kind: 'drink', shopId: s4.id, price: '20000', rating: 4, imageUrl: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400' })
    const f5 = addFood({ name: 'Bun Cha', kind: 'noodle', shopId: s1.id, price: '50000', rating: 5, favorite: false })
    const f6 = addFood({ name: 'Goi Cuon', kind: 'snack', shopId: s2.id, price: '30000', rating: 4, favorite: true })

    // Trips
    addTrip({
        date: '2025-10-15',
        title: 'Hanoi Food Adventure',
        description: 'A wonderful day exploring street food in Old Town. Started with the iconic Pho Bo, moved on to fresh spring rolls, and ended with iced coffee. The weather was perfect and the food was incredible!',
        placeIds: [p1.id],
        shopIds: [s1.id, s4.id],
        foodIds: [f1.id, f4.id, f5.id],
        photos: [
            'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400',
            'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400'
        ],
        rating: 5,
        tags: ['hanoi', 'streetfood'],
        budget: 200000,
        timeline: [
            { time: '08:30', title: 'Breakfast', note: 'Pho Bo at Pho 24', shopId: s1.id, foodId: f1.id, placeId: p1.id },
            { time: '10:00', title: 'Coffee Break', note: 'Ca Phe Sua Da', shopId: s4.id, foodId: f4.id, placeId: p1.id },
            { time: '12:00', title: 'Walk & Explore', note: 'Old Quarter stroll' },
        ],
        activities: [
            { title: 'Visited Old Quarter', note: 'Took photos and tried local snacks' },
            { title: 'Coffee Tasting', note: 'Compared different roasts' },
        ],
        expenses: [
            { label: 'Pho Bo', amount: 45000, category: 'Food', relatedType: 'food', relatedId: f1.id },
            { label: 'Iced Coffee', amount: 20000, category: 'Drink', relatedType: 'food', relatedId: f4.id },
            { label: 'Taxi', amount: 80000, category: 'Transport' },
        ],
    })
    addTrip({
        date: '2025-10-20',
        title: 'Saigon Culinary Tour',
        description: 'Enjoyed amazing rice dishes by the river. The sunset view made the meal even more special. Tried the famous broken rice with grilled pork chop and fresh spring rolls.',
        placeIds: [p2.id],
        shopIds: [s2.id],
        foodIds: [f2.id, f6.id],
        photos: [
            'https://images.unsplash.com/photo-1596040033229-a0b0c9e2e6b6?w=400'
        ],
        rating: 4,
        tags: ['saigon', 'river'],
        budget: 150000,
        timeline: [
            { time: '13:00', title: 'Lunch', note: 'Com Tam Suon by the river', shopId: s2.id, foodId: f2.id, placeId: p2.id },
            { time: '15:30', title: 'Afternoon Snack', note: 'Goi Cuon', foodId: f6.id },
        ],
        activities: [
            { title: 'River Walk', note: 'Sunset by the river' },
        ],
        expenses: [
            { label: 'Com Tam', amount: 55000, category: 'Food', relatedType: 'food', relatedId: f2.id },
            { label: 'Spring Rolls', amount: 30000, category: 'Food', relatedType: 'food', relatedId: f6.id },
        ],
    })
    addTrip({
        date: '2025-10-25',
        title: 'Da Nang Street Food Hunt',
        description: 'Quick lunch stop in Da Nang during our road trip. Found an amazing banh mi stall with the crispiest bread and most flavorful filling. A must-visit for any banh mi lover!',
        placeIds: [p3.id],
        shopIds: [s3.id],
        foodIds: [f3.id],
        photos: [
            'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=400',
            'https://images.unsplash.com/photo-1568254183919-78a4f43a2877?w=400'
        ],
        rating: 5,
        tags: ['danang', 'banhmi'],
        budget: 80000,
        timeline: [
            { time: '11:45', title: 'Banh Mi Stop', note: 'Crunchy bread, perfect filling', shopId: s3.id, foodId: f3.id, placeId: p3.id },
        ],
        activities: [
            { title: 'Road Trip Break', note: 'Short stop for food' },
        ],
        expenses: [
            { label: 'Banh Mi', amount: 25000, category: 'Food', relatedType: 'food', relatedId: f3.id },
        ],
    })
    addTrip({
        date: '2025-10-28',
        title: 'Weekend Food Market Tour',
        description: 'Explored the bustling weekend market in Hanoi. Sampled various street foods and discovered some hidden gems. The atmosphere was lively and the vendors were incredibly friendly.',
        placeIds: [p1.id],
        shopIds: [s1.id, s4.id],
        foodIds: [f1.id, f4.id],
        photos: [],
        rating: 4,
        tags: ['market', 'weekend', 'hanoi'],
        budget: 100000,
        timeline: [
            { time: '09:00', title: 'Market Stroll', note: 'Sampling snacks' },
            { time: '11:00', title: 'Coffee', note: 'Iced coffee break', shopId: s4.id, foodId: f4.id, placeId: p1.id },
        ],
        activities: [
            { title: 'Explored Vendors', note: 'Found hidden gems' },
        ],
        expenses: [
            { label: 'Snacks', amount: 40000, category: 'Food' },
            { label: 'Coffee', amount: 20000, category: 'Drink', relatedType: 'food', relatedId: f4.id },
        ],
    })
    addTrip({
        date: '2025-11-01',
        title: 'Coffee & Snacks Morning',
        description: 'Started the day with Vietnamese iced coffee and some light snacks. Perfect morning routine before work. The coffee was strong and sweet, just the way I like it.',
        placeIds: [p1.id, p2.id],
        shopIds: [s4.id, s2.id],
        foodIds: [f4.id, f6.id],
        photos: [
            'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400'
        ],
        rating: 4,
        tags: ['coffee', 'morning'],
        budget: 70000,
        timeline: [
            { time: '07:45', title: 'Morning Coffee', note: 'Cafe Sua Da', shopId: s4.id, foodId: f4.id, placeId: p1.id },
            { time: '08:30', title: 'Light Snack', note: 'Goi Cuon', foodId: f6.id, placeId: p2.id },
        ],
        activities: [
            { title: 'Chill Morning', note: 'Relaxed start to the day' },
        ],
        expenses: [
            { label: 'Coffee', amount: 20000, category: 'Drink', relatedType: 'food', relatedId: f4.id },
            { label: 'Snack', amount: 30000, category: 'Food', relatedType: 'food', relatedId: f6.id },
        ],
    })

    // Example hierarchy: Main trip with journal entries
    const mainTokyo = addTrip({
        date: '2025-11-01',
        title: 'Japan, Tokyo',
        description: 'Main trip container for Tokyo adventures. Add daily journals as entries beneath.',
        tags: ['japan', 'tokyo'],
        budget: 0,
        timeline: [],
        activities: [],
        expenses: [],
    })
    addTrip({
        date: '2025-11-02',
        title: 'Coffee & Snacks Morning',
        description: 'Shibuya coffee and snacks run.',
        rating: 4,
        tags: ['coffee', 'tokyo'],
        parentId: mainTokyo.id,
        expenses: [{ label: 'Latte', amount: 600, category: 'Drink' }],
    })
    addTrip({
        date: '2025-11-03',
        title: 'Weekend Food Market Tour',
        description: 'Explored a local weekend market in Tokyo.',
        rating: 5,
        tags: ['market', 'tokyo'],
        parentId: mainTokyo.id,
        expenses: [{ label: 'Snacks', amount: 1200, category: 'Food' }],
    })

    // Another example: Japan, Kyoto with two entries
    const mainKyoto = addTrip({
        date: '2025-11-04',
        title: 'Japan, Kyoto',
        description: 'Main trip container for Kyoto experiences.',
        tags: ['japan', 'kyoto'],
        budget: 0,
    })
    addTrip({
        date: '2025-11-05',
        title: 'Gion Night Walk',
        description: 'Evening stroll through Gion with street snacks.',
        rating: 5,
        tags: ['gion', 'streetfood'],
        parentId: mainKyoto.id,
        expenses: [
            { label: 'Yakitori', amount: 1200, category: 'Food' },
            { label: 'Matcha Ice Cream', amount: 600, category: 'Dessert' },
        ],
        order: 0,
    })
    addTrip({
        date: '2025-11-06',
        title: 'Arashiyama Bento Picnic',
        description: 'Bento by the river after bamboo grove walk.',
        rating: 4,
        tags: ['arashiyama', 'bento'],
        parentId: mainKyoto.id,
        expenses: [
            { label: 'Bento', amount: 1000, category: 'Food' },
            { label: 'Train', amount: 400, category: 'Transport' },
        ],
        order: 1,
    })

    // Vietnam examples using existing places/shops/foods
    const mainHanoiWeekend = addTrip({
        date: '2025-11-07',
        title: 'Vietnam, Hanoi Weekend',
        description: 'Two-day foodie weekend in Hanoi.',
        tags: ['vietnam', 'hanoi', 'weekend'],
        budget: 300000,
        placeIds: [p1.id],
    })
    addTrip({
        date: '2025-11-08',
        title: 'Old Quarter Street Food',
        description: 'Pho and banh mi hits in the Old Quarter.',
        rating: 5,
        tags: ['streetfood', 'oldquarter'],
        parentId: mainHanoiWeekend.id,
        placeIds: [p1.id],
        shopIds: [s1.id],
        foodIds: [f1.id, f3.id],
        timeline: [
            { time: '09:00', title: 'Pho Breakfast', shopId: s1.id, foodId: f1.id, placeId: p1.id },
            { time: '12:30', title: 'Banh Mi Lunch', foodId: f3.id, placeId: p1.id },
        ],
        expenses: [
            { label: 'Pho Bo', amount: 45000, category: 'Food', relatedType: 'food', relatedId: f1.id },
            { label: 'Banh Mi', amount: 25000, category: 'Food', relatedType: 'food', relatedId: f3.id },
        ],
        order: 0,
    })
    addTrip({
        date: '2025-11-09',
        title: 'Coffee Crawl',
        description: 'Iced coffee and people watching.',
        rating: 4,
        tags: ['coffee'],
        parentId: mainHanoiWeekend.id,
        placeIds: [p1.id],
        shopIds: [s4.id],
        foodIds: [f4.id],
        expenses: [
            { label: 'Ca Phe Sua Da', amount: 20000, category: 'Drink', relatedType: 'food', relatedId: f4.id },
        ],
        order: 1,
    })

    const mainSaigon = addTrip({
        date: '2025-11-10',
        title: 'Vietnam, Saigon Long Weekend',
        description: 'Food-focused long weekend in Saigon.',
        tags: ['vietnam', 'saigon', 'weekend'],
        budget: 350000,
        placeIds: [p2.id],
    })
    addTrip({
        date: '2025-11-11',
        title: 'Broken Rice Feast',
        description: 'Iconic com tam with grilled pork.',
        rating: 5,
        tags: ['comtam'],
        parentId: mainSaigon.id,
        placeIds: [p2.id],
        shopIds: [s2.id],
        foodIds: [f2.id],
        expenses: [
            { label: 'Com Tam Suon', amount: 55000, category: 'Food', relatedType: 'food', relatedId: f2.id },
        ],
        order: 0,
    })
    addTrip({
        date: '2025-11-12',
        title: 'Riverside Evening',
        description: 'Spring rolls by the river.',
        rating: 4,
        tags: ['river'],
        parentId: mainSaigon.id,
        placeIds: [p2.id],
        foodIds: [f6.id],
        expenses: [
            { label: 'Goi Cuon', amount: 30000, category: 'Food', relatedType: 'food', relatedId: f6.id },
        ],
        order: 1,
    })
}
