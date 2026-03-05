import { useState } from 'react'
import Sidebar from './components/Sidebar'
import MainContent from './components/MainContent'

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarOpenMobile, setSidebarOpenMobile] = useState(false)

  const toggleSidebar = () => setSidebarCollapsed((prev) => !prev)

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Overlay mobile khi sidebar mở */}
      {sidebarOpenMobile && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpenMobile(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar
        isCollapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        mobileOpen={sidebarOpenMobile}
      />

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile: nút mở sidebar */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-gray-200 bg-white px-4 md:hidden">
          <button
            onClick={() => setSidebarOpenMobile(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-gray-100"
            aria-label="Mở menu"
          >
            ☰
          </button>
          <span className="font-semibold text-gray-800">CKPS Dashboard</span>
        </header>

        <MainContent />
      </div>

    </div>
  )
}
