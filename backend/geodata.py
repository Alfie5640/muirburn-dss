import os
import requests
import numpy as np
import rasterio
from rasterio.merge import merge
from rasterio.mask import mask
from rasterio.warp import calculate_default_transform, reproject, Resampling, transform_geom
from rasterio.io import MemoryFile
from dotenv import load_dotenv

load_dotenv()

OS_API_KEY = os.environ.get("OS_API_KEY")
OS_WFS_ENDPOINT = "https://api.os.uk/features/v1/wfs"
COPERNICUS_DEM_BASE = "https://copernicus-dem-30m.s3.amazonaws.com"


def _query_wfs(type_name: str, bbox: tuple, srs: str = "EPSG:4326") -> dict:
    if not OS_API_KEY:
        raise RuntimeError("OS_API_KEY is not set")
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


# -------------------------
# Slope (Copernicus DEM GLO-30)
# -------------------------

def _dem_tile_name(lat_deg: int, lon_deg: int) -> str:
    ns = "N" if lat_deg >= 0 else "S"
    ew = "E" if lon_deg >= 0 else "W"
    return f"Copernicus_DSM_COG_10_{ns}{abs(lat_deg):02d}_00_{ew}{abs(lon_deg):03d}_00_DEM"

def _tiles_for_bbox(bbox: tuple) -> set:
    minx, miny, maxx, maxy = bbox
    lat_lo, lat_hi = int(np.floor(miny)), int(np.floor(maxy))
    lon_lo, lon_hi = int(np.floor(minx)), int(np.floor(maxx))
    return {(lat, lon) for lat in range(lat_lo, lat_hi + 1) for lon in range(lon_lo, lon_hi + 1)}

def _fetch_dem_mosaic(bbox: tuple):
    datasets = []
    for lat, lon in _tiles_for_bbox(bbox):
        name = _dem_tile_name(lat, lon)
        url = f"{COPERNICUS_DEM_BASE}/{name}/{name}.tif"
        try:
            datasets.append(rasterio.open(url))
        except Exception:
            # Tile may not exist (e.g. bbox edge falls over sea/outside coverage) — skip it.
            continue

    if not datasets:
        raise RuntimeError("No Copernicus DEM coverage found for this location")

    mosaic, transform = merge(datasets)
    meta = datasets[0].meta.copy()
    meta.update({"height": mosaic.shape[1], "width": mosaic.shape[2], "transform": transform})
    for ds in datasets:
        ds.close()
    return mosaic, meta

def query_dem_slope(polygon: dict) -> dict:
    """
    Computes per-pixel slope (degrees) from Copernicus DEM GLO-30 over the
    burn site polygon. Reprojects to EPSG:27700 (British National Grid)
    first so gradients are computed in real metres, not degrees of latitude.
    Returns max / 95th-percentile / mean slope in degrees.
    """
    coords = polygon["geometry"]["coordinates"][0]
    lons = [pt[0] for pt in coords]
    lats = [pt[1] for pt in coords]
    bbox = (min(lons), min(lats), max(lons), max(lats))

    mosaic, meta = _fetch_dem_mosaic(bbox)

    with MemoryFile() as memfile:
        with memfile.open(**meta) as src:
            src.write(mosaic)

            dst_crs = "EPSG:27700"
            transform, width, height = calculate_default_transform(
                src.crs, dst_crs, src.width, src.height, *src.bounds
            )
            dst_meta = src.meta.copy()
            dst_meta.update({"crs": dst_crs, "transform": transform, "width": width, "height": height})

            with MemoryFile() as reproj_memfile:
                with reproj_memfile.open(**dst_meta) as dst:
                    reproject(
                        source=rasterio.band(src, 1),
                        destination=rasterio.band(dst, 1),
                        src_transform=src.transform,
                        src_crs=src.crs,
                        dst_transform=transform,
                        dst_crs=dst_crs,
                        resampling=Resampling.bilinear,
                    )

                    # The polygon is still in EPSG:4326 (lon/lat) — reproject it
                    # to match the raster's CRS before masking, or the shapes
                    # won't spatially overlap at all.
                    polygon_bng = transform_geom("EPSG:4326", dst_crs, polygon["geometry"])
                    clipped, clipped_transform = mask(dst, [polygon_bng], crop=True, nodata=np.nan)

    elevation = clipped[0].astype(float)
    cell_size = abs(clipped_transform.a)

    gy, gx = np.gradient(elevation, cell_size)
    slope_deg = np.degrees(np.arctan(np.sqrt(gx**2 + gy**2)))

    valid = slope_deg[~np.isnan(slope_deg)]
    if valid.size == 0:
        raise RuntimeError("No valid elevation data within the drawn polygon")

    return {
        "max_degrees": float(np.max(valid)),
        "p95_degrees": float(np.percentile(valid, 95)),
        "mean_degrees": float(np.mean(valid)),
        "source": "Copernicus DEM GLO-30",
    }