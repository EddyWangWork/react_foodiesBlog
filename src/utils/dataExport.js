import { getAll } from '../storage/db.js'

export function exportData() {
    const data = getAll()
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `foodies-blog-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
}

export function importData(file, onSuccess, onError) {
    const reader = new FileReader()
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result)
            if (!data.places || !data.shops || !data.foods) {
                throw new Error('Invalid backup file format')
            }
            localStorage.setItem('foodiesblog:data', JSON.stringify(data))
            onSuccess()
        } catch (err) {
            onError(err.message)
        }
    }
    reader.onerror = () => onError('Failed to read file')
    reader.readAsText(file)
}
