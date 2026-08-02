import os
import requests
from dotenv import load_dotenv

load_dotenv()

OS_API_KEY = os.environ["OS_API_KEY"]
OS_WFS_ENDPOINT = "https://api.os.uk/features/v1/wfs"


def _query_wfs(type_name: str, bbox: tuple, srs: str = "EPSG:4326") -> dict:
    minx, miny, maxx, maxy = bbox
    params = {
        "key": OS_API_KEY,
        "service": "WFS",
        "version": "2.0.0",
        "request": "GetFeature",
        "typeNames": type_name,
        "bbox": f"{miny},{minx},{maxy},{maxx},{srs}",
        "outputFormat": "GEOJSON",
    }
    resp = requests.get(OS_WFS_ENDPOINT, params=params, timeout=10)
    resp.raise_for_status()
    return resp.json()

def query_os_open_roads(bbox: tuple) -> dict:
    layers = ["osfeatures:Zoomstack_RoadsNational",
              "osfeatures:Zoomstack_RoadsRegional",
              "osfeatures:Zoomstack_RoadsLocal"]
    all_features = []
    for layer in layers:
        result = _query_wfs(layer, bbox)
        all_features.extend(result.get("features", []))
    return {"type": "FeatureCollection", "features": all_features, "source_name": "OS Open Zoomstack (Roads)"}

def query_os_open_rivers(bbox: tuple) -> dict:
    result = _query_wfs("osfeatures:Zoomstack_Waterlines", bbox)
    result["source_name"] = "OS Open Zoomstack (Waterlines)"
    return result

def query_nwss(bbox: tuple) -> dict:
    result = _query_wfs("osfeatures:Zoomstack_Woodland", bbox)
    result["source_name"] = "OS Open Zoomstack (Woodland)"
    return result

def query_peat_layer(bbox: tuple) -> dict:
    raise NotImplementedError("No confirmed peat data source yet")