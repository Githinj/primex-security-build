"""AI Detection Worker — entry point."""

import asyncio
import logging
import os

from aiohttp import web
from dotenv import load_dotenv

from config import load_config
from supervisor import Supervisor

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

load_dotenv()

supervisor: Supervisor | None = None


async def health_handler(request: web.Request) -> web.Response:
    if supervisor is None:
        return web.json_response({"status": "starting"}, status=503)
    return web.json_response(supervisor.get_health())


async def start_worker(app: web.Application):
    global supervisor
    config = load_config()
    logger.info(f"Worker config loaded: threshold={config.confidence_threshold}, interval={config.snapshot_interval_s}s")
    supervisor = Supervisor(config)
    asyncio.create_task(supervisor.run())


def main():
    app = web.Application()
    app.router.add_get("/health", health_handler)
    app.on_startup.append(start_worker)

    port = int(os.environ.get("HEALTH_PORT", "8080"))
    logger.info(f"Starting AI worker (health on :{port})")
    web.run_app(app, host="0.0.0.0", port=port)


if __name__ == "__main__":
    main()
