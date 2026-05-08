FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1

COPY pyproject.toml ./
COPY src ./src
RUN uv pip install --system .

EXPOSE 8000

CMD ["python", "-m", "xfiles_api"]

