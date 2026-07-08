#!/usr/bin/env python3
"""
fetch-linkedin.py
Fetches LinkedIn headlines using LinkedInBot UA.
Outputs: linkedin-data.json { name: { desc, title } }
"""
import subprocess, json, re, sys, time
from pathlib import Path

OUTPUT = Path(".bob/tmp/xlsx-dumps/linkedin-data.json")
existing = json.loads(OUTPUT.read_text()) if OUTPUT.exists() else {}

def fetch_linkedin(url, name):
    """Fetch LinkedIn profile using bot UA, extract headline from title."""
    url = url.split("\n")[0].strip().rstrip("/") + "/"
    try:
        result = subprocess.run([
            "curl", "-s", "-L", "--max-time", "12",
            "-H", "User-Agent: LinkedInBot/1.0 (compatible; Mozilla/5.0; Jakarta Commons-HttpClient/3.1 +http://www.linkedin.com)",
            "-H", "Accept: text/html,application/xhtml+xml",
            "-H", "Accept-Language: en-US,en;q=0.9",
            url
        ], capture_output=True, text=True, timeout=15)
        html = result.stdout
        
        # Extract headline from title: "Name - Headline | LinkedIn"
        m_title = re.search(r'<title>([^<]+)', html)
        if not m_title:
            return None
        title = m_title.group(1).strip()
        
        # Remove "Name - " prefix and "| LinkedIn" suffix
        headline = re.sub(r'^[^-]+-\s*', '', title)
        headline = re.sub(r'\s*[\|]\s*LinkedIn.*$', '', headline).strip()
        
        # Skip bad headlines (too short, generic, or error pages)
        if len(headline) < 5 or headline.lower() in ['linkedin', 'sign up', 'join linkedin', 'page not found']:
            # Try og:description instead
            m_og = re.search(r'property="og:description"\s+content="([^"]+)"', html)
            if not m_og:
                m_og = re.search(r'content="([^"]+)"\s+property="og:description"', html)
            if m_og:
                headline = m_og.group(1).strip()[:300]
            else:
                return None
        
        # Clean up: remove emoji-heavy text, truncate URLs
        headline = re.sub(r'https?://\S+', '', headline).strip()
        headline = headline[:250].strip()
        
        return { "desc": headline }
    except Exception as e:
        print(f"  Error: {e}", file=sys.stderr)
        return None

# Read CSV to get work list
import csv, io

csv_text = open("influencer master sheet FINAL.csv").read()

def split_records(text):
    records, cur, inq = [], "", False
    for i, ch in enumerate(text):
        if ch == '"':
            if inq and i+1 < len(text) and text[i+1] == '"':
                cur += '"'
            else:
                inq = not inq
            cur += ch
        elif ch == '\n' and not inq:
            records.append(cur); cur = ""
        else:
            cur += ch
    if cur.strip(): records.append(cur)
    return records

def parse_line(line):
    fields, cur, inq = [], "", False
    for i, ch in enumerate(line):
        if ch == '"':
            if inq and i+1 < len(line) and line[i+1] == '"':
                cur += '"'
            else:
                inq = not inq
        elif ch == ',' and not inq:
            fields.append(cur); cur = ""
        else:
            cur += ch
    fields.append(cur)
    return [f.strip().strip('"') for f in fields]

records = split_records(csv_text.replace('\r\n','\n').replace('\r','\n'))

work = []
for i, rec in enumerate(records[2:], 2):
    if not rec.strip(): continue
    f = parse_line(rec)
    if len(f) < 8: continue
    name = f[0]
    url  = f[1].split("\n")[0].strip()
    desc = f[4]
    followers = f[6]
    no_desc = not desc or desc in ('nan','-','')
    no_followers = not followers or followers in ('nan','-','')
    if 'linkedin.com/in/' in url and (no_desc or no_followers):
        work.append((name, url, no_desc, no_followers))

print(f"LinkedIn work list: {len(work)} profiles")

results = dict(existing)
for idx, (name, url, no_desc, no_followers) in enumerate(work):
    print(f"[{idx+1}/{len(work)}] {name[:40].ljust(41)}", end="", flush=True)
    
    data = fetch_linkedin(url, name)
    if data:
        print(f"✓  {data['desc'][:70]}")
        results[name] = data
    else:
        print("–  (no data)")
        results[name] = {"attempted": True}
    
    if (idx+1) % 20 == 0:
        OUTPUT.write_text(json.dumps(results, indent=2, ensure_ascii=False))
        print(f"  >>> Saved {len(results)} results")
    
    time.sleep(1.5 + (idx % 3) * 0.5)  # polite delay with variation

OUTPUT.write_text(json.dumps(results, indent=2, ensure_ascii=False))
with_data = sum(1 for v in results.values() if v.get('desc'))
print(f"\nDone. {with_data} profiles with headlines out of {len(results)} total.")
