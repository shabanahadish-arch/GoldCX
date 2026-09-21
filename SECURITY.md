# Security Policy & Operational Safeguards

## 1. Safety Gates & Five-Gate Live Trading Protocol

Live order transmission is locked behind a strict five-condition verification gate:

```text
[ Gate 1: System Config ]  ENABLE_LIVE_TRADING=true
[ Gate 2: Execution Mode ] PAPER_MODE=false
[ Gate 3: Confirmation ]  LIVE_TRADING_CONFIRMATION=true
[ Gate 4: Account Rights ] User has explicit live-trading role
[ Gate 5: Operational ]   Data latency < 2000ms AND Kill Switch is OFF AND Daily Loss < Limit
```

If **any** condition fails, the execution pipeline immediately routes to `BLOCKED` status or rejects the order.

## 2. Secrets Management & Zero-Leakage Policy

1. **Zero Hardcoded Secrets**: No API keys, passwords, or tokens may exist in source control.
2. **Frontend Isolation**: No broker credentials or signing keys are ever transmitted to or stored in frontend bundles.
3. **Environment Injection**: Production deployments must source credentials from cloud secret managers (e.g., Google Secret Manager, HashiCorp Vault).

## 3. Reporting a Vulnerability

To report security vulnerabilities, open a private security advisory or contact `security@riskpilot.local`. Critical patches will be issued within 24 hours.
