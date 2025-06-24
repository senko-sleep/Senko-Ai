import os
from flask import Flask, send_from_directory

app = Flask(__name__, static_folder="html")

@app.route("/")
def serve_index():
    return send_from_directory(app.static_folder, "index.html")

@app.route("/html/<path:path>")
def serve_static(path):
    return send_from_directory(app.static_folder, path)

def start_bot():
    print("Bot started")
    # Add your bot startup code here (non-blocking)

if __name__ == "__main__":
    start_bot()
    port = int(os.getenv("PORT", 8080))
    app.run(host="0.0.0.0", port=port)
