#!/usr/bin/env python3
"""Fetch ESPN's scoreboard, slim it, and bake it into docs/index.html as the offline snapshot."""
import json, sys, urllib.request, datetime, pathlib
ROOT = pathlib.Path(__file__).parent
API = "https://cdn.espn.com/core/college-football/scoreboard?xhr=1&group={g}"

def fetch(g):
    with urllib.request.urlopen(API.format(g=g), timeout=20) as r:
        d = json.load(r)
    return d["content"]["sbData"] if "content" in d else d

def slim_event(ev, fcs=False):
    c = ev["competitions"][0]
    comps = []
    for t in c["competitors"]:
        tm = t["team"]
        comps.append({"homeAway": t["homeAway"], "score": t.get("score", "0"),
                      "curatedRank": t.get("curatedRank", {}),
                      "team": {k: tm.get(k) for k in ("id", "abbreviation", "shortDisplayName", "displayName", "location", "name", "logo", "color")}})
    sit = dict(c.get("situation") or {})
    if "lastPlay" in sit:
        lp = sit["lastPlay"]
        sit["lastPlay"] = {"text": lp.get("text"), "probability": lp.get("probability"), "drive": lp.get("drive")}
    odds = []
    for o in (c.get("odds") or [])[:1]:
        def strip(x):
            if isinstance(x, dict): return {k: strip(v) for k, v in x.items() if k not in ("link", "logo", "uid", "tracking", "team", "header", "footer")}
            if isinstance(x, list): return [strip(v) for v in x]
            return x
        o2 = strip(o); o2["provider"] = {"name": (o.get("provider") or {}).get("name")}
        odds.append(o2)
    out = {"id": ev["id"], "date": ev["date"], "name": ev.get("name"), "shortName": ev.get("shortName"),
           "status": ev.get("status"),
           "links": [l for l in ev.get("links", []) if "summary" in l.get("rel", [])],
           "competitions": [{"competitors": comps, "situation": sit, "status": c.get("status"),
                             "broadcasts": c.get("broadcasts", []), "notes": c.get("notes", []), "odds": odds}]}
    if fcs: out["__fcs"] = True
    return out

def main():
    fbs = fetch(80)
    try: fcs = fetch(81)
    except Exception: fcs = {"events": []}
    seen, events = set(), []
    for e in fbs["events"]: seen.add(e["id"]); events.append(slim_event(e))
    for e in fcs["events"]:
        if e["id"] not in seen: events.append(slim_event(e, fcs=True))
    snap = {"takenAt": datetime.datetime.now(datetime.timezone.utc).isoformat(), "events": events}
    js = json.dumps(snap, separators=(",", ":")).replace("</", "<\\/")
    html = (ROOT / "src/index.template.html").read_text().replace("__SNAPSHOT__", js)
    (ROOT / "docs/index.html").write_text(html)
    live = sum(1 for e in events if e["status"]["type"]["state"] == "in")
    print(f"built docs/index.html: {len(events)} events ({live} live), snapshot {len(js)//1024} KB")

if __name__ == "__main__":
    main()
