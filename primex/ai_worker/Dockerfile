# syntax=docker/dockerfile:1

# AI detection worker. CPU inference by default — yolov8n at a 2s poll interval
# is cheap, and the CPU torch wheels keep the image ~2GB smaller than the CUDA
# ones. See docs/ai-worker-deploy.md for the GPU variant.
FROM python:3.11-slim

# libgl1 + libglib2.0-0: ultralytics depends on opencv-python (not the headless
# build), so `import cv2` fails without them even though nothing renders here.
# curl is used by HEALTHCHECK.
RUN apt-get update && apt-get install -y --no-install-recommends \
        libgl1 \
        libglib2.0-0 \
        curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    # ultralytics writes settings here at import; must be writable by the
    # runtime user or every start logs a warning.
    YOLO_CONFIG_DIR=/app/.ultralytics \
    # Volume-backed so events that failed to POST survive container recreation
    # and can still be replayed with replay_missed.py.
    MISSED_EVENTS_FILE=/data/missed_events.jsonl \
    HEALTH_PORT=8080

# CPU-only torch, installed first so ultralytics resolves against it instead of
# pulling the CUDA build. Swap the index URL (and the base image) for GPU.
RUN pip install --no-cache-dir \
        --index-url https://download.pytorch.org/whl/cpu \
        torch torchvision

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Bake the weights so a cold start doesn't depend on the ultralytics CDN being
# reachable — a restart during an incident shouldn't need the public internet.
RUN python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')" \
    && test -f yolov8n.pt

RUN useradd --create-home --uid 10001 worker \
    && mkdir -p /data /app/.ultralytics \
    && chown -R worker:worker /app /data
USER worker

EXPOSE 8080

# /health returns 503 when the worker is starting, and (since SEC-171) when the
# camera roster is stale or every camera is failing — so this actually catches
# a wedged worker rather than just a dead process.
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
    CMD curl -fsS "http://localhost:${HEALTH_PORT}/health" || exit 1

CMD ["python", "main.py"]
