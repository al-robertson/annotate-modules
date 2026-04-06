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

# --- Configuration ---
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
    """Convert an HTTP method + path into a snake_case tool name."""
    clean = re.sub(r"/v\d+/", "/", path)
    clean = re.sub(r"/\{[^}]+\}", "", clean)
    parts = [p for p in clean.strip("/").split("/") if p]

    verb_map = {
        "GET": "list" if not re.search(r"\{[^}]+\}$", path) else "get",
        "POST": "create",
        "PATCH": "update",
        "PUT": "update",
        "DELETE": "delete",
    }

    if method == "GET" and re.search(r"\{[^}]+\}", path):
        segments = path.strip("/").split("/")
        last = segments[-1]
        if last.startswith("{"):
            verb = "get"
        else:
            verb = "list"
    elif method == "POST" and re.search(r"\{[^}]+\}", path):
        verb = "assign"
    else:
        verb = verb_map.get(method, method.lower())

    name = "_".join([verb] + parts)
    if verb in ("get", "update", "delete", "create") and name.endswith("s"):
        name = name[:-1]
    return name


def _build_tool_description(method: str, path: str, operation: dict) -> str:
    """Build a clear tool description from the OpenAPI operation."""
    summary = operation.get("summary", "")
    description = operation.get("description", "")
    return f"{summary}\n\n{description}\n\nHTTP: {method.upper()} {path}".strip()


def _extract_parameters(path: str, operation: dict) -> dict[str, dict]:
    """Extract path and query parameters as a tool input schema."""
    props: dict[str, dict] = {}
    required: list[str] = []

    for param in operation.get("parameters", []):
        name = param["name"]
        schema = param.get("schema", {"type": "string"})
        props[name] = {
            "type": schema.get("type", "string"),
            "description": param.get("description", f"Path parameter: {name}"),
        }
        if param.get("required", param.get("in") == "path"):
            required.append(name)

    return {"properties": props, "required": required}


async def _call_api(
    method: str,
    path: str,
    path_params: dict[str, Any] | None = None,
    query_params: dict[str, Any] | None = None,
    body: dict[str, Any] | None = None,
) -> str:
    """Make an HTTP request to the FastAPI service and return the response."""
    url = BASE_URL + path
    if path_params:
        for key, value in path_params.items():
            url = url.replace(f"{{{key}}}", str(value))

    async with httpx.AsyncClient() as client:
        response = await client.request(
            method=method.upper(),
            url=url,
            params=query_params,
            json=body,
            timeout=30.0,
        )

    if response.status_code == 204:
        return json.dumps({"status": "success", "code": 204})

    try:
        data = response.json()
    except Exception:
        data = {"raw": response.text}

    return json.dumps({"status_code": response.status_code, "data": data}, indent=2)


def _load_config() -> dict:
    """Load the MCP endpoint exposure config from mcp_config.yaml."""
    if not CONFIG_PATH.is_file():
        return {"mode": "exclude", "endpoints": []}
    with open(CONFIG_PATH, "r") as f:
        config = yaml.safe_load(f) or {}
    return {
        "mode": config.get("mode", "exclude"),
        "endpoints": config.get("endpoints", []),
    }


def _matches_pattern(pattern: str, method: str, path: str) -> bool:
    """Check if a METHOD /path string matches a pattern with wildcards."""
    pat_method, pat_path = pattern.strip().split(None, 1)
    method_ok = pat_method == "*" or pat_method.upper() == method.upper()
    path_ok = fnmatch.fnmatch(path, pat_path)
    return method_ok and path_ok


def _is_endpoint_allowed(method: str, path: str, config: dict) -> bool:
    """Determine if an endpoint should be exposed based on config."""
    mode = config["mode"]
    patterns = config["endpoints"]

    if not patterns:
        return mode == "exclude"

    matched = any(_matches_pattern(p, method, path) for p in patterns)

    if mode == "include":
        return matched
    else:
        return not matched


def _register_tools_from_spec(spec: dict) -> None:
    """Parse the OpenAPI spec and register each operation as an MCP tool."""
    config = _load_config()
    paths = spec.get("paths", {})
    registered = 0
    skipped = 0

    for path, methods in paths.items():
        for method, operation in methods.items():
            if method not in ("get", "post", "patch", "put", "delete"):
                continue

            if not _is_endpoint_allowed(method.upper(), path, config):
                skipped += 1
                continue

            tool_name = _operation_to_tool_name(method.upper(), path)
            description = _build_tool_description(method.upper(), path, operation)

            _method = method.upper()
            _path = path
            _has_body = method in ("post", "patch", "put")
            _path_param_names = re.findall(r"\{(\w+)\}", path)
            _query_param_names = [
                p["name"]
                for p in operation.get("parameters", [])
                if p.get("in") == "query"
            ]

            async def tool_fn(
                _m=_method,
                _p=_path,
                _hb=_has_body,
                _ppn=_path_param_names,
                _qpn=_query_param_names,
                **kwargs: Any,
            ) -> str:
                path_params = {k: kwargs.pop(k) for k in list(_ppn) if k in kwargs}
                query_params = {k: kwargs.pop(k) for k in list(_qpn) if k in kwargs}
                body = kwargs if _hb and kwargs else None
                return await _call_api(_m, _p, path_params, query_params or None, body)

            tool_fn.__name__ = tool_name
            tool_fn.__doc__ = description

            mcp.tool(name=tool_name, description=description)(tool_fn)
            registered += 1

    print(f"Tools registered: {registered}, skipped: {skipped} (mode: {config['mode']})")


def load_spec_and_register() -> None:
    """Synchronously fetch the OpenAPI spec and register tools."""
    import httpx as _httpx

    resp = _httpx.get(BASE_URL + OPENAPI_PATH, timeout=10.0)
    resp.raise_for_status()
    spec = resp.json()
    _register_tools_from_spec(spec)


# --- Entry point ---
if __name__ == "__main__":
    print(f"Loading OpenAPI spec from {BASE_URL}{OPENAPI_PATH}...")
    load_spec_and_register()
    print("Tools registered. Starting MCP server...")
    mcp.run()
