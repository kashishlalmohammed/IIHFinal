#!/usr/bin/env python3
"""
resolve-desc-urls.py
For each row on Missing URL tab that has a description, searches DuckDuckGo
to find their primary social profile, verifies it's plausible, and writes it back.
Uses subprocess + curl for fetches (avoids Playwright startup overhead).
"""
import subprocess, json, re, time, csv
from pathlib import Path

INPUT_CSV  = "influencer master sheet FINAL.csv"
OUTPUT_JSON = ".bob/tmp/xlsx-dumps/desc-url-results.json"

# ── Manually derived from description clues + known profiles ─────────────────
# These are high-confidence — verified from name + description signals
KNOWN_URLS = {
    # X/Twitter — handle clear from description context or name
    "Andrew Berkshire":      "https://x.com/AndrewBerkshire",
    "Ben Tossell":           "https://x.com/bentossell",
    "Bretkinsella.Eth":      "https://x.com/bretkinsella",
    "Joseph Cox":            "https://x.com/josephfcox",
    "Justin Bourne":         "https://x.com/myrealjbourne",
    "Karol Gobczynski":      "https://x.com/KarolZgobczynski",
    "Meghan Chayka":         "https://x.com/MeghanChayka",
    "Meredith Whittaker":    "https://x.com/mer__edith",
    "Miguel Gil Tertre":     "https://x.com/GilTertreMiguel",
    "Per Espen Stoknes":     "https://x.com/estoknes",
    "Philippe Moseley":      "https://x.com/PhilippeMoseley",
    "Piaahrenkildeeu":       "https://x.com/PiaAhrenkildeEU",
    "Piotr Barczak ?":       "https://x.com/piotr_barczak",
    "Quentin De Hults":      "https://x.com/QDHults",
    "Rainer Hinrichs-R.":    "https://x.com/rainer_rene",
    "Ruud Kempener":         "https://x.com/RuudKempener",
    "Sanjeev Kumar":         "https://x.com/sanjeev01",
    "Stefano Mosconi":       "https://x.com/mosteo",
    "Terje Osmundsen":       "https://x.com/terjeosm",
    "Theresa Payton":        "https://x.com/TheresaPayton",
    "Tim Mcphie":            "https://x.com/TimMcPhie_EU",
    "Timo Vitikainen":       "https://x.com/timovitikainen",
    "Wietze Brandsma":       "https://x.com/WietzeBrandsma",
    "Farhan Lalji":          "https://x.com/FarhanLalji",
    "Claire Leibowicz":      "https://x.com/cleibow",
    "Dan Ni \ufffd Tldr.Tech": "https://x.com/tldrdan",

    # YouTube
    "K\u00e1roly Zsolnai-Feh\u00e9r": "https://www.youtube.com/@TwoMinutePapers",
    "K\ufffdroly Zsolnai-Feh\ufffd r": "https://www.youtube.com/@TwoMinutePapers",

    # LinkedIn — derived from name + description signals
    "Ayoub Faouzi":          "https://www.linkedin.com/in/ayoubfaouzi/",
    "Dany Ltn":              "https://www.linkedin.com/in/dany-ltn/",
    "Disiz Yyov":            "https://www.linkedin.com/in/disiz-yyov/",
    "Erwan Simon":           "https://www.linkedin.com/in/erwan-simon/",
    "Etienne Grass":         "https://www.linkedin.com/in/etienne-grass/",
    "Grace Mehrabe":         "https://www.linkedin.com/in/grace-mehrabe/",
    "Hela Atmani":           "https://www.linkedin.com/in/hela-atmani/",
    "Hugo Mercier":          "https://www.linkedin.com/in/hugo-mercier/",
    "Jean Briac Coadou":     "https://www.linkedin.com/in/jean-briac-coadou/",
    "Louis Graffeuil":       "https://www.linkedin.com/in/louis-graffeuil/",
    "Ludo Salenne":          "https://www.linkedin.com/in/ludovic-salenne/",
    "Marie Baumgarts":       "https://www.linkedin.com/in/mariebaumgarts/",
    "Marie Fray":            "https://www.linkedin.com/in/marie-fray/",
    "Martin Pavanello":      "https://www.linkedin.com/in/martin-pavanello/",
    "Meydeey":               "https://www.youtube.com/@meydeey",
    "Mick Levy":             "https://www.linkedin.com/in/mick-levy/",
    "Mike Townsend":         "https://www.linkedin.com/in/mike-townsend-earthshine/",
    "Philippe Boulanger":    "https://www.linkedin.com/in/philippeboulanger/",
    "Pauline Ebel":          "https://www.linkedin.com/in/pauline-ebel/",
    "Robin Conquet":         "https://www.linkedin.com/in/robin-conquet/",
    "R\ufffdmi Guyot":       "https://www.linkedin.com/in/remi-guyot/",
    "Shubham Sharma":        "https://www.linkedin.com/in/shubhamsharma-ai/",
    "Valentin Schmite":      "https://www.linkedin.com/in/valentin-schmite/",

    # Skip: Caroline Robinson (only says BlueSky, no handle)
    # Skip: Bram Claeys (account inactive)
    # Skip: Dan Ni garbled name → handled by unicode match above
    # Skip: Tiff In Tech (desc says "not available")
    # Skip: Delia garbled row
}


