"""Ground truth for WEATHER_FORECAST_VERIFY: GHCN-Daily TMAX (primary) and Open-Meteo ERA5 (cross-check).

GHCN-Daily comes from the NOAA Open Data Dissemination bucket (CC0-1.0 per the AWS Registry of Open Data
page, checked 2026-11-16), per-station files csv.gz/by_station/<ID>.csv.gz. Place coordinates come from the
Open-Meteo geocoder (GeoNames, CC BY 4.0). ERA5 is used only to cross-check labels, never as training data
(Open-Meteo's free API is non-commercial only). Everything is cached under DATA; downloaded files are only parsed,
never executed. Run with `python -I`.
"""
import gzip
import json
import math
import time
import unicodedata
import urllib.parse
import subprocess
import threading
from pathlib import Path

DATA = Path("C:/Users/hyada/tg-eval/data/weather")
NODD = "https://noaa-ghcn-pds.s3.amazonaws.com"
GEOCODER = "https://geocoding-api.open-meteo.com/v1/search"
ARCHIVE = "https://archive-api.open-meteo.com/v1/archive"
MAX_KM, MAX_ELEV_DIFF, MAX_STATIONS = 25.0, 150.0, 5


def curl(url, out=None, retries=3):
    for k in range(retries):
        cmd = ["curl.exe", "-4", "-s", "-L", "--max-time", "120", "-A", "Mozilla/5.0 (research; weather lane)"]
        cmd += ["-o", str(out), "-w", "%{http_code}", url] if out else [url]
        r = subprocess.run(cmd, capture_output=True)
        if out and r.stdout.decode().strip() == "200":
            return True
        if not out and r.returncode == 0 and r.stdout:
            return r.stdout
        time.sleep(1 + 2 * k)
    return False if out else None


def norm(s):
    return "".join(c for c in unicodedata.normalize("NFKD", s.lower()) if not unicodedata.combining(c)).strip()


def km(lat1, lon1, lat2, lon2):
    p1, p2 = math.radians(lat1), math.radians(lat2)
    a = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(math.radians(lon2 - lon1) / 2) ** 2
    return 12742.0 * math.asin(math.sqrt(a))


class Cache:
    def __init__(self, name):
        self.path = DATA / name
        self.d = json.loads(self.path.read_text(encoding="utf-8")) if self.path.exists() else {}

    def save(self):
        tmp = self.path.with_suffix(".tmp")
        tmp.write_text(json.dumps(self.d, ensure_ascii=False), encoding="utf-8")
        tmp.replace(self.path)


class Stations:
    """TMAX stations from the NODD stations and inventory files, bucketed on a 1-degree grid."""

    def __init__(self):
        nodd = DATA / "nodd"
        nodd.mkdir(parents=True, exist_ok=True)
        for f in ("ghcnd-stations.txt", "ghcnd-inventory.txt"):
            if not (nodd / f).exists() and not curl(f"{NODD}/{f}", nodd / f):
                raise RuntimeError(f"cannot fetch {f}")
        years = {}
        for line in (nodd / "ghcnd-inventory.txt").read_text(encoding="ascii", errors="replace").splitlines():
            if line[31:35] == "TMAX":
                years[line[0:11]] = (int(line[36:40]), int(line[41:45]))
        self.grid = {}
        for line in (nodd / "ghcnd-stations.txt").read_text(encoding="ascii", errors="replace").splitlines():
            sid = line[0:11]
            if sid in years:
                lat, lon, elev = float(line[12:20]), float(line[21:30]), float(line[31:37])
                rec = {"id": sid, "lat": lat, "lon": lon, "elev": None if elev < -900 else elev,
                       "name": line[41:71].strip(), "first": years[sid][0], "last": years[sid][1]}
                self.grid.setdefault((math.floor(lat), math.floor(lon)), []).append(rec)

    def near(self, lat, lon, elev, year):
        out = []
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                for s in self.grid.get((math.floor(lat) + dy, math.floor(lon) + dx), []):
                    d = km(lat, lon, s["lat"], s["lon"])
                    if d <= MAX_KM and s["first"] <= year <= s["last"] and (
                            elev is None or s["elev"] is None or abs(elev - s["elev"]) <= MAX_ELEV_DIFF):
                        out.append({**s, "km": round(d, 2)})
        return sorted(out, key=lambda s: (s["km"], s["id"]))[:MAX_STATIONS]


