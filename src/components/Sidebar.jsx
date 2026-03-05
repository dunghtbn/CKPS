import { useState } from 'react'

const menuItems = [
  { id: 'home', label: 'Trang Chủ', icon: '🏠', href: '#' },
  { id: 'base', label: 'Chứng Khoán Cơ Sở', icon: '📊', href: '#' },
  {
    id: 'derivatives',
    label: 'Chứng Khoán Phái Sinh',
    icon: '📈',
    href: '#',
    children: [
      { id: 'fansi-1min', label: 'Fansi 1 Min', href: '#' },
      { id: 'fansi-trend', label: 'Fansi Trend 1M', href: '#' },
    ],
  },
]

export default function Sidebar({ isCollapsed, onToggle, mobileOpen = false }) {
  const [openSubmenu, setOpenSubmenu] = useState(null)

  const toggleSubmenu = (id) => {
    setOpenSubmenu((prev) => (prev === id ? null : id))
  }

  return (
    <aside
      className={`
        fixed left-0 top-0 z-40 h-screen bg-sidebar text-white
        flex flex-col transition-all duration-300 ease-in-out
        -translate-x-full md:translate-x-0 md:relative md:z-0
        ${mobileOpen ? 'translate-x-0' : ''}
        w-sidebar ${isCollapsed ? 'md:w-sidebar-collapsed' : 'md:w-sidebar'}
      `}
    >
      {/* Header: Logo + Collapse */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-3">
        {!isCollapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 text-lg font-bold">
              CK
            </div>
            <span className="truncate text-sm font-semibold">CKPS</span>
          </div>
        )}
        <button
          onClick={onToggle}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg hover:bg-white/15 transition-colors"
          aria-label={isCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
        >
          <span className="text-lg">
            {isCollapsed ? '→' : '←'}
          </span>
        </button>
      </div>

      {/* User info */}
      {!isCollapsed && (
        <div className="border-b border-white/10 px-3 py-3">
          <div className="flex items-center gap-3 rounded-lg bg-white/10 p-2">
            <div className="h-9 w-9 shrink-0 rounded-full bg-white/20 flex items-center justify-center text-sm font-medium">
              U
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">Người dùng</p>
              <p className="truncate text-xs text-white/70">user@ckps.vn</p>
            </div>
          </div>
        </div>
      )}

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto py-2">
        <ul className="space-y-0.5 px-2">
          {menuItems.map((item) => (
            <li key={item.id}>
              {item.children ? (
                <>
                  <button
                    onClick={() => toggleSubmenu(item.id)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-white/10 transition-colors"
                  >
                    <span className="shrink-0 text-lg">{item.icon}</span>
                    {!isCollapsed && (
                      <>
                        <span className="flex-1 truncate">{item.label}</span>
                        <span
                          className={`shrink-0 transition-transform ${openSubmenu === item.id ? 'rotate-180' : ''}`}
                        >
                          ▼
                        </span>
                      </>
                    )}
                  </button>
                  {!isCollapsed && openSubmenu === item.id && (
                    <ul className="ml-4 mt-0.5 space-y-0.5 border-l border-white/20 pl-3">
                      {item.children.map((child) => (
                        <li key={child.id}>
                          <a
                            href={child.href}
                            className="block rounded-lg px-2 py-2 text-sm text-white/90 hover:bg-white/10 hover:text-white transition-colors"
                          >
                            {child.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <a
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-white/10 transition-colors"
                >
                  <span className="shrink-0 text-lg">{item.icon}</span>
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </a>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
