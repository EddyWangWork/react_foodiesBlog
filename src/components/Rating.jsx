export default function Rating({ value = 0, onChange }) {
    const stars = [1, 2, 3, 4, 5]
    return (
        <div className="flex items-center gap-1">
            {stars.map((s) => (
                <button
                    key={s}
                    type="button"
                    onClick={() => onChange?.(s)}
                    className="text-yellow-400 hover:scale-110 transition-transform"
                    title={`${s} star${s > 1 ? 's' : ''}`}
                >
                    {s <= (value || 0) ? (
                        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.88 8.72c-.783-.57-.38-1.81.588-1.81H6.93a1 1 0 00.95-.69l1.07-3.292z" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5 text-gray-300" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M11.48 3.5a.75.75 0 011.04 0l2.35 2.36 3.33.48a.75.75 0 01.41 1.28l-2.41 2.35.57 3.31a.75.75 0 01-1.09.79L12 12.89l-2.98 1.57a.75.75 0 01-1.09-.79l.57-3.31-2.41-2.35a.75.75 0 01.41-1.28l3.33-.48 2.35-2.36z" />
                        </svg>
                    )}
                </button>
            ))}
        </div>
    )
}
