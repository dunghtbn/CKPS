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

        const res = await fetch('https://ckps-api.onrender.com/api/signals')
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }
        const data = await res.json()
        if (!isMounted) return

        const rawCandles = Array.isArray(data.candles) ? data.candles : []
        const rawSignals = Array.isArray(data.signals) ? data.signals : []

        // Bù timezone local để lightweight-charts hiển thị đúng giờ trình duyệt
        const toLocalUnixSeconds = (value) => {
          const date = new Date(value)
          return (date.getTime() - date.getTimezoneOffset() * 60000) / 1000
        }

        const normalizedCandles = rawCandles.map((candle) => ({
          ...candle,
          time: toLocalUnixSeconds(candle.time ?? candle.timestamp),
        }))

        const normalizedSignals = rawSignals.map((sig) => ({
          ...sig,
          time: toLocalUnixSeconds(sig.timestamp ?? sig.time),
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
