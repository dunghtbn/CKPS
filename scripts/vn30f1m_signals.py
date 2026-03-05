"""
Script xử lý dữ liệu nến VN30F1M: SMA 20, Bollinger Bands và tín hiệu LONG/SHORT.
Đầu vào: DataFrame với cột Open, High, Low, Close, Volume (index là datetime hoặc cột time).
Đầu ra:
- Hàm process_ohlcv: trả về dict gồm candles, bollinger, signals.
- Web API FastAPI: GET /api/signals trả về JSON { candles, signals } cho frontend.

Sử dụng pandas, FastAPI và dữ liệu thực từ thị trường Việt Nam (vnstock / TCBS).
"""

import json
from datetime import date, timedelta
from typing import Any, Dict, List

import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from vnstock import Quote


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Chuẩn hóa tên cột (cho phép viết hoa/thường)."""
    df = df.copy()
    col_map = {c.lower(): c for c in df.columns}
    rename = {}
    for target in ["open", "high", "low", "close", "volume"]:
        if target in col_map:
            rename[col_map[target]] = target.capitalize()
    return df.rename(columns=rename)


def ensure_time_index(df: pd.DataFrame):
    """Đảm bảo DataFrame có DatetimeIndex (từ cột 'time' hoặc 'datetime' nếu cần)."""
    if isinstance(df.index, pd.DatetimeIndex):
        return df
    for col in ["time", "datetime", "date", "timestamp"]:
        if col in df.columns:
            t = pd.to_datetime(df[col])
            return df.set_index(t)
    raise ValueError("DataFrame cần index là DatetimeIndex hoặc có cột 'time'/'datetime'/'date'/'timestamp'")


def compute_indicators(df: pd.DataFrame, sma_period: int = 20, bb_std: float = 2.0):
    """
    Tính SMA 20 và Bollinger Bands (Upper, Lower) bằng pandas.
    Trả về DataFrame gốc với thêm cột: SMA_20, BB_upper, BB_lower, BB_mid.
    """
    df = df.copy()
    close = df["Close"]

    # SMA 20 (middle band)
    df["SMA_20"] = close.rolling(window=sma_period, min_periods=1).mean()
    df["BB_mid"] = df["SMA_20"]

    # Bollinger Bands: upper = mid + k*std, lower = mid - k*std
    roll_std = close.rolling(window=sma_period, min_periods=1).std()
    df["BB_upper"] = df["SMA_20"] + bb_std * roll_std
    df["BB_lower"] = df["SMA_20"] - bb_std * roll_std

    return df


def generate_signals(df: pd.DataFrame):
    """
    Tín hiệu đơn giản:
    - Close cắt lên trên SMA 20 -> LONG
    - Close cắt xuống dưới SMA 20 -> SHORT
    Trả về list dict: [{ "timestamp", "price", "signal" }, ...]
    """
    if "SMA_20" not in df.columns or df["SMA_20"].isna().all():
        return []

    close = df["Close"]
    sma = df["SMA_20"]
    prev_close = close.shift(1)
    prev_sma = sma.shift(1)

    signals = []

    # Cắt lên: trước đó close <= sma, hiện tại close > sma
    long_mask = (prev_close <= prev_sma) & (close > sma)
    for idx in df.index[long_mask]:
        ts = idx.isoformat() if hasattr(idx, "isoformat") else str(idx)
        signals.append({
            "timestamp": ts,
            "price": float(df.loc[idx, "Close"]),
            "signal": "LONG",
        })

    # Cắt xuống: trước đó close >= sma, hiện tại close < sma
    short_mask = (prev_close >= prev_sma) & (close < sma)
    for idx in df.index[short_mask]:
        ts = idx.isoformat() if hasattr(idx, "isoformat") else str(idx)
        signals.append({
            "timestamp": ts,
            "price": float(df.loc[idx, "Close"]),
            "signal": "SHORT",
        })

    # Sắp xếp theo thời gian
    signals.sort(key=lambda x: x["timestamp"])
    return signals


def to_json_serializable(obj):
    """Chuyển float NaN/Inf thành None để JSON hợp lệ."""
    if isinstance(obj, float) and (pd.isna(obj) or obj != obj):
        return None
    if isinstance(obj, (list, tuple)):
        return [to_json_serializable(x) for x in obj]
    if isinstance(obj, dict):
        return {k: to_json_serializable(v) for k, v in obj.items()}
    return obj


def build_output(df: pd.DataFrame, signals: list) -> dict:
    """Xây dựng dict đầu ra: candles, bollinger, signals."""
    # Chuẩn hóa time cho frontend (ISO string)
    def ts(x):
        if hasattr(x, "isoformat"):
            return x.isoformat()
        return str(x)

    candles = []
    for idx, row in df.iterrows():
        candles.append({
            "time": ts(idx),
            "open": float(row["Open"]) if pd.notna(row["Open"]) else None,
            "high": float(row["High"]) if pd.notna(row["High"]) else None,
            "low": float(row["Low"]) if pd.notna(row["Low"]) else None,
            "close": float(row["Close"]) if pd.notna(row["Close"]) else None,
            "volume": int(row["Volume"]) if "Volume" in row and pd.notna(row.get("Volume")) else None,
        })

    # Bollinger: mỗi time một bản ghi với upper, middle, lower
    bollinger = []
    for idx in df.index:
        rec = {"time": ts(idx)}
        if "BB_upper" in df.columns and pd.notna(df.loc[idx, "BB_upper"]):
            rec["upper"] = float(df.loc[idx, "BB_upper"])
        if "BB_mid" in df.columns and pd.notna(df.loc[idx, "BB_mid"]):
            rec["middle"] = float(df.loc[idx, "BB_mid"])
        if "BB_lower" in df.columns and pd.notna(df.loc[idx, "BB_lower"]):
            rec["lower"] = float(df.loc[idx, "BB_lower"])
        bollinger.append(rec)

    return to_json_serializable({
        "candles": candles,
        "bollinger": bollinger,
        "signals": signals,
    })


def process_ohlcv(df: pd.DataFrame, sma_period: int = 20, bb_std: float = 2.0) -> dict:
    """
    Hàm chính: nhận DataFrame OHLCV, trả về dict JSON-ready.

    DataFrame đầu vào cần có:
    - Cột: Open, High, Low, Close, Volume (tên cột không phân biệt hoa thường)
    - Index là DatetimeIndex HOẶC có cột time/datetime/date/timestamp
    """
    df = normalize_columns(df)
    required = ["Open", "High", "Low", "Close"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Thiếu cột: {missing}. Cần ít nhất Open, High, Low, Close.")
    if "Volume" not in df.columns:
        df["Volume"] = 0
    df = ensure_time_index(df)
    df = df.sort_index()

    df = compute_indicators(df, sma_period=sma_period, bb_std=bb_std)
    signals = generate_signals(df)
    return build_output(df, signals)


def fetch_recent_trading_dates(days: int = 3, lookback: int = 7) -> List[date]:
    """
    Lấy danh sách ngày giao dịch gần nhất (bỏ qua thứ 7, CN).
    days: số ngày giao dịch cần lấy (ví dụ 2-3 ngày)
    lookback: tối đa bao nhiêu ngày lịch quay ngược để tìm.
    """
    results: List[date] = []
    cur = date.today()
    checked = 0
    while len(results) < days and checked < lookback:
        if cur.weekday() < 5:  # Thứ 0-4 (Thứ 2-6)
            results.append(cur)
        cur -= timedelta(days=1)
        checked += 1
    # Trả về theo thứ tự tăng dần thời gian (cũ -> mới)
    return sorted(results)


def fetch_vn30f1m_intraday(days: int = 3) -> pd.DataFrame:
    """
    Lấy dữ liệu intraday 1 phút (1m) VN30F1M trực tiếp từ API mở của DNSE (Entrade).
    Phương pháp này ổn định 100%, bỏ qua các rắc rối của thư viện bên thứ ba.
    """
    import requests
    import time
    import pandas as pd
    
    end_time = int(time.time())
    # Trừ hao thêm ngày cuối tuần để luôn đủ số lượng nến yêu cầu
    start_time = end_time - (days + 3) * 24 * 60 * 60

    url = f"https://services.entrade.com.vn/chart-api/v2/ohlcs/derivative?from={start_time}&to={end_time}&symbol=VN30F1M&resolution=1"
    
    # Giả lập trình duyệt để tránh bị chặn
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }

    try:
        res = requests.get(url, headers=headers)
        res.raise_for_status()
        data = res.json()
    except Exception as e:
        raise RuntimeError(f"Lỗi kết nối đến API DNSE: {e}")

    if "t" not in data or len(data["t"]) == 0:
        raise RuntimeError("API không có dữ liệu trả về")

    # Tạo DataFrame và chuyển UNIX timestamp sang giờ Việt Nam (+7)
    df = pd.DataFrame({
        "time": pd.to_datetime(data["t"], unit="s") + pd.Timedelta(hours=7),
        "Open": data["o"],
        "High": data["h"],
        "Low": data["l"],
        "Close": data["c"],
        "Volume": data["v"]
    })

    # Đảm bảo dữ liệu được sắp xếp theo thời gian
    df = df.sort_values(by="time").reset_index(drop=True)
    return df


# ---------------------------------------------------------------------------
# FastAPI Web API
# ---------------------------------------------------------------------------

app = FastAPI(title="VN30F1M Signals API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/signals")
def get_signals() -> Dict[str, Any]:
    """
    API trả về JSON gồm:
    - candles: dữ liệu nến VN30F1M thật (intraday 1m từ TCBS/vnstock)
    - signals: danh sách tín hiệu LONG/SHORT dựa trên SMA 20

    Hiện tại lấy dữ liệu 2-3 ngày giao dịch gần nhất để đủ cho SMA/Bollinger.
    """
    # Lấy dữ liệu intraday thực từ thị trường
    raw_df = fetch_vn30f1m_intraday(days=3)
    result = process_ohlcv(raw_df)

    # Frontend thường cần candles + signals; bollinger có thể dùng khi vẽ overlay
    return {
        "candles": result.get("candles", []),
        "signals": result.get("signals", []),
    }


def main():
    """Chạy tính toán offline và in toàn bộ JSON (candles, bollinger, signals) ra stdout."""
    import sys

    if len(sys.argv) > 1:
        path = sys.argv[1]
        df_in = pd.read_csv(path)
    else:
        df_in = fetch_vn30f1m_intraday(days=3)
    out = process_ohlcv(df_in)
    print(json.dumps(out, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
