import { useEffect, useState, useRef } from 'react'
import { NavLink, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard.jsx'
import Places from './pages/Places.jsx'
import Shops from './pages/Shops.jsx'
import Foods from './pages/Foods.jsx'
import Report from './pages/Report.jsx'
import Gallery from './pages/Gallery.jsx'
import TripJournal from './pages/TripJournal.jsx'
import TripDetail from './pages/TripDetail.jsx'
import Settings from './pages/Settings.jsx'
import { exportData, importData } from './utils/dataExport.js'
import { getSettings } from './storage/settings.js'

function NavBar() {
  const linkBase = 'px-3 py-2 rounded hover:bg-gray-100 transition-colors'
  const active = 'text-white bg-indigo-600 hover:bg-indigo-700'
  const [menuOpen, setMenuOpen] = useState(false)
  const fileRef = useRef(null)
  const [dark, setDark] = useState(false)
  const [settings, setSettings] = useState(getSettings())
  const [globalQuery, setGlobalQuery] = useState('')
  const navigate = useNavigate()
  const location = useLocation()

  function handleExport() {
    exportData()
    setMenuOpen(false)
  }

  function handleImport() {
    fileRef.current?.click()
  }

  function onFileChange(e) {
    const file = e.target.files?.[0]
    if (file) {
      importData(
        file,
        () => {
          alert('Data imported successfully! Reloading...')
          window.location.reload()
        },
        (err) => alert(`Import failed: ${err}`)
      )
    }
    setMenuOpen(false)
  }

  // Dark mode setup
  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const isDark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
    setDark(isDark)
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  // Settings sync (currency hint) and initial global query
  useEffect(() => {
    setSettings(getSettings())
    const q = new URLSearchParams(location.search).get('q') || ''
    setGlobalQuery(q)
    const onStorage = (e) => {
      if (e.key === 'foodiesblog:settings') {
        setSettings(getSettings())
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [location.search])

  function applyGlobalSearch() {
    const params = new URLSearchParams(location.search)
    if (globalQuery) params.set('q', globalQuery)
    else params.delete('q')
    navigate({ pathname: location.pathname, search: params.toString() }, { replace: false })
  }

  function toggleTheme() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <nav className="sticky top-0 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🍜</span>
            <div>
              <div className="font-bold text-indigo-700 dark:text-indigo-400 text-lg">Foodies Blog</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Manager</div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <NavLink to="/" end className={({ isActive }) => `${linkBase} ${isActive ? active : ''}`}>
              Dashboard
            </NavLink>
            <NavLink to="/places" className={({ isActive }) => `${linkBase} ${isActive ? active : ''}`}>
              Places
            </NavLink>
            <NavLink to="/shops" className={({ isActive }) => `${linkBase} ${isActive ? active : ''}`}>
              Shops
            </NavLink>
            <NavLink to="/foods" className={({ isActive }) => `${linkBase} ${isActive ? active : ''}`}>
              Foods
            </NavLink>
            <NavLink to="/gallery" className={({ isActive }) => `${linkBase} ${isActive ? active : ''}`}>
              Gallery
            </NavLink>
            <NavLink to="/trips" className={({ isActive }) => `${linkBase} ${isActive ? active : ''}`}>
              Trips
            </NavLink>
            <div className="ml-2 flex items-center gap-2">
              <input
                className="input w-56"
                placeholder="Search (global)"
                value={globalQuery}
                onChange={(e) => setGlobalQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') applyGlobalSearch() }}
              />
              <button className="btn" title="Apply search" onClick={applyGlobalSearch}>Go</button>
            </div>
            <button onClick={toggleTheme} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Toggle theme">
              {dark ? (
                <svg className="w-5 h-5 text-yellow-300" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6.76 4.84l-1.8-1.79-1.42 1.41 1.79 1.8 1.43-1.42zM1 13h3v-2H1v2zm10 10h2v-3h-2v3zm9-10v-2h-3v2h3zm-3.64 6.95l1.41 1.41 1.8-1.79-1.41-1.41-1.8 1.79zM13 1h-2v3h2V1zm6.24 3.05l-1.41-1.41-1.8 1.79 1.41 1.41 1.8-1.79zM12 6a6 6 0 100 12 6 6 0 000-12z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21.64 13a9 9 0 11-10.63-10.6 1 1 0 01.9 1.75A7 7 0 1020 12a1 1 0 011.64 1z" />
                </svg>
              )}
            </button>
            <div className="relative ml-2">
              <div className="absolute -top-4 -right-1 text-[10px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {settings.currency} · {settings.priceFractionDigits}dp
              </div>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="More options"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-lg shadow-lg border dark:border-gray-700 py-1 animate-slideUp">
                  <button
                    onClick={handleExport}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export Data
                  </button>
                  <button
                    onClick={handleImport}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Import Data
                  </button>
                  <a
                    href="/settings"
                    className="block px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    Settings
                  </a>
                  <a
                    href="/report"
                    className="block px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    Report (Print)
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".json"
        onChange={onFileChange}
        className="hidden"
      />
    </nav>
  )
}

export default function App() {
  // ScrollToTop: ensure page scrolls to top on navigation changes.
  // Updated behavior:
  // - only trigger on pathname changes (ignore search params)
  // - use smooth scrolling for nicer UX
  // - add a short delay to allow lazy-loaded content to render before scrolling
  function ScrollToTop() {
    const location = useLocation()
    useEffect(() => {
      // Only act on pathname changes to avoid jumping when query/search changes.
      // Add a tiny delay so content has a chance to render (useful for lazy sections).
      const timer = setTimeout(() => {
        try {
          window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
        } catch (e) {
          // Fallback for older browsers
          window.scrollTo(0, 0)
        }
      }, 80)
      return () => clearTimeout(timer)
    }, [location.pathname])
    return null
  }
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 dark:text-gray-200">
      <NavBar />
      <main className="max-w-7xl mx-auto p-6 flex-1 w-full">
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/places" element={<Places />} />
          <Route path="/shops" element={<Shops />} />
          <Route path="/foods" element={<Foods />} />
          <Route path="/report" element={<Report />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/trips" element={<TripJournal />} />
          <Route path="/trips/:id" element={<TripDetail />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
      <footer className="border-t dark:border-gray-800 mt-12 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>Foodies Blog Manager © 2025 • Built with React + Vite + Tailwind CSS</p>
      </footer>
    </div>
  )
}
