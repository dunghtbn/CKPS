/**
 * Mock data ~50 cây nến để test biểu đồ.
 * Mỗi phần tử: { time, open, high, low, close }
 * time: chuỗi 'YYYY-MM-DD' (phù hợp lightweight-charts cho khung daily)
 */
function randomBetween(min, max) {
  return min + Math.random() * (max - min)
}

function generateMockCandles(count = 50, basePrice = 25, startDate = '2024-01-02') {
  const candles = []
  const start = new Date(startDate)
  let open = basePrice

  for (let i = 0; i < count; i++) {
    const date = new Date(start)
    date.setDate(date.getDate() + i)
    const dateStr = date.toISOString().slice(0, 10)

    const volatility = 0.5
    const change = (Math.random() - 0.48) * volatility * open
    const close = Math.max(open * 0.9, Math.min(open * 1.1, open + change))
    const high = Math.max(open, close) + randomBetween(0, open * 0.01)
    const low = Math.min(open, close) - randomBetween(0, open * 0.01)

    candles.push({
      time: dateStr,
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
    })
    open = close
  }

  return candles
}

export const mockCandlestickData = generateMockCandles(50)

/**
 * Mock tín hiệu từ backend để test marker (format giống Python script trả về).
 * timestamp: ISO string; price: số; signal: 'LONG' | 'SHORT'
 */
export const mockSignals = [
  { timestamp: '2024-01-05T09:00:00', price: 25.8, signal: 'LONG' },
  { timestamp: '2024-01-12T09:00:00', price: 24.2, signal: 'SHORT' },
  { timestamp: '2024-01-22T09:00:00', price: 26.4, signal: 'LONG' },
  { timestamp: '2024-01-30T09:00:00', price: 25.1, signal: 'SHORT' },
]