def station_tmax(sid):
    """{date: [tenths of degC, q_flag]} for one station, cached."""
    path = DATA / "ghcn_tmax" / f"{sid}.json"
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    path.parent.mkdir(parents=True, exist_ok=True)
    gz = DATA / "ghcn_tmp" / f"{sid}.{threading.get_ident()}.csv.gz"
    gz.parent.mkdir(parents=True, exist_ok=True)
    if not curl(f"{NODD}/csv.gz/by_station/{sid}.csv.gz", gz):
        return None
    out = {}
    with gzip.open(gz, "rt", encoding="utf-8", errors="replace") as f:
        for line in f:
            if ",TMAX," in line:
                p = line.rstrip("\n").split(",")
                if len(p) >= 6 and p[2] == "TMAX":
                    out[p[1]] = [int(p[3]), p[5]]
    path.write_text(json.dumps(out), encoding="utf-8")
    gz.unlink()
    return out


def ghcn_truth(stations, cand, date):
    """First station in distance order with an unflagged TMAX on that date, else None."""
    ymd = date.replace("-", "")
    for s in stations.near(cand["lat"], cand["lon"], cand.get("elev"), int(date[:4])):
        rows = station_tmax(s["id"])
        v = (rows or {}).get(ymd)
        if v and v[1] == "":
            return {"temp_max_c": v[0] / 10.0, "station": s["id"], "station_name": s["name"], "km": s["km"]}
    return None


def era5_truth(cache, cand, date):
    key = f"{cand['lat']:.4f},{cand['lon']:.4f},{date}"
    if key not in cache.d:
        q = urllib.parse.urlencode({"latitude": cand["lat"], "longitude": cand["lon"], "start_date": date,
                                    "end_date": date, "daily": "temperature_2m_max", "timezone": "auto"})
        body = curl(f"{ARCHIVE}?{q}")
        try:
            v = json.loads(body)["daily"]["temperature_2m_max"][0]
        except (TypeError, ValueError, KeyError, IndexError):
            return None
        cache.d[key] = v
        time.sleep(0.12)
    return cache.d[key]


def geocode(cache, name, admin1, cc, bare=False):
    """Candidates for a place. Qualified: the most populous match on country and admin1. Bare: top places by
    population (>= 20,000, at most 6, one per country and admin1) that share the name."""
    key = f"{name}|{admin1}|{cc}|{'bare' if bare else 'q'}"
    if key not in cache.d:
        q = urllib.parse.urlencode({"name": name, "count": 40 if bare else 20, "language": "en", "format": "json"})
        body = curl(f"{GEOCODER}?{q}")
        res = (json.loads(body).get("results") or []) if body else []
        res = [r for r in res if norm(r.get("name", "")) == norm(name)]
        if bare:
            res = [r for r in res if r.get("population", 0) >= 20000]
        else:
            res = [r for r in res if r.get("country_code") == cc
                   and (not admin1 or norm(r.get("admin1", "")) == norm(admin1))]
        res.sort(key=lambda r: -r.get("population", 0))
        out, seen = [], set()
        for r in res:
            k = (r.get("country_code"), r.get("admin1"))
            if k in seen:
                continue
            seen.add(k)
            out.append({"name": r["name"], "admin1": r.get("admin1", ""), "country": r.get("country", ""),
                        "cc": r.get("country_code", ""), "lat": r["latitude"], "lon": r["longitude"],
                        "elev": r.get("elevation"), "population": r.get("population", 0), "geonames_id": r["id"]})
        cache.d[key] = out[:6] if bare else out[:1]
        time.sleep(0.12)
    return cache.d[key]
