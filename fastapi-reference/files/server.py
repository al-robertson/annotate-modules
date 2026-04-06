"""
MCP server that exposes FastAPI endpoints as tools for AI agents.

Reads the OpenAPI spec from a running FastAPI instance and dynamically
registers each endpoint as an MCP tool. Agents can then call
`list_users`, `create_user`, `get_user`, etc. as native tools.

Which endpoints are exposed is controlled by `mcp_config.yaml`.

Usage:
    python -m mcp_server.server

Requires the FastAPI app to be running at the configured BASE_URL.
"""

import fnmatch
import json
import re
from pathlib import Path
from typing import Any

import httpx
import yaml
from mcp.server.fastmcp import FastMCP

BASE_URL = "http://127.0.0.1:8000"
OPENAPI_PATH = "/openapi.json"
CONFIG_PATH = Path(__file__).parent / "mcp_config.yaml"

mcp = FastMCP(
    "FastAPI Reference API",
    instructions=(
        "This MCP server exposes a FastAPI service's endpoints as tools. "
        "Each tool maps to an API endpoint. Use them to list, create, "
        "update, and delete resources."
    ),
)


def _operation_to_tool_name(method: str, path: str) -> str:
    clean = re.sub(r"/v\d+/", "/", path)
    clean = re.sub(r"/\{[^}]+\}", "", clean)
    parts = [p for p in clean.strip("/").split("/") if p]
    verb_map = {"GET": "list", "POST": "create", "PATCH": "update", "PUT": "update", "DELETE": "delete"}
    if method == "GET" and re.search(r"\{[^}]+\}", path):
        segments = path.strip("/").split("/")
        verb = "get" if segments[-1].startswith("{") else "list"
    elif method == "POST" and re.search(r"\{[^}]+\}", path):
        verb = "assign"
    else:
        verb = verb_map.get(method, method.lower())
    name = "_".join([verb] + parts)
    if verb in ("get", "update", "delete", "create") and name.endswith("s"):
        name = name[:-1]
    return name


def _build_tool_description(method, path, operation):
    summary = operation.get("summary", "")
    description = operation.get("description", "")
    return f"{summary}\n\n{description}\n\nHTTP: {method.upper()} {path}".strip()


async def _call_api(method, path, path_params=None, query_params=None, body=None):
    url = BASE_URL + path
    if path_params:
        for key, value in path_params.items():
            url = url.replace(f"{{{key}}}", str(value))
    async with httpx.AsyncClient() as client:
        response = await client.request(method=method.upper(), url=url, params=query_params, json=body, timeout=30.0)
    if response.status_code == 204:
        return json.dumps({"status": "success", "code": 204})
    try:
        data = response.json()
    except Exception:
        data = {"raw": response.text}
    return json.dumps({"status_code": response.status_code, "data": data}, indent=2)


def _load_config():
    if not CONFIG_PATH.is_file():
        return {"mode": "exclude", "endpoints": []}
    with open(CONFIG_PATH, "r") as f:
        config = yaml.safe_load(f) or {}
    return {"mode": config.get("mode", "exclude"), "endpoints": config.get("endpoints", [])}


def _matches_pattern(pattern, method, path):
    pat_method, pat_path = pattern.strip().split(None, 1)
    return (pat_method == "*" or pat_method.upper() == method.upper()) and fnmatch.fnmatch(path, pat_path)


def _is_endpoint_allowed(method, path, config):
    mode = config["mode"]
    patterns = config["endpoints"]
    if not patterns:
        return mode == "exclude"
    matched = any(_matches_pattern(p, method, path) for p in patterns)
    return matched if mode == "include" else not matched


def _register_tools_from_spec(spec):
    config = _load_config()
    registered = skipped = 0
    for path, methods in spec.get("paths", {}).items():
        for method, operation in methods.items():
            if method not in ("get", "post", "patch", "put", "delete"):
                continue
            if not _is_endpoint_allowed(method.upper(), path, config):
                skipped += 1
                continue
            tool_name = _operation_to_tool_name(method.upper(), path)
            description = _build_tool_description(method.upper(), path, operation)
            _method, _path = method.upper(), path
            _has_body = method in ("post", "patch", "put")
            _ppn = re.findall(r"\{(\w+)\}", path)
            _qpn = [p["name"] for p in operation.get("parameters", []) if p.get("in") == "query"]
            async def tool_fn(_m=_method, _p=_path, _hb=_has_body, _ppn=_ppn, _qpn=_qpn, **kwargs):
                pp = {k: kwargs.pop(k) for k in list(_ppn) if k in kwargs}
                qp = {k: kwargs.pop(k) for k in list(_qpn) if k in kwargs}
                body = kwargs if _hb and kwargs else None
                return await _call_api(_m, _p, pp, qp or None, body)
            tool_fn.__name__ = tool_name
            tool_fn.__doc__ = description
            mcp.tool(name=tool_name, description=description)(tool_fn)
            registered += 1
    print(f"Tools registered: {registered}, skipped: {skipped} (mode: {config['mode']})")


def load_spec_and_register():
    import httpx as _httpx
    resp = _httpx.get(BASE_URL + OPENAPI_PATH, timeout=10.0)
    resp.raise_for_status()
    _register_tools_from_spec(resp.json())


if __name__ == "__main__":
    print(f"Loading OpenAPI spec from {BASE_URL}{OPENAPI_PATH}...")
    load_spec_and_register()
    print("Tools registered. Starting MCP server...")
    mcp.run()
