# RiskPilot 8D: Multidimensional Real-Time Market-Risk Platform

> **Disclaimer**: RiskPilot 8D is an original quantitative research and decision-support framework. It provides probabilistic risk diagnostics, adaptive range boundaries, higher-timeframe pivots, and scenario testing. It does **not** provide financial advice, make price forecasts, or guarantee profitability. Live trading is strictly disabled by default.

---

## Architecture Overview

RiskPilot 8D calculates eight orthogonal risk dimensions across multiple timeframes, synthesizing them into bounded composite scores $[-100, +100]$, confidence percentages $[0, 100\%]$, and coverage metrics:

1. **Dimension 1 (Zone Location Risk)**: Quantifies price penetration within $N=7$ rolling range bands.
2. **Dimension 2 (Time & Regime Risk)**: Evaluates trend duration, regime aging, and time elapsed since local breakout/reversal.
3. **Dimension 3 (Trend Health Risk)**: Measures EMA slope, trend strength, moving average alignment, and VWAP displacement.
4. **Dimension 4 (Price Action Perception Risk)**: Calculates candle body-to-range ratios, close location values (CLV), and rejection signatures.
5. **Dimension 5 (Sudden Movement Risk)**: Monitors ATR expansion, range percentiles, volatility surges, and volume spikes.
6. **Dimension 6 (Conditional Confirmation Risk)**: User-toggleable checklist of momentum, volume, and multi-timeframe alignment conditions.
7. **Dimension 7 (Event Risk)**: Tracks macro calendar announcements and enforces pre/post event blackout windows.
8. **Dimension 8 (Family & Market-Context Risk)**: Compares asset dynamics against benchmark index and sector correlation (returns `UNAVAILABLE` if missing).

---

## Operating Modes

1. **Backtest Mode**: Sequential historical simulation without look-ahead bias, factoring in fees, slippage, and spread.
2. **Replay Mode**: Stream historical OHLCV data tick-by-tick or bar-by-bar with variable playback speed multipliers.
3. **Paper-Trading Mode** *(Default)*: Full simulated order management system (OMS) with risk limit enforcement.
4. **Live-Alert Mode**: Live streaming data with webhook/alert dispatching, with zero order placement capabilities.
5. **Live-Trading Mode**: Hard-disabled in initial release. Requires passing five strict safety gates to enable.

---

## Quick Start Guide

### Option 1: Docker Compose (Full Stack)

```bash
# 1. Clone repository and setup environment
cp .env.example .env

# 2. Start PostgreSQL, Redis, FastAPI Backend, and React Frontend
docker-compose up -d --build

# 3. Check service health
curl http://localhost:8000/health
```

Access points:
- **Frontend Dashboard**: `http://localhost:3000`
- **FastAPI OpenAPI Documentation**: `http://localhost:8000/docs`
- **PostgreSQL / TimescaleDB**: `localhost:5432`
- **Redis Cache**: `localhost:6379`

### Option 2: Local Python Backend & Vite Frontend

#### Backend (Python 3.12+)
```bash
python3.12 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run FastAPI dev server
uvicorn backend.main:app --reload --port 8000
```

#### Frontend (Node 20+)
```bash
npm install
npm run dev
```

---

## Verification & Testing

```bash
# Run unit tests
pytest tests/unit -v

# Run integration tests
pytest tests/integration -v

# Code formatting & linting
ruff check .
mypy backend engine risk
```
