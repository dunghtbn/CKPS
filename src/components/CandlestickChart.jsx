import { createChart, ColorType } from 'lightweight-charts'
import { useEffect, useRef, useMemo } from 'react'

// Màu marker phong cách hiện đại
const MARKER = {
  LONG: {
    position: 'belowBar',
    shape: 'arrowUp',
    color: '#0d9488',      // teal-600
    textColor: '#0f766e',  // teal-700
  },
  SHORT: {
    position: 'aboveBar',
    shape: 'arrowDown',
    color: '#e11d48',      // rose-600
    textColor: '#be123c',  // rose-700
  },
}

/**
 * Chuyển mảng tín hiệu backend thành format marker của lightweight-charts.
 * signals: [{ timestamp, price, signal: 'LONG'|'SHORT' }, ...]
 * timeType: 'day' (YYYY-MM-DD) hoặc 'unix' (giây) — khớp với data nến
 */
function signalsToMarkers(signals = [], timeType = 'day') {
  if (!signals.length) return []
  return signals.map((s, i) => {
    const style = MARKER[s.signal]
    if (!style) return null

    let time
    if (typeof s.time === 'number') {
      // Đã chuẩn hóa ở phía ngoài (Unix giây)
      time = s.time
    } else {
      const date = new Date(s.timestamp ?? s.time)
      time =
        timeType === 'unix'
          ? Math.floor(date.getTime() / 1000)
          : date.toISOString().slice(0, 10)
    }
    const price = typeof s.price === 'number' ? s.price : parseFloat(s.price)
    const label = Number.isInteger(price) ? price : price.toFixed(1)
    return {
      time,
      position: style.position,
      shape: style.shape,
      color: style.color,
      text: `${s.signal} ${label}`,
      id: `sig-${i}-${s.signal}`,
      size: 2,
    }
  }).filter(Boolean)
}

/**
 * Xác định time type của dữ liệu nến (string YYYY-MM-DD hay Unix số)
 */
function getTimeType(data) {
  if (!data.length) return 'day'
  const t = data[0].time
  return typeof t === 'number' ? 'unix' : 'day'
}

/**
 * CandlestickChart nhận:
 * - data: mảng nến { time, open, high, low, close }
 * - signals: mảng tín hiệu từ backend { timestamp, price, signal: 'LONG'|'SHORT' }
 * - height: chiều cao biểu đồ
 */
export default function CandlestickChart({ data = [], signals = [], height = 400 }) {
  const chartContainerRef = useRef(null)
  const chartRef = useRef(null)

  const timeType = useMemo(() => getTimeType(data), [data])
  const markers = useMemo(() => signalsToMarkers(signals, timeType), [signals, timeType])

  useEffect(() => {
    if (!chartContainerRef.current || !data.length) return

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#333',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      },
      grid: {
        vertLines: { color: '#f0f0f0' },
        horzLines: { color: '#f0f0f0' },
      },
      width: chartContainerRef.current.clientWidth,
      height,
      rightPriceScale: {
        borderColor: '#e0e0e0',
        scaleMargins: {
          top: 0.15,
          bottom: 0.2,
        },
      },
      timeScale: {
        borderColor: '#e0e0e0',
        timeVisible: true,
        secondsVisible: false,
      },
    })

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    })

    candlestickSeries.setData(data)
    if (markers.length) candlestickSeries.setMarkers(markers)
    chart.timeScale().fitContent()

    chartRef.current = chart

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries.length || !chartRef.current) return
      const { width } = entries[0].contentRect
      chartRef.current.applyOptions({ width })
    })
    resizeObserver.observe(chartContainerRef.current)

    return () => {
      resizeObserver.disconnect()
      chart.remove()
      chartRef.current = null
    }
  }, [data, height, markers])

  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-500"
        style={{ height }}
      >
        Chưa có dữ liệu
      </div>
    )
  }

  return <div ref={chartContainerRef} className="w-full" style={{ height }} />
}
