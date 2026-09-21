# Threat Model & Risk Analysis (STRIDE)

| Threat Category | Potential Vector | Mitigation in RiskPilot 8D |
| :--- | :--- | :--- |
| **Spoofing** | Unauthorized order injection / fake market data | JWT tokens, HMAC signatures on webhooks, Strict UTC monotonic timestamp validation. |
| **Tampering** | Parameter manipulation in backtest/risk calculator | Pydantic strict model bounds validation; read-only historical bar storage with hash verification. |
| **Repudiation** | Denying placed simulated or live orders | Append-only `audit_logs` table recording user ID, IP address, exact params, and timestamp. |
| **Information Disclosure** | Broker API secrets leaked in client browser or logs | Server-side credential isolation; sanitized error logging stripping tokens & auth headers. |
| **Denial of Service** | High-frequency API request flooding / bad tick storms | In-memory token bucket rate limiting (120 req/min); candle builder outlier filtering. |
| **Elevation of Privilege** | Analyst executing live orders | Role-Based Access Control (`ANALYST` vs `TRADER` vs `ADMIN`); Five-Gate Live Trading Lockout. |
