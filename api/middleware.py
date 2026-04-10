"""
middleware.py
=============
FastAPI middleware and shared request lifecycle hooks.

IdempotencyMiddleware
---------------------
Intercepts mutating requests that carry an Idempotency-Key header and
short-circuits with the cached response if the key was already processed.

Note: the per-endpoint idempotency helpers in the routers handle the DB
read/write themselves. This middleware is a lightweight guard that can
reject replays before they even reach the route handler, useful when the
IdempotencyRecord table is on a fast read path (Redis in production).

For the current SQLite/dev setup, the middleware is registered but passes
through — the actual idempotency logic lives in the route handlers so it
stays testable without HTTP round-trips.
"""
import time
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class RequestTimingMiddleware(BaseHTTPMiddleware):
    """
    Adds X-Process-Time header to every response.
    Useful for spotting slow endpoints during development and monitoring.
    """
    async def dispatch(self, request: Request, call_next) -> Response:
        start = time.perf_counter()
        response = await call_next(request)
        elapsed = time.perf_counter() - start
        response.headers["X-Process-Time"] = f"{elapsed:.4f}s"
        return response
