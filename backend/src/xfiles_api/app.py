"""FastAPI application factory."""

from collections.abc import AsyncIterator, Iterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from xfiles_api.api.routes import router
from xfiles_api.config import ConfigLoader
from xfiles_api.context import AppContext


def create_app() -> FastAPI:
    """Create the configured API application."""
    settings = ConfigLoader().load()
    context = AppContext.from_settings(settings)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        context.start()
        app.state.context = context
        try:
            yield
        finally:
            context.close()

    app = FastAPI(
        title="X-Files Archive API",
        summary="Ingests, preserves, searches, and annotates released UAP records.",
        version="0.1.0",
        lifespan=lifespan,
    )
    app.state.context = context
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(router, prefix="/api")

    return app


def context_from_app(app: FastAPI) -> Iterator[AppContext]:
    """Yield the application context for framework integrations."""
    yield app.state.context
