FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY main.py .

# This service is intentionally tiny: it acts like a demo identity provider.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "9000"]
