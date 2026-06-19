"""
Remap influencer persona_group values from the old taxonomy
(Edu Coder, Lifestyle Coder, Visionary, Change Maker)
to the new taxonomy:
  - Developer / Engineer
  - Data & AI Specialist
  - Cybersecurity Expert
  - C-Suite / Executive
  - Entrepreneur / Founder
  - Thought Leader (Author, Speaker, Analyst)
  - Media / Content Creator (Podcast, YouTube)
  - Educator / Researcher
  - Sustainability / Climate
  - FinTech / Finance

Logic:
  - Change Maker         → Cybersecurity Expert
    (all 29 are cybersec researchers, CISOs, infosec speakers)
  - Visionary            → Sustainability / Climate
    (all 38 are EU Commission energy / climate / sustainability policy people)
  - Lifestyle Coder      → Thought Leader (Author, Speaker, Analyst)
    (CIO advisors, analysts, tech media hosts, podcast/cube hosts)
  - Edu Coder (no bio / placeholder) → Developer / Engineer
  - Edu Coder (real bio) → derived from bio keywords (see classify_edu_coder)
"""

import sqlite3
import re
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "../../data/influencers.sqlite")

# ── New persona labels ───────────────────────────────────────────────────────
P_DEV       = "Developer / Engineer"
P_DATA      = "Data & AI Specialist"
P_CYBER     = "Cybersecurity Expert"
P_CSUITE    = "C-Suite / Executive"
P_FOUNDER   = "Entrepreneur / Founder"
P_THOUGHT   = "Thought Leader (Author, Speaker, Analyst)"
P_MEDIA     = "Media / Content Creator (Podcast, YouTube)"
P_EDUCATOR  = "Educator / Researcher"
P_SUSTAIN   = "Sustainability / Climate"
P_FINTECH   = "FinTech / Finance"

# ── Bio-keyword rules for Edu Coder remapping ────────────────────────────────
# Evaluated in order; first match wins.
KEYWORD_RULES = [
    # FinTech / Finance — check early to avoid "AI" matches pulling into Data
    (P_FINTECH,  r"fintech|finance|banking|financial|payments|bank(?!ing)|wealth|insurance|investment|trading|capital markets"),

    # Cybersecurity
    (P_CYBER,    r"cyber|infosec|security research|hacker|ciso|pentest|threat intel|malware|vulnerability|red team|soc analyst|ctf"),

    # Sustainability / Climate
    (P_SUSTAIN,  r"sustainab|climate|renewable|carbon|energy transition|green|net.?zero|emissions|circularecon|decarboni"),

    # C-Suite / Executive
    (P_CSUITE,   r"\bceo\b|\bcto\b|\bcio\b|\bcoo\b|\bcmo\b|\bcfo\b|chief executive|chief technology|chief information|chief operating|vp of|vice president|managing director|board (member|director)|c-suite"),

    # Founder / Entrepreneur
    (P_FOUNDER,  r"founder|co-founder|cofounder|startup|entrepreneur|venture|bootstrapped"),

    # Thought Leader (analyst/speaker/author/analyst firm)
    (P_THOUGHT,  r"analyst|keynote|best.?sell|thought leader|speaker|forbes contributor|columnist|author of|wrote the book|harvard business"),

    # Data & AI Specialist
    (P_DATA,     r"data scientist|machine learning|deep learning|nlp|llm|gen.?ai|artificial intelligence|watsonx|ml engineer|data engineer|analytics|mlops|python|pandas|tensorflow|pytorch|hugging face|kaggle"),

    # Educator / Researcher
    (P_EDUCATOR, r"professor|phd|researcher|academic|university|research scientist|postdoc|faculty|lecturer|scholar"),

    # Media / Content Creator
    (P_MEDIA,    r"podcast|youtuber|youtube|tikto|streamer|content creator|vlogger|newsletter|creator economy|social media creator"),

    # Developer / Engineer (catch-all for remaining technical bios)
    (P_DEV,      r"developer|engineer|software|coding|open.?source|devops|kubernetes|cloud.?native|full.?stack|backend|frontend|programming|java|javascript|typescript|rust|golang|node\.js"),
]

PLACEHOLDER_RE = re.compile(r"external influencer in ibm|external influencer active in ibm", re.IGNORECASE)


def classify_edu_coder(bio) -> str:
    """Map an Edu Coder to a new persona based on their bio."""
    if not bio or PLACEHOLDER_RE.search(bio):
        # No meaningful bio — keep default developer bucket
        return P_DEV

    b = bio.lower()
    for persona, pattern in KEYWORD_RULES:
        if re.search(pattern, b):
            return persona

    # Fallback
    return P_DEV


def remap_all(db_path: str) -> dict:
    """
    Remap every influencer's persona_group using the new taxonomy.
    Returns a counter dict of new_persona → count of records updated.
    """
    # Open read-write (remove readonly flag)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    cur.execute("SELECT id, name, bio, persona_group FROM influencers")
    rows = cur.fetchall()

    counters = {}
    updates = []

    for row in rows:
        old = row["persona_group"]
        bio = row["bio"]

        if old == "Change Maker":
            new = P_CYBER
        elif old == "Visionary":
            new = P_SUSTAIN
        elif old == "Lifestyle Coder":
            new = P_THOUGHT
        elif old == "Edu Coder":
            new = classify_edu_coder(bio)
        else:
            # Already on new taxonomy or unknown — leave untouched
            new = old

        if new != old:
            updates.append((new, row["id"]))
            counters[new] = counters.get(new, 0) + 1

    print(f"Updating {len(updates)} of {len(rows)} influencers…")
    cur.executemany("UPDATE influencers SET persona_group = ? WHERE id = ?", updates)
    conn.commit()
    conn.close()

    return counters


if __name__ == "__main__":
    results = remap_all(DB_PATH)
    print("\nNew persona distribution (updated records only):")
    for persona, count in sorted(results.items(), key=lambda x: -x[1]):
        print(f"  {count:4d}  {persona}")

    # Print full distribution after update
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT persona_group, COUNT(*) FROM influencers GROUP BY persona_group ORDER BY 2 DESC")
    print("\nFull database distribution after migration:")
    for p, c in cur.fetchall():
        print(f"  {c:4d}  {p}")
    conn.close()
