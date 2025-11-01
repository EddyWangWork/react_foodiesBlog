import { describe, it, expect, beforeEach } from 'vitest'
import { getAll, addPlace, listPlaces } from './db.js'

describe('storage/db', () => {
    beforeEach(() => {
        localStorage.clear()
    })

    it('adds and lists places', () => {
        expect(listPlaces()).toHaveLength(0)
        const p = addPlace({ name: 'Test Place', address: '123', city: 'City' })
        expect(p.id).toBeTruthy()
        const places = listPlaces()
        expect(places).toHaveLength(1)
        expect(places[0].name).toBe('Test Place')
    })
})
