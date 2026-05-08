"""Run the X-Files archive API."""

import uvicorn

from xfiles_api.config import ConfigLoader


def main() -> None:
    """Start the API server from environment settings."""
    settings = ConfigLoader().load()
    uvicorn.run(
        "xfiles_api.app:create_app",
        host=settings.host,
        port=settings.port,
        factory=True,
        log_level=settings.log_level.lower(),
    )


if __name__ == "__main__":
    main()
