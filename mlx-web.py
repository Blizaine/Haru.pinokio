"""Serve Haru's upstream browser UI with its MLX conversation backend."""

import argparse
import logging

from aiohttp import web
from haru.server import DemoServer
from haru_mlx.backends import LocalBackend


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, required=True)
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO)
    server = DemoServer(LocalBackend())
    web.run_app(server.build_app(), host=args.host, port=args.port, access_log=None)


if __name__ == "__main__":
    main()
