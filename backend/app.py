import argparse
import os
import sqlite3
import time
from datetime import datetime, date, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import numpy as np

import requests
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel

BASE_URL = "https://api.mfapi.in"  # MFAPI base URL (no auth needed)
BASE_DIR = Path(__file__).resolve().parent
DB_PATH = str(BASE_DIR / "mfdata.sqlite3")


def get_allowed_origins() -> List[str]:
    raw_origins = os.getenv("CORS_ALLOW_ORIGINS", "*").strip()
    if not raw_origins:
        return ["*"]
    if raw_origins == "*":
        return ["*"]
    return [origin.strip() for origin in raw_origins.split(",") if origin.strip()]


# ----------------------------
# DB helpers (SQLite)
# ----------------------------
def db_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def db_init() -> None:
    conn = db_conn()
    cur = conn.cursor()

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS schemes (
            scheme_code INTEGER PRIMARY KEY,
            scheme_name TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS nav (
            scheme_code INTEGER NOT NULL,
            nav_date TEXT NOT NULL,  -- ISO YYYY-MM-DD
            nav REAL NOT NULL,
            PRIMARY KEY (scheme_code, nav_date),
            FOREIGN KEY (scheme_code) REFERENCES schemes(scheme_code)
        );
        """
    )

    cur.execute("CREATE INDEX IF NOT EXISTS idx_nav_scheme ON nav(scheme_code);")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_nav_date ON nav(nav_date);")

    conn.commit()
    conn.close()


def upsert_scheme(conn: sqlite3.Connection, scheme_code: int, scheme_name: str) -> None:
    conn.execute(
        """
        INSERT INTO schemes (scheme_code, scheme_name, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(scheme_code) DO UPDATE SET
          scheme_name=excluded.scheme_name,
          updated_at=excluded.updated_at;
        """,
        (scheme_code, scheme_name, datetime.utcnow().isoformat()),
    )


def upsert_nav(conn: sqlite3.Connection, scheme_code: int, nav_date_iso: str, nav_value: float) -> None:
    conn.execute(
        """
        INSERT INTO nav (scheme_code, nav_date, nav)
        VALUES (?, ?, ?)
        ON CONFLICT(scheme_code, nav_date) DO UPDATE SET
          nav=excluded.nav;
        """,
        (scheme_code, nav_date_iso, nav_value),
    )


# ----------------------------
# MFAPI client helpers
# ----------------------------
def make_session() -> requests.Session:
    s = requests.Session()
    s.headers.update({"User-Agent": "mf-backtest-backend/1.0"})
    return s


def mfapi_get(session: requests.Session, path: str, params: Optional[Dict[str, Any]] = None) -> Any:
    url = f"{BASE_URL}{path}"
    r = session.get(url, params=params, timeout=30)
    # MFAPI returns JSON; raise error for non-2xx
    try:
        data = r.json()
    except Exception:
        raise RuntimeError(f"Non-JSON response: {r.status_code} {r.text[:200]}")
    if r.status_code >= 400:
        raise RuntimeError(f"HTTP {r.status_code}: {data}")
    return data


def parse_ddmmyyyy_to_iso(d: str) -> str:
    # MFAPI example returns DD-MM-YYYY
    dt = datetime.strptime(d, "%d-%m-%Y").date()
    return dt.isoformat()


# ----------------------------
# Sync jobs (run via CLI or API)
# ----------------------------
def sync_all_schemes(limit: Optional[int] = None, sleep_s: float = 0.15) -> int:
    session = make_session()
    conn = db_conn()
    payload = mfapi_get(session, "/mf")
    schemes = payload if isinstance(payload, list) else payload.get("data", [])
    count = 0
    for item in schemes:
        if limit is not None and count >= limit:
            break
        scheme_code = item.get("schemeCode")
        scheme_name = item.get("schemeName")
        if scheme_code and scheme_name:
            upsert_scheme(conn, int(scheme_code), str(scheme_name))
            count += 1
            if count % 200 == 0:
                conn.commit()
    conn.commit()
    conn.close()
    return count


def sync_latest_for_all_schemes(sleep_s: float = 0.15) -> int:
    """
    For every scheme_code in DB, call /mf/{scheme_code}/latest and store latest NAV row.
    """
    session = make_session()
    conn = db_conn()
    cur = conn.cursor()

    cur.execute("SELECT scheme_code FROM schemes ORDER BY scheme_code;")
    rows = cur.fetchall()

    inserted = 0
    for r in rows:
        scheme_code = int(r["scheme_code"])
        try:
            payload = mfapi_get(session, f"/mf/{scheme_code}/latest")
            data = payload.get("data", [])
            if not data:
                continue
            nav_date_iso = parse_ddmmyyyy_to_iso(data[0]["date"])
            nav_value = float(data[0]["nav"])
            upsert_nav(conn, scheme_code, nav_date_iso, nav_value)
            inserted += 1
            if inserted % 200 == 0:
                conn.commit()
        except Exception:
            # skip failures; keep going
            pass

        time.sleep(sleep_s)

    conn.commit()
    conn.close()
    return inserted


def sync_history_for_scheme(
    scheme_code: int,
    start_date: Optional[str] = None,  # YYYY-MM-DD
    end_date: Optional[str] = None,    # YYYY-MM-DD
    sleep_s: float = 0.1
) -> int:
    """
    Call /mf/{scheme_code}?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD and store NAV series.
    """
    session = make_session()
    conn = db_conn()

    params = {}
    if start_date:
        # Convert YYYY-MM-DD to DD-MM-YYYY for MFAPI
        y, m, d = start_date.split('-')
        params["startDate"] = f"{d}-{m}-{y}"
    if end_date:
        y, m, d = end_date.split('-')
        params["endDate"] = f"{d}-{m}-{y}"

    payload = mfapi_get(session, f"/mf/{scheme_code}", params=params if params else None)
    series = payload.get("data", [])
    inserted = 0

    for item in series:
        nav_date_iso = parse_ddmmyyyy_to_iso(item["date"])
        nav_value = float(item["nav"])
        upsert_nav(conn, scheme_code, nav_date_iso, nav_value)
        inserted += 1

    conn.commit()
    conn.close()
    time.sleep(sleep_s)
    return inserted


# ----------------------------
# Backtesting helpers
# ----------------------------
def load_nav_series(
    scheme_code: int, start: Optional[str], end: Optional[str]
) -> List[Tuple[date, float]]:
    conn = db_conn()
    cur = conn.cursor()

    q = "SELECT nav_date, nav FROM nav WHERE scheme_code=?"
    args: List[Any] = [scheme_code]

    if start:
        q += " AND nav_date >= ?"
        args.append(start)
    if end:
        q += " AND nav_date <= ?"
        args.append(end)

    q += " ORDER BY nav_date ASC"
    cur.execute(q, args)
    rows = cur.fetchall()
    conn.close()

    out: List[Tuple[date, float]] = []
    for r in rows:
        out.append((datetime.strptime(r["nav_date"], "%Y-%m-%d").date(), float(r["nav"])))
    return out


def backtest_lumpsum(series: List[Tuple[date, float]], amount: float) -> Dict[str, Any]:
    if not series:
        raise ValueError("No NAV data in this date range. Sync history first.")

    start_dt, start_nav = series[0]
    end_dt, end_nav = series[-1]

    units = amount / start_nav
    final_value = units * end_nav

    days = (end_dt - start_dt).days
    years = days / 365.25 if days > 0 else 0.0
    cagr = (final_value / amount) ** (1 / years) - 1 if years > 0 else None

    return {
        "start_date": start_dt.isoformat(),
        "end_date": end_dt.isoformat(),
        "start_nav": start_nav,
        "end_nav": end_nav,
        "invested": amount,
        "final_value": final_value,
        "absolute_return_pct": (final_value / amount - 1) * 100,
        "cagr_pct": (cagr * 100) if cagr is not None else None,
        "data_points": len(series),
    }


def backtest_sip_first_nav_each_month(series: List[Tuple[date, float]], monthly_amount: float) -> Dict[str, Any]:
    if not series:
        raise ValueError("No NAV data in this date range. Sync history first.")

    end_dt, end_nav = series[-1]

    units = 0.0
    invested = 0.0
    seen_months = set()

    for d, nav in series:
        key = (d.year, d.month)
        if key in seen_months:
            continue
        seen_months.add(key)

        units += monthly_amount / nav
        invested += monthly_amount

    final_value = units * end_nav

    return {
        "end_date": end_dt.isoformat(),
        "end_nav": end_nav,
        "months_invested": len(seen_months),
        "invested": invested,
        "final_value": final_value,
        "absolute_return_pct": (final_value / invested - 1) * 100 if invested > 0 else None,
        "data_points": len(series),
        "note": "SIP invests on the first available NAV day of each month in the range.",
    }


def comprehensive_backtest(
    series: List[Tuple[date, float]], 
    investment_type: str,
    lumpsum_amount: Optional[float] = None,
    sip_amount: Optional[float] = None,
    scheme_name: str = "Unknown"
) -> Dict[str, Any]:
    """
    Comprehensive backtest with all metrics for frontend.
    """
    if not series or len(series) < 2:
        raise ValueError("Need at least 2 data points for backtest")

    dates = [d for d, _ in series]
    navs = np.array([nav for _, nav in series], dtype=float)
    
    start_date = dates[0]
    end_date = dates[-1]
    days = (end_date - start_date).days
    years = days / 365.25
    
    if investment_type == "lump-sum":
        if lumpsum_amount is None:
            raise ValueError("lumpsum_amount required for lump-sum investment")
        
        start_nav = navs[0]
        end_nav = navs[-1]
        units = lumpsum_amount / start_nav
        
        # Portfolio value over time
        portfolio_values = (units * navs).tolist()
        total_invested = lumpsum_amount
        
    else:  # SIP
        if sip_amount is None:
            raise ValueError("sip_amount required for SIP investment")
        
        end_nav = navs[-1]
        units = 0.0
        total_invested = 0.0
        seen_months = set()
        portfolio_values = []
        
        for i, (d, nav) in enumerate(series):
            key = (d.year, d.month)
            if key not in seen_months:
                seen_months.add(key)
                units += sip_amount / nav
                total_invested += sip_amount
            
            portfolio_values.append(units * nav)
        
        portfolio_values = portfolio_values
    
    portfolio_values = np.array(portfolio_values, dtype=float)
    final_value = float(portfolio_values[-1])
    
    # Calculate returns
    daily_returns = np.diff(portfolio_values) / portfolio_values[:-1]
    
    # Metrics
    total_return = (final_value - total_invested) / total_invested
    cagr = (final_value / total_invested) ** (1 / years) - 1 if years > 0 else 0
    
    # Max drawdown
    peak = np.maximum.accumulate(portfolio_values)
    drawdown = (portfolio_values - peak) / peak
    max_drawdown = float(np.min(drawdown))
    
    # Volatility (annualized)
    volatility = np.std(daily_returns) * np.sqrt(252)
    
    # Sharpe ratio (assuming 0% risk-free rate)
    avg_daily_return = np.mean(daily_returns)
    sharpe_ratio = (avg_daily_return * 252) / (np.std(daily_returns) * np.sqrt(252)) if np.std(daily_returns) > 0 else 0
    
    # Best/worst day
    best_day_return = float(np.max(daily_returns))
    worst_day_return = float(np.min(daily_returns))
    
    # Positive days
    positive_days = int(np.sum(daily_returns > 0))
    total_trading_days = len(daily_returns)
    
    return {
        "scheme_code": None,
        "scheme_name": scheme_name,
        "investment_type": investment_type,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "lumpsum_amount": lumpsum_amount if investment_type == "lump-sum" else None,
        "sip_amount": sip_amount if investment_type == "sip" else None,
        "total_invested": total_invested,
        "final_value": float(final_value),
        "total_return": float(total_return),
        "cagr": float(cagr),
        "max_drawdown": float(max_drawdown),
        "volatility": float(volatility),
        "sharpe_ratio": float(sharpe_ratio),
        "avg_daily_return": float(avg_daily_return),
        "best_day_return": best_day_return,
        "worst_day_return": worst_day_return,
        "positive_days": positive_days,
        "total_trading_days": total_trading_days,
        "nav_dates": [d.isoformat() for d in dates],
        "portfolio_values": portfolio_values.tolist(),
        "daily_returns": daily_returns.tolist(),
    }


# ----------------------------
# FastAPI app (your backend API)
# ----------------------------
db_init()
app = FastAPI(title="MFAPI Backtesting Backend (SQLite cache)")
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_methods=["*"],
    allow_headers=["*"],
)

class SyncHistoryRequest(BaseModel):
    scheme_code: int
    startDate: Optional[str] = None  # YYYY-MM-DD
    endDate: Optional[str] = None    # YYYY-MM-DD


class LumpsumRequest(BaseModel):
    scheme_code: int
    startDate: str  # YYYY-MM-DD
    endDate: str    # YYYY-MM-DD
    amount: float


class SIPRequest(BaseModel):
    scheme_code: int
    startDate: str  # YYYY-MM-DD
    endDate: str    # YYYY-MM-DD
    monthly_amount: float


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/")
def root():
    return {
        "message": "MF Backtest API",
        "health": "/health",
        "scheme_search": "/api/schemes/search",
        "backtest": "/api/backtest",
    }


@app.get("/api/schemes/search")
def search_schemes(q: str):
    """Search schemes by code or name - used by frontend autocomplete"""
    if not q or len(q) < 1:
        return []
    
    conn = db_conn()
    cur = conn.cursor()
    
    # Search by both scheme_code and scheme_name
    cur.execute(
        """
        SELECT scheme_code, scheme_name
        FROM schemes
        WHERE scheme_code LIKE ? OR scheme_name LIKE ?
        ORDER BY scheme_name
        LIMIT 20
        """,
        (f"{q}%", f"%{q}%")
    )
    
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows


class BacktestRequest(BaseModel):
    scheme_code: int
    start_date: str  # YYYY-MM-DD
    end_date: str    # YYYY-MM-DD
    investment_type: str  # "lump-sum" or "sip"
    lumpsum_amount: Optional[float] = None
    sip_amount: Optional[float] = None


@app.post("/api/backtest")
def api_backtest(req: BacktestRequest):
    """Run comprehensive backtest with all metrics for frontend"""
    try:
        # Validate investment type
        if req.investment_type not in ["lump-sum", "sip"]:
            raise ValueError("investment_type must be 'lump-sum' or 'sip'")
        
        # Get scheme name
        conn = db_conn()
        cur = conn.cursor()
        cur.execute("SELECT scheme_name FROM schemes WHERE scheme_code = ?", (req.scheme_code,))
        row = cur.fetchone()
        conn.close()
        
        if not row:
            raise ValueError(f"Scheme code {req.scheme_code} not found")
        
        scheme_name = row["scheme_name"]
        
        # Load NAV series
        series = load_nav_series(req.scheme_code, req.start_date, req.end_date)
        print(f"Initial load: {len(series)} NAV records found for date range {req.start_date} to {req.end_date}")
        
        # If no data found, auto-sync the scheme's history
        if not series or len(series) < 2:
            try:
                print(f"Auto-syncing NAV data for scheme {req.scheme_code}...")
                # Auto-sync: fetch last 10 years of data from MFAPI
                inserted = sync_history_for_scheme(
                    scheme_code=req.scheme_code,
                    start_date=None,  # Get all available data
                    end_date=None,
                    sleep_s=0.1
                )
                print(f"Auto-sync completed: {inserted} NAV records inserted")
                # Retry loading after sync
                series = load_nav_series(req.scheme_code, req.start_date, req.end_date)
                print(f"After sync: {len(series)} NAV records found for date range {req.start_date} to {req.end_date}")
                
                # If still no data, try loading without date filter to see what we have
                if not series or len(series) < 2:
                    all_series = load_nav_series(req.scheme_code, None, None)
                    print(f"All NAV records for scheme {req.scheme_code}: {len(all_series)}")
                    if all_series:
                        print(f"Sample dates: {[d.isoformat() for d, _ in all_series[:5]]}")
                        # Use the most recent data available (last 365 days)
                        latest_date = max(d for d, _ in all_series)
                        start_date = (latest_date - timedelta(days=365)).isoformat()
                        series = load_nav_series(req.scheme_code, start_date, latest_date.isoformat())
                        print(f"Using recent data: {len(series)} records from {start_date} to {latest_date.isoformat()}")
                        if series and len(series) >= 2:
                            # Update the request dates for the response
                            req.start_date = start_date
                            req.end_date = latest_date.isoformat()
                        else:
                            raise ValueError(f"Scheme {req.scheme_code} has {len(all_series)} total NAV records, but none in recent date ranges. The fund may be discontinued.")
                    else:
                        raise ValueError(f"No NAV data available for scheme {req.scheme_code}. Sync may have failed: {str(sync_error)}")
            except Exception as sync_error:
                print(f"Auto-sync failed: {str(sync_error)}")
                # If sync fails, still raise the original "not enough data" error
                raise ValueError(f"No NAV data available for scheme {req.scheme_code}. Sync may have failed: {str(sync_error)}")
        
        # Run backtest
        result = comprehensive_backtest(
            series=series,
            investment_type=req.investment_type,
            lumpsum_amount=req.lumpsum_amount,
            sip_amount=req.sip_amount,
            scheme_name=scheme_name
        )
        
        result["scheme_code"] = req.scheme_code
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backtest failed: {str(e)}")


@app.get("/schemes")
def list_schemes(
    q: Optional[str] = Query(default=None, description="Search substring in scheme name"),
    limit: int = 50,
    offset: int = 0,
):
    conn = db_conn()
    cur = conn.cursor()

    if q:
        cur.execute(
            """
            SELECT scheme_code, scheme_name
            FROM schemes
            WHERE scheme_name LIKE ?
            ORDER BY scheme_name
            LIMIT ? OFFSET ?;
            """,
            (f"%{q}%", limit, offset),
        )
    else:
        cur.execute(
            """
            SELECT scheme_code, scheme_name
            FROM schemes
            ORDER BY scheme_name
            LIMIT ? OFFSET ?;
            """,
            (limit, offset),
        )

    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return {"count": len(rows), "items": rows}


@app.get("/nav/{scheme_code}")
def get_nav(
    scheme_code: int,
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
):
    series = load_nav_series(scheme_code, startDate, endDate)
    return {
        "scheme_code": scheme_code,
        "startDate": startDate,
        "endDate": endDate,
        "points": [{"date": d.isoformat(), "nav": nav} for d, nav in series],
    }


@app.post("/admin/sync/schemes")
def api_sync_schemes(limit: int = 100, sleep_s: float = 0.1):
    # NOTE: This can be long; best run via CLI in production.
    try:
        n = sync_all_schemes(limit=limit, sleep_s=sleep_s)
        return {"inserted_or_updated": n}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/admin/sync/latest")
def api_sync_latest(sleep_s: float = 0.15):
    # NOTE: This can be long; best run via CLI in production.
    try:
        n = sync_latest_for_all_schemes(sleep_s=sleep_s)
        return {"latest_nav_rows_upserted": n}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/admin/sync/history")
def api_sync_history(req: SyncHistoryRequest):
    try:
        n = sync_history_for_scheme(
            scheme_code=req.scheme_code,
            start_date=req.startDate,
            end_date=req.endDate,
        )
        return {"nav_rows_upserted": n}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/backtest/lumpsum")
def api_backtest_lumpsum(req: LumpsumRequest):
    series = load_nav_series(req.scheme_code, req.startDate, req.endDate)
    try:
        return backtest_lumpsum(series, req.amount)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/backtest/sip")
def api_backtest_sip(req: SIPRequest):
    series = load_nav_series(req.scheme_code, req.startDate, req.endDate)
    try:
        return backtest_sip_first_nav_each_month(series, req.monthly_amount)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ----------------------------
# DATA ANALYSIS ENDPOINTS
# ----------------------------

class ComparisonRequest(BaseModel):
    scheme_codes: List[int]
    start_date: str  # YYYY-MM-DD
    end_date: str    # YYYY-MM-DD
    investment_type: str = "lump-sum"  # "lump-sum" or "sip"
    lumpsum_amount: Optional[float] = 100000
    sip_amount: Optional[float] = 5000


class AnalysisRequest(BaseModel):
    scheme_codes: List[int]
    start_date: str
    end_date: str


@app.post("/api/compare-schemes")
def api_compare_schemes(req: ComparisonRequest):
    """
    Compare multiple schemes side-by-side with performance metrics.
    Returns comparison data with returns, volatility, Sharpe ratio, etc.
    """
    try:
        if len(req.scheme_codes) < 2:
            raise ValueError("At least 2 schemes required for comparison")
        if len(req.scheme_codes) > 10:
            raise ValueError("Maximum 10 schemes allowed for comparison")
        
        results = []
        conn = db_conn()
        
        for scheme_code in req.scheme_codes:
            # Get scheme name
            cur = conn.cursor()
            cur.execute("SELECT scheme_name FROM schemes WHERE scheme_code = ?", (scheme_code,))
            row = cur.fetchone()
            
            if not row:
                continue
            
            scheme_name = row["scheme_name"]
            
            # Load NAV series
            series = load_nav_series(scheme_code, req.start_date, req.end_date)
            
            if len(series) < 2:
                continue
            
            # Run backtest
            result = comprehensive_backtest(
                series=series,
                investment_type=req.investment_type,
                lumpsum_amount=req.lumpsum_amount if req.investment_type == "lump-sum" else None,
                sip_amount=req.sip_amount if req.investment_type == "sip" else None,
                scheme_name=scheme_name
            )
            
            result["scheme_code"] = scheme_code
            
            # Add to results (minimal data for comparison table)
            results.append({
                "scheme_code": scheme_code,
                "scheme_name": scheme_name,
                "final_value": result["final_value"],
                "total_invested": result["total_invested"],
                "total_return": result["total_return"],
                "total_return_pct": result["total_return"] * 100,
                "cagr": result["cagr"],
                "cagr_pct": result["cagr"] * 100,
                "max_drawdown": result["max_drawdown"],
                "max_drawdown_pct": result["max_drawdown"] * 100,
                "volatility": result["volatility"],
                "volatility_pct": result["volatility"] * 100,
                "sharpe_ratio": result["sharpe_ratio"],
                "positive_days": result["positive_days"],
                "total_trading_days": result["total_trading_days"],
                "win_rate": (result["positive_days"] / result["total_trading_days"]) if result["total_trading_days"] > 0 else 0,
            })
        
        conn.close()
        
        return {
            "comparison": results,
            "count": len(results),
            "start_date": req.start_date,
            "end_date": req.end_date,
            "investment_type": req.investment_type,
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Comparison failed: {str(e)}")


@app.post("/api/analyze-correlation")
def api_analyze_correlation(req: AnalysisRequest):
    """
    Analyze correlation and statistical relationships between multiple schemes.
    Returns correlation matrix, volatility comparison, and performance metrics.
    """
    try:
        if len(req.scheme_codes) < 2:
            raise ValueError("At least 2 schemes required for correlation analysis")
        if len(req.scheme_codes) > 8:
            raise ValueError("Maximum 8 schemes allowed for correlation analysis")
        
        # Load all series
        all_series = {}
        all_returns = {}
        scheme_names = {}
        conn = db_conn()
        
        for scheme_code in req.scheme_codes:
            cur = conn.cursor()
            cur.execute("SELECT scheme_name FROM schemes WHERE scheme_code = ?", (scheme_code,))
            row = cur.fetchone()
            
            if not row:
                continue
            
            scheme_names[scheme_code] = row["scheme_name"]
            series = load_nav_series(scheme_code, req.start_date, req.end_date)
            
            if len(series) < 2:
                continue
            
            all_series[scheme_code] = series
            
            # Calculate daily returns
            navs = np.array([nav for _, nav in series], dtype=float)
            returns = np.diff(navs) / navs[:-1]
            all_returns[scheme_code] = returns
        
        conn.close()
        
        if len(all_returns) < 2:
            raise ValueError("Not enough schemes with sufficient data for correlation")
        
        # Build correlation matrix
        scheme_codes_list = list(all_returns.keys())
        n = len(scheme_codes_list)
        
        # Prepare returns matrix (align all series to same length - use minimum)
        min_len = min(len(r) for r in all_returns.values())
        returns_matrix = np.array([all_returns[sc][:min_len] for sc in scheme_codes_list])
        
        # Calculate correlation matrix
        correlation_matrix = np.corrcoef(returns_matrix).tolist()
        
        # Calculate statistics for each scheme
        stats = []
        for scheme_code in scheme_codes_list:
            returns = all_returns[scheme_code]
            volatility = np.std(returns) * np.sqrt(252)
            avg_return = np.mean(returns) * 252
            sharpe = (avg_return / (volatility * np.sqrt(252))) if volatility > 0 else 0
            
            stats.append({
                "scheme_code": scheme_code,
                "scheme_name": scheme_names.get(scheme_code, "Unknown"),
                "annualized_volatility": float(volatility),
                "annualized_return": float(avg_return),
                "sharpe_ratio": float(sharpe),
                "daily_return_mean": float(np.mean(returns)),
                "daily_return_std": float(np.std(returns)),
                "max_daily_return": float(np.max(returns)),
                "min_daily_return": float(np.min(returns)),
            })
        
        return {
            "analysis_type": "correlation",
            "schemes_analyzed": len(scheme_codes_list),
            "start_date": req.start_date,
            "end_date": req.end_date,
            "correlation_matrix": {
                "scheme_codes": scheme_codes_list,
                "matrix": correlation_matrix,
            },
            "statistics": stats,
            "interpretation": {
                "strong_positive": "Correlation > 0.7",
                "moderate_positive": "0.3 < Correlation < 0.7",
                "weak_negative": "-0.3 < Correlation < 0.3",
                "moderate_negative": "-0.7 < Correlation < -0.3",
                "strong_negative": "Correlation < -0.7",
            }
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

