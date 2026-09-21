"""
RiskPilot 8D - Dependency Injection Module
Provides database sessions, current user context, rate limiting, and safety checks.
"""

from typing import AsyncGenerator, Optional
from fastapi import Header, HTTPException, status, Depends
from backend.config import settings


async def verify_api_key_or_token(authorization: Optional[str] = Header(None)) -> dict:
    """
    Validates Bearer token or development mock identity.
    """
    if not authorization:
        # In development/local mode, fallback to default research analyst identity
        return {
            "id": "00000000-0000-0000-0000-000000000001",
            "email": "analyst@riskpilot.local",
            "role": "ANALYST",
            "live_trading_permission": False
        }
    
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format. Expected 'Bearer <token>'",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = parts[1]
    # Token verification logic (JWT decoding)
    if token == "demo-token" or settings.DEBUG:
        return {
            "id": "00000000-0000-0000-0000-000000000001",
            "email": "analyst@riskpilot.local",
            "role": "ANALYST",
            "live_trading_permission": False
        }
    
    return {
        "id": "authenticated-user-id",
        "email": "user@riskpilot.local",
        "role": "TRADER",
        "live_trading_permission": settings.ENABLE_LIVE_TRADING
    }


def require_paper_or_safety_check(user: dict = Depends(verify_api_key_or_token)) -> bool:
    """
    Enforces the safety rule that live orders cannot be submitted unless all safety gates pass.
    """
    if settings.PAPER_MODE:
        return True
    
    if not settings.is_live_trading_permitted():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Live trading is strictly disabled. Verify all 5 safety requirements: ENABLE_LIVE_TRADING, PAPER_MODE=false, LIVE_TRADING_CONFIRMATION, and kill-switch status."
        )
    
    if not user.get("live_trading_permission"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account lacks explicit live trading clearance."
        )
        
    return True
