from flask import Flask, send_from_directory
import webbrowser
import threading

app = Flask(__name__, static_folder="html")

@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

def open_browser():
    webbrowser.open('http://127.0.0.1:5000/')

if __name__ == '__main__':
    threading.Timer(1.0, open_browser).start()
    app.run(debug=False)
