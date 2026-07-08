#!/usr/bin/env python3
"""
dedupe.py  –  Remove exact and near-duplicate rows from the master CSV.
For each duplicate group, keep the row with the most useful data.
"""
import csv, re

INPUT_CSV = "influencer master sheet FINAL.csv"

with open(INPUT_CSV, newline='', encoding='utf-8') as f:
    rows = list(csv.reader(f))

title_row  = rows[0]
header_row = rows[1]
data       = rows[2:]

def norm(s):   return re.sub(r'[^a-z0-9]', '', str(s).lower())
def filled(v): return str(v).strip().lower() not in ('', 'nan', '-')
def score(r):
    """Higher = more complete row. Used to pick the winner."""
    s = 0
    if r[1].strip().startswith('http') and 'linkedin.com/in/' in r[1]: s += 5
    if r[1].strip().startswith('http'): s += 3
    if filled(r[2]): s += 1   # handle
    if filled(r[4]): s += 2   # description
    if filled(r[6]): s += 2   # followers
    return s

# ── Explicit delete list  (0-based index into data[]) ─────────────────────────
# For each group, indices of rows to DELETE (keep the other one)
# Determined by inspecting output above: keep the row with the best URL + data

TO_DELETE_NAMES = {

    # Brij Kishore Pandey – keep [85] (has both follower counts combined)
    # → delete [122]
    "brij_dup2":         (122, "Brij Kishore Pandey"),

    # Carly Taylor – both identical; keep [92], delete [123]
    "carlytaylor_dup2":  (123, "Carly Taylor"),

    # Christina Stathopoulos – keep LinkedIn [109] (primary, more followers);
    # KEEP the X row too — same person but different platform links.
    # Actually two different platform URLs = keep both. → no delete.

    # Katrin-Cecile Ziegler – exact same person, same URL; keep hyphenated [295], delete [293]
    "katrin_dup1":       (293, "Katrin Cecile Ziegler"),

    # Matthew Berman / Matthewberman / Matt Berman
    # Matt Berman [369] has best URL (@matthew_berman YouTube). Keep [369].
    # Delete Matthew Berman [372] (YouTube Shorts link) and Matthewberman [374] (same)
    "mattberman_dup2":   (372, "Matthew Berman"),
    "mattberman_dup3":   (374, "Matthewberman"),

    # Tech Mode / TechMode / TechMode TV / TechModeTV
    # TechMode [574] has the real YouTube URL → keep that one
    # Delete: Tech Mode [572], TechMode TV [575], TechModeTV [576]
    "techmode_dup1":     (572, "Tech Mode"),
    "techmode_dup3":     (575, "TechMode TV"),
    "techmode_dup4":     (576, "TechModeTV"),

    # Toni Cowan Brown / Toni Cowan-brown – keep [603] (better followers), delete [602]
    "toni_dup1":         (602, "Toni Cowan Brown"),

    # Brandon Lee / M. Brandon Lee – different people (Brandon Lee = B2B LinkedIn;
    # M. Brandon Lee = YouTube creator). Keep both. → no delete.

    # Domagoj Lalk Vidovic / Domagoj Vidovic – same person, different name spellings.
    # Keep [156] (LinkedIn profile URL). Delete [157] (YouTube Shorts post URL).
    "domagoj_dup2":      (157, "Domagoj Vidovic"),

    # Dr. Sally Eaves / Sally Eaves – same person.
    # Keep [165] Dr. Sally Eaves (LinkedIn /dr-sally-eaves/ + 180K followers).
    "sally_dup2":        (517, "Sally Eaves"),

    # Eli Khnaser / Elias Khnaser – same person.
    # Keep [172] Elias Khnaser (real name, 270k followers). Delete [171].
    "eli_dup1":          (171, "Eli Khnaser"),

    # Eric Vyachelav / Eric Vyacheslav – typo duplicate.
    # Keep [183] Eric Vyacheslav (has LinkedIn URL + 375K). Delete [182].
    "eric_dup1":         (182, "Eric Vyachelav"),

    # Gemma Godfey / Gemma Godfrey – typo. Keep [197] Godfrey (has URL+followers). Delete [196].
    "gemma_dup1":        (196, "Gemma Godfey"),

    # Jason Hood / Jason K Hood – same person, same LinkedIn URL.
    # Keep [236] Jason Hood (121K followers). Delete [237].
    "jason_dup2":        (237, "Jason K Hood"),

    # Jonathan Adashek / Jonathan Adashek'S – keep [268] (has URL+followers). Delete [269].
    "jonathan_dup2":     (269, "Jonathan Adashek'S"),

    # Kevin Jackson / Kevin L. Jackson – check if same person:
    # [302] Kevin Jackson  linkedin.com/in/kjackson/  32K
    # [303] Kevin L. Jackson linkedin.com/in/kevinljackson/  – different slugs = likely same person
    # with two different profiles. Keep [302] (kjackson, 32K). Delete [303].
    "kevin_dup2":        (303, "Kevin L. Jackson"),

    # Kieran Gillmurray / Kieran Gilmurray – typo. Keep [309] Gilmurray (has URL). Delete [308].
    "kieran_dup1":       (308, "Kieran Gillmurray"),

    # Liv Grant / Olivia Grant – same Instagram handle (agenomicsphd). 
    # Keep [431] Olivia Grant (344K, more complete). Delete [335] Liv Grant.
    "liv_dup1":          (335, "Liv Grant"),

    # Nandan Mullakara / Nandan Mullarka / Nandan Mulukara – 3 typo variants of same person.
    # Keep [413] Nandan Mullarka (linkedin.com/in/nandanmullakara/ + 38K).
    # Delete [412] Nandan Mullakara (post URL) and [414] Nandan Mulukara (same real URL, 38000).
    "nandan_dup1":       (412, "Nandan Mullakara"),
    "nandan_dup3":       (414, "Nandan Mulukara"),

    # Neil Catermull / Neil Cattermull – typo. Keep [420] Cattermull (LinkedIn URL). Delete [419].
    "neil_dup1":         (419, "Neil Catermull"),

    # Rakesh Goel / Rakesh Gohel – different people (different LinkedIn slugs).
    # Keep both. → no delete.

    # Sabine Vanderlinden / Sabine Vanderline – typo. Keep [511] (has URL+followers). Delete [512].
    "sabine_dup2":       (512, "Sabine Vanderline"),

    # Steve Nouri / Steven Nouri – same person.
    # Keep [558] Steve Nouri (linkedin.com/in/stevenouri/ + 1.7M). Delete [559] Steven Nouri (post URL).
    "steve_dup2":        (559, "Steven Nouri"),

    # Uptal Chakraborty / Utpal Chakraborty – typo. Keep [614] Utpal (LinkedIn URL + 55K). Delete [613].
    "uptal_dup1":        (613, "Uptal Chakraborty"),

    # Vin Vashishta / Vin Vashista / Vin Vashistha – 3 variants of same person.
    # Keep [617] Vin Vashishta (204k, same LinkedIn URL). Delete [618] and [619].
    "vin_dup2":          (618, "Vin Vashista"),
    "vin_dup3":          (619, "Vin Vashistha"),
}

# Build set of (row_index, name) pairs to delete
delete_set = set()
for key, (idx, name) in TO_DELETE_NAMES.items():
    delete_set.add(idx)

# Also handle Brij Pandey [85] vs [122]: keep [85] but merge followers
# [85] has "665033.0 | 602802", [122] has "602802" — [85] is more complete, delete [122] ✓ (already above)

print(f"Deleting {len(delete_set)} duplicate rows:")
for idx in sorted(delete_set):
    r = data[idx]
    print(f"  [{idx}] {r[0].strip():<40} url={r[1][:50]}")

# Filter out deleted rows
new_data = [r for i, r in enumerate(data) if i not in delete_set]

with open(INPUT_CSV, 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(title_row)
    writer.writerow(header_row)
    writer.writerows(new_data)

print(f"\nBefore: {len(data)} rows  →  After: {len(new_data)} rows  (removed {len(data)-len(new_data)})")
