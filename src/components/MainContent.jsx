import { useEffect, useState } from 'react'
import CandlestickChart from './CandlestickChart'

export default function MainContent() {
  const [candles, setCandles] = useState([])
  const [signals, setSignals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true

    async function fetchSignals() {
      try {
        setLoading(true)
        setError(null)

        const res = await fetch('http://localhost:8000/api/signals')
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }
        const data = await res.json()
        if (!isMounted) return

        const rawCandles = Array.isArray(data.candles) ? data.candles : []
        const rawSignals = Array.isArray(data.signals) ? data.signals : []

        // Chuẩn hóa thời gian intraday sang Unix timestamp (giây) cho lightweight-charts
        const normalizedCandles = rawCandles.map((candle) => ({
          ...candle,
          time: Math.floor(new Date(candle.time).getTime() / 1000),
        }))

        const normalizedSignals = rawSignals.map((sig) => ({
          ...sig,
          time: Math.floor(new Date(sig.timestamp).getTime() / 1000),
        }))

        setCandles(normalizedCandles)
        setSignals(normalizedSignals)
      } catch (err) {
        if (!isMounted) return
        setError(err.message || 'Lỗi khi tải dữ liệu')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchSignals()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <main className="flex-1 min-h-screen bg-white overflow-auto">
      <div className="p-4 md:p-6 space-y-4">
        <h1 className="text-xl font-semibold text-gray-800">
          Biểu đồ nến VN30F1M
        </h1>

        {loading && (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 py-16 text-gray-500 text-sm">
            Đang tải dữ liệu...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Lỗi tải dữ liệu: {error}
          </div>
        )}

        {!loading && !error && (
          <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
            <CandlestickChart
              data={candles}
              signals={signals}
              height={420}
            />
          </div>
        )}
      </div>
    </main>
  )
}
