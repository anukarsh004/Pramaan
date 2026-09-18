"""Application bootstrap; run with uvicorn src.main:app from backend/."""

import logging
import sys
from collections.abc import AsyncGenerator, Awaitable, Callable
from contextlib import asynccontextmanager
from pathlib import Path
from uuid import uuid4

import jwt
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict

# Ensure backend root is on sys.path for direct execution
_backend_dir = str(Path(__file__).resolve().parent.parent)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from src.config.settings import Settings  # noqa: E402
from src.controllers.admin import router as admin_router  # noqa: E402
from src.controllers.auth import router as auth_router  # noqa: E402
from src.controllers.bidder import router as bidder_router  # noqa: E402
from src.controllers.documents import router as documents_router  # noqa: E402
from src.controllers.intelligence import router as intelligence_router  # noqa: E402
from src.controllers.mutations import router as mutations_router  # noqa: E402
from src.controllers.queries import router as queries_router  # noqa: E402
from src.errors import register_error_handlers  # noqa: E402
from src.repositories.database import Database  # noqa: E402

logger = logging.getLogger(__name__)


class HealthResponse(BaseModel):
    model_config = ConfigDict(frozen=True)

    status: str = "ok"


@asynccontextmanager
async def lifespan(application: FastAPI) -> AsyncGenerator[None, None]:
    settings: Settings = application.state.settings

    # Database
    database: Database | None = None
    if settings.database_url:
        db_url = settings.database_url.get_secret_value()
        database = Database(db_url)
        application.state.database = database
        await database.initialize()
        logger.info("Database connection pool created and schema initialized")
        
        if settings.environment == "development":
            from src.seed import seed_if_empty
            async with database.sessions() as session:
                async with session.begin():
                    await seed_if_empty(session)
    else:
        logger.warning("DATABASE_URL not set; database-dependent routes will return 503")

    # Keycloak JWKS client
    if settings.keycloak_issuer:
        jwks_url = f"{settings.keycloak_issuer}/protocol/openid-connect/certs"
        application.state.jwks_client = jwt.PyJWKClient(jwks_url)
        logger.info("JWKS client configured for %s", settings.keycloak_issuer)
    else:
        logger.warning("KEYCLOAK_ISSUER not set; auth will use dev bypass if enabled")

    yield

    # Shutdown
    if database is not None:
        await database.close()
        logger.info("Database connection pool closed")


def create_app(settings: Settings | None = None) -> FastAPI:
    resolved_settings = settings if settings is not None else Settings()

    application = FastAPI(
        title="Pramaan",
        version="0.1.0",
        debug=False,
        docs_url="/docs" if resolved_settings.environment == "development" else None,
        redoc_url=None,
        openapi_url="/openapi.json" if resolved_settings.environment == "development" else None,
        lifespan=lifespan,
    )
    application.state.settings = resolved_settings
    register_error_handlers(application)

    # CORS
    cors_origins = list(dict.fromkeys([resolved_settings.frontend_origin, "http://localhost:5173", "http://127.0.0.1:5173"]))
    application.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID"],
    )

    # Request correlation
    @application.middleware("http")
    async def correlate_request(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        request.state.request_id = str(uuid4())
        response = await call_next(request)
        response.headers["X-Request-ID"] = request.state.request_id
        return response

    import time
    
    # Profiling middleware
    @application.middleware("http")
    async def profile_request(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        start_time = time.perf_counter()
        response = await call_next(request)
        process_time = time.perf_counter() - start_time
        logger.info(
            "Request %s %s completed in %.2fms",
            request.method,
            request.url.path,
            process_time * 1000,
        )
        response.headers["X-Process-Time"] = str(process_time)
        return response

    # Health
    @application.get("/health", response_model=HealthResponse)
    async def health() -> HealthResponse:
        """Process liveness only; does not assert database or provider readiness."""
        return HealthResponse()

    # API routes
    application.include_router(auth_router, prefix="/api/v1")
    application.include_router(queries_router, prefix="/api/v1")
    application.include_router(mutations_router, prefix="/api/v1")
    application.include_router(admin_router, prefix="/api/v1")
    application.include_router(documents_router, prefix="/api/v1")
    application.include_router(bidder_router, prefix="/api/v1")
    application.include_router(intelligence_router, prefix="/api/v1")

    return application


app = create_app()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("src.main:app", host="127.0.0.1", port=8000, reload=True)