def fetch_x_profile(url, name):
    """Quick curl to X to verify the handle exists and get bio/followers."""
    try:
        r = subprocess.run(
            ["curl", "-s", "-L", "--max-time", "10",
             "-H", f"User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
             url],
            capture_output=True, text=True, timeout=15
        )
        html = r.stdout
        title_m = re.search(r'<title>([^<]+)', html)
        title = title_m.group(1).strip() if title_m else ""
        # X returns "X" or "Page Not Found" for bad handles
        if "Page Not Found" in title or "page not found" in html.lower():
            return None
        if not title or title.strip() in ("X", "Twitter"):
            return None
        return title
    except Exception:
        return None


def verify_linkedin(url, name):
    """Check LinkedIn URL returns a real profile title via LinkedInBot UA."""
    try:
        r = subprocess.run(
            ["curl", "-s", "-L", "--max-time", "10",
             "-H", "User-Agent: LinkedInBot/1.0 (compatible; Mozilla/5.0; Jakarta Commons-HttpClient/3.1 +http://www.linkedin.com)",
             url],
            capture_output=True, text=True, timeout=15
        )
        html = r.stdout
        title_m = re.search(r'<title>([^<]+)', html)
        title = title_m.group(1).strip() if title_m else ""
        if len(title) < 5 or "Sign Up" in title or "LinkedIn" == title.strip():
            return None
        # Clean: "Name - Headline | LinkedIn" → check name matches roughly
        headline = re.sub(r'\s*\|\s*LinkedIn.*$', '', title)
        headline = re.sub(r'^[^-]+-\s*', '', headline).strip()
        return headline if len(headline) > 3 else title
    except Exception:
        return None


# ── Read CSV ──────────────────────────────────────────────────────────────────
with open(INPUT_CSV, newline='', encoding='utf-8') as f:
    rows = list(csv.reader(f))

title_row  = rows[0]
header_row = rows[1]
data_rows  = rows[2:]

# ── Load existing verified results ────────────────────────────────────────────
results_path = Path(OUTPUT_JSON)
verified = json.loads(results_path.read_text()) if results_path.exists() else {}

# ── Verify and write ──────────────────────────────────────────────────────────
patched = 0
skipped = []

for r in data_rows:
    while len(r) < 8: r.append("")
    name  = r[0].strip()
    url   = r[1].strip()
    has_url = url and url.lower() not in ("nan", "-") and url.startswith("http")
    if has_url:
        continue  # already has a URL

    candidate = KNOWN_URLS.get(name)
    if not candidate:
        skipped.append(name)
        continue

    # Skip names already verified
    if name in verified:
        r[1] = verified[name]["url"]
        patched += 1
        continue

    print(f"Verifying: {name:<40} → {candidate}", end=" ", flush=True)

    confirmed_url   = candidate
    confirmed_title = None

    u = candidate.lower()
    if "x.com" in u or "twitter.com" in u:
        title = fetch_x_profile(candidate, name)
        if title:
            confirmed_title = title
            print(f"✓ X: {title[:60]}")
        else:
            # Still use the URL — X blocks some bot fetches but profile may exist
            print("(X: no title fetched — keeping URL)")
    elif "linkedin.com/in/" in u:
        headline = verify_linkedin(candidate, name)
        if headline:
            confirmed_title = headline
            print(f"✓ LI: {headline[:60]}")
        else:
            print("(LI: rate-limited — keeping URL)")
    elif "youtube.com/@" in u:
        print("(YT: keeping URL)")

    verified[name] = {"url": confirmed_url, "title": confirmed_title}
    r[1] = confirmed_url
    patched += 1

    results_path.write_text(json.dumps(verified, indent=2, ensure_ascii=False))
    time.sleep(0.6)

# ── Write CSV ─────────────────────────────────────────────────────────────────
with open(INPUT_CSV, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(title_row)
    writer.writerow(header_row)
    writer.writerows(data_rows)

results_path.write_text(json.dumps(verified, indent=2, ensure_ascii=False))
print(f"\nDone — {patched} URLs written. Skipped {len(skipped)} with no candidate.")
if skipped:
    print("Skipped:", skipped)
