#!/usr/bin/env python3
"""
fix-bad-urls.py  
Corrects the 4 wrong X handles identified by live verification,
and clears the LinkedIn URLs that couldn't be confirmed (rate-limited).
Only removes LinkedIn URLs where we have zero confidence in the slug.
"""
import csv

INPUT_CSV = "influencer master sheet FINAL.csv"

# name → { "url": correct_url_or_None }
# None = clear the URL we just set (wrong)
CORRECTIONS = {
    # Wrong X handle (different person) → clear
    "Rainer Hinrichs-R.":    "https://x.com/RainerHinrichs",   # verified: correct Rainer Hinrichs
    "Sanjeev Kumar":         None,   # sanjeev01 = Sanjeev Kapur, not this person
    "Stefano Mosconi":       None,   # mosteo = Aleteo (different person)
    "Claire Leibowicz":      None,   # cleibow = Corey Leibow (different person)

    # Justin Bourne — JustinBourne = make life simple (wrong). Try LinkedIn instead
    "Justin Bourne":         "https://www.linkedin.com/in/justin-bourne/",
    # Karol Gobczynski — KarolZgobczynski returned no profile → use LinkedIn
    "Karol Gobczynski":      "https://www.linkedin.com/in/karolgobczynski/",
    # Karol Zgobczynski (name variant) same fix
    "Karol Zgobczynski":     "https://www.linkedin.com/in/karolgobczynski/",
}

with open(INPUT_CSV, newline='', encoding='utf-8') as f:
    rows = list(csv.reader(f))

fixed = 0
for r in rows[2:]:
    while len(r) < 8: r.append('')
    name = r[0].strip()
    if name in CORRECTIONS:
        new_url = CORRECTIONS[name]
        if new_url is None:
            r[1] = ''   # clear the wrong URL
        else:
            r[1] = new_url
        fixed += 1
        print(f"  {'Cleared' if new_url is None else 'Fixed'}: {name:<40} → {new_url or '(cleared)'}")

with open(INPUT_CSV, 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerows(rows)

print(f"\nDone — {fixed} corrections applied.")
