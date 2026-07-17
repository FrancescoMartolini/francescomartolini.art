#!/usr/bin/env python3
"""
Server locale per testare il sito come si comporterebbe su GitHub Pages:
se un percorso non corrisponde a un file reale, serve 404.html invece
del 404 generico — proprio come fa GitHub Pages con /progetti/<id>.

Uso:
    python3 serve-locale.py
    (poi apri http://localhost:8000/)

Nota: in locale il sito gira alla radice (come farebbe con il dominio
personalizzato francescomartolini.art), non sotto il sottopercorso
/francescomartolini.art/ che ha ora su github.io. Il codice si adatta
comunque da solo in entrambi i casi (vedi BASE_PATH in js/libro.js).
"""

import http.server
import os

PORTA = 8000

class HandlerConFallback404(http.server.SimpleHTTPRequestHandler):
    def send_head(self):
        path = self.translate_path(self.path)
        if not os.path.exists(path) or os.path.isdir(path) and not os.path.exists(os.path.join(path, 'index.html')):
            self.path = '/404.html'
            # Risponde comunque con status 404, come farebbe GitHub Pages
            f = super().send_head()
            return f
        return super().send_head()

if __name__ == '__main__':
    with http.server.HTTPServer(('localhost', PORTA), HandlerConFallback404) as httpd:
        print(f"Sito in ascolto su http://localhost:{PORTA}/")
        print(f"Prova un link diretto, es: http://localhost:{PORTA}/progetti/PLAYLIST.00")
        httpd.serve_forever()
