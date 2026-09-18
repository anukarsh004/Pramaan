FROM python:3.12-slim

WORKDIR /app

# Install system dependencies if required (e.g., for psycopg2 or argon2)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy python packaging files
COPY pyproject.toml ./

# Copy source code
COPY src/ ./src/
COPY alembic.ini ./
COPY migrations/ ./migrations/

# Install the application and its dependencies
RUN pip install --no-cache-dir .

# Expose port
EXPOSE 8000

# Run uvicorn
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
