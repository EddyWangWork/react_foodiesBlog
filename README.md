````markdown
# Foodies Blog Manager 🍜

A modern React (Vite) web application to manage a food blog: Places (areas/locations), Shops (restaurants), and Foods (menu items). Stylish UI with Tailwind CSS, fast routing, and persistent local data.

## ✨ Features

### Core
- Dashboard with key metrics, trends, and quick actions
- Full CRUD for Places, Shops, and Foods with cascading deletes
- Real-time search across all entities and a global search synced to the URL (?q=)
- Powerful filters (kind, shop, place, state, favorites, rating, min/max price)
- Sort by multiple fields (name, rating, price, shop, date) with toggles

### Data & Export
- Local storage persistence with initial demo seeding
- Import/Export data as JSON
- CSV exports across pages with optional currency/formatted columns

### UI/UX
- Tailwind CSS + dark mode (class-based)
- Responsive grid and table layouts
- Toast notifications and modal dialogs
- Kind icons, badges, rating stars, favorites

### Gallery & Reports
- Beautiful Gallery page for Foods and Shops
  - Filters and sorting (rating, price, name, date; avg rating, foods count, avg price)
  - Lazy-loaded images and a lightbox preview
- Printable Report page with averages and summaries

### Settings
- Currency, locale, and price precision
- Default page size for Foods

## 🧰 Tech Stack
- Vite + React (JSX)
- React Router
- Tailwind CSS (dark mode: class)

## 🚀 Getting Started

1) Install dependencies

```cmd
npm install
```

2) Start the dev server

```cmd
npm run dev
```

Then open the provided local URL (typically http://localhost:5173).

3) Build for production

```cmd
npm run build
```

4) Preview the production build (optional)

```cmd
npm run preview
```

## 🧩 VS Code Tasks
- Dev: Vite — starts the dev server (background)
- Build: Vite — runs the production build

Use Terminal → Run Task… → choose a task.

## ⚙️ Notes
- App data key: `foodiesblog:data`
- Settings key: `foodiesblog:settings`
- Clear browser storage to reset demo seed data

## 🐞 Troubleshooting
- If the dev server fails to start, free the default port or set a different one in `vite.config.js`.
- If currency formatting looks wrong, adjust Settings (currency/locale/fraction digits).

````
