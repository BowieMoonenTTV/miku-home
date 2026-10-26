#!/usr/bin/env python3
"""Miku Home Flatpak launcher.

Serves the bundled web app on 127.0.0.1 (inside the sandbox's private network
namespace, which has no route to the internet) and shows it in a WebKitGTK window.
Only microphone requests are granted; every other permission is denied and
navigation away from the local app is blocked.
"""
import functools
import http.server
import sys
import threading

import gi

gi.require_version("Gtk", "4.0")
gi.require_version("WebKit", "6.0")
from gi.repository import Gtk, WebKit  # noqa: E402

APP_ID = "io.github.BowieMoonenTTV.MikuHome"
APP_DIR = "/app/share/miku-home/app"


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".wasm": "application/wasm",
        ".webmanifest": "application/manifest+json",
        ".json": "application/json",
        ".svg": "image/svg+xml",
    }

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Permissions-Policy", "microphone=(self), camera=(), geolocation=()")
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def log_message(self, *args):
        pass  # no logs: nothing about the user is recorded


def start_server():
    handler = functools.partial(Handler, directory=APP_DIR)
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


class MikuHome(Gtk.Application):
    def __init__(self):
        super().__init__(application_id=APP_ID)
        self.server = start_server()
        self.origin = f"http://127.0.0.1:{self.server.server_address[1]}"

    def do_activate(self):
        win = self.props.active_window
        if win:
            win.present()
            return
        win = Gtk.ApplicationWindow(application=self, title="Miku Home")
        win.set_default_size(1000, 760)
        view = WebKit.WebView()
        s = view.get_settings()
        s.set_enable_media_stream(True)
        s.set_enable_webaudio(True)
        s.set_enable_developer_extras(False)
        s.set_enable_caret_browsing(False)
        view.connect("permission-request", self.on_permission)
        view.connect("decide-policy", self.on_policy)
        win.set_child(view)
        view.load_uri(self.origin + "/")
        win.present()

    def on_permission(self, _view, request):
        if isinstance(request, WebKit.UserMediaPermissionRequest) and \
                request.props.is_for_audio_device and not request.props.is_for_video_device:
            request.allow()
        else:
            request.deny()
        return True

    def on_policy(self, _view, decision, kind):
        if kind == WebKit.PolicyDecisionType.NAVIGATION_ACTION:
            uri = decision.get_navigation_action().get_request().get_uri()
            if not uri.startswith(self.origin):
                decision.ignore()
                return True
        return False


if __name__ == "__main__":
    sys.exit(MikuHome().run(sys.argv))
