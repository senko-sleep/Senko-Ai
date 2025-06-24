from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import webbrowser
import threading

app = FastAPI()

app.mount("/", StaticFiles(directory="HTML", html=True), name="static")

def open_browser():
    webbrowser.open("http://127.0.0.1:8080")

# This starts the browser automatically on script run
if __name__ == "__main__":
    import uvicorn
    threading.Timer(1.0, open_browser).start()
    uvicorn.run("main:app", host="0.0.0.0", port=8080)
