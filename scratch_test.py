# scratch_test.py
from geodata import query_os_open_rivers

test_bbox = (-3.40, 56.99, -3.30, 57.05)  # min_lon, min_lat, max_lon, max_lat

result = query_os_open_rivers(test_bbox)
print("Feature count:", len(result.get("features", [])))
print("Source:", result.get("source_name"))

if result.get("features"):
    first = result["features"][0]
    print("First feature properties:", first.get("properties"))
    print("First feature geometry type:", first.get("geometry", {}).get("type"))
else:
    print("No features found in this bbox — try a different location or check bbox is right.")