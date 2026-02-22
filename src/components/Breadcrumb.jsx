import { ChevronRight, Home } from 'lucide-react'
import './Breadcrumb.css'

export default function Breadcrumb({ items, onNavigate }) {
  if (!items || items.length <= 1) return null

  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      <ol className="breadcrumb-list">
        {items.map((item, i) => {
          const isLast = i === items.length - 1
          return (
            <li key={i} className="breadcrumb-item">
              {i > 0 && <ChevronRight size={12} className="breadcrumb-sep" aria-hidden="true" />}
              {isLast ? (
                <span className="breadcrumb-current" aria-current="page">
                  {i === 0 && <Home size={12} />}
                  {item.label}
                </span>
              ) : (
                <button className="breadcrumb-link" onClick={() => item.page && onNavigate(item.page)}>
                  {i === 0 && <Home size={12} />}
                  {item.label}
                </button>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
