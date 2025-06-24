import os
import asyncio
from aiohttp import web

# Serve index.html at /
async def handle_index(request):
    index_file = os.path.join(os.getcwd(), "html", "index.html")
    if os.path.isfile(index_file):
        return web.FileResponse(index_file)
    return web.Response(text="index.html not found", status=404)

async def start_web_server():
    app = web.Application()
    app.router.add_get("/", handle_index)
    app.router.add_static("/html", path=os.path.join(os.getcwd(), "html"), name="html")
    runner = web.AppRunner(app)
    await runner.setup()
    # Render usually expects port from env or 8080 fallback
    port = int(os.getenv("PORT", 8080))
    site = web.TCPSite(runner, "0.0.0.0", port)
    await site.start()
    print(f"Web server started at http://0.0.0.0:{port}")
    return runner

# Stub async bot runner (replace with your actual bot startup)
async def start_bot():
    print("Bot started")
    while True:
        await asyncio.sleep(3600)  # Keep running

async def main():
    runner = await start_web_server()
    try:
        await asyncio.gather(
            start_bot(),
        )
    finally:
        await runner.cleanup()

if __name__ == "__main__":
    asyncio.run(main())
