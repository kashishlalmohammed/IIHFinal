"""Apply targeted manual persona corrections for well-known influencers."""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "../../data/influencers.sqlite")

MANUAL = {
    "FinTech / Finance": [
        "Theodora Lau", "Theo Lau", "Jim Marous", "Bradley Leimer",
        "Sabine VanderLinden", "Nathaniel Whittemore", "Jay Palter", "Ron Thurston",
        "Girish Mathrubootham", "Jim Marous - External Influencer",
        "Bradley Leimer - External Influencer",
    ],
    "Data & AI Specialist": [
        "Allie Miller", "Aishwarya Srinivasan", "Krish Naik", "Siraj Raval",
        "Hamel Husain", "Elvis Saravia", "Matthew Berman", "Matt Berman",
        "Sundas Khalid", "Tina Huang", "Andreas Welch", "Lior Sinclair",
        "Cole Medin", "Alpha Signal", "Ben Tossell", "The Rundown AI",
        "Last Week in AI", "Philipp Schmid", "Shubham Sharma",
        "Brij Kishore Pandey", "Brij", "Brij Pandeyji",
        "Kate Strachnyi", "Ravit Jain", "Kirk Borne",
        "Simon Willison", "Andriy Burkov", "Richard Socher",
        "Zach Wilson", "Andreas Welsch", "Dan Ni \u2022 tldr.tech",
        "Alpha Signal", "Lior Sinclair (AlphaSignal)",
        "Eric Vyachelav", "Eric Vyacheslav", "Eric Vyacheslav (AlphaSignal)",
        "Diksha Arora", "Parul Khosla", "Shobhit Varshney",
    ],
    "Thought Leader (Author, Speaker, Analyst)": [
        "Meredith Whittaker", "Bernard Marr", "Ronald Van Loon",
        "Ronald vanLoon - External Influencer", "Helen Yu", "Azeem Azhar",
        "Gary Marcus", "Scott Taylor", "George Firican",
        "Maribel Lopez", "Tim Crawford", "Michael Krigsman",
        "Stuart Miniman", "Sarbjeet Johal", "John Furrier",
        "Dave Vellante", "Daniel Newman", "DavidLinthicum",
        "Sanjay Srivastava", "Bernard Marr - External Influencer",
        "Helen Yu - External Influencer", "Helen Yu - $13,000",
        "Bernard Marr - $45,000",
    ],
    "Media / Content Creator (Podcast, YouTube)": [
        "Lex Fridman", "iJustine", "Justine Ezarik", "Unbox Therapy",
        "Network Chuck", "TechWorld with Nana", "Techno Tim", "Syntax FM",
        "Cleo Abram", "Cleo", "Ross Pomerantz", "Corporate Natalie",
        "Jordan Wilson", "Laura Whaley", "Ben's Bites", "Rowan Cheung",
        "Zain Kahn", "Andrew Brown", "Developers Digest",
        "Katie Linendoll - External Influencer", "Aevy TV",
        "Tim Scarfe - Machine Learning Street Talk",
        "The Ravit Show", "Acceleration Economy", "Accelarator Economy",
        "Jason Lengstorf", "Sonny Sangha", "Forrest Knight",
        "Tiff in Tech", "Bukola Dev", "Bukola Ayodele",
        "Coding with Lewis", "Lewis Menelaws", "Lewis Menelaws (Coding with Lewis)",
        "Zaurbek Stark", "Arsh Goyal", "Ansh Mehra",
        "Techmeout", "TechMode TV", "Business Casualty", "daltonjoyce",
        "youngdalt", "tasiajewelx", "ashanti22", "williemack3",
        "marina.oetiker", "Meydeey",
    ],
    "Educator / Researcher": [
        "Timnit Gebru", "Dr. Sasha Luccioni", "Cassie Kozyrkov",
        "Cassie Kozrykov", "Dr. Joan Palmiter Bajorek", "Patricia Thaine",
        "Helen Papagiannis, Ph.D.", "Subbarao Kambhampati",
        "Rana el Kaliouby", "Angie Jones", "Emily Freeman",
        "Kate Stratchnyi", "Sadie St. Lawrence", "Andrew Tattersall",
        "Abhishek Gupta #NeurIPS2018",
    ],
    "C-Suite / Executive": [
        "Myles Suer", "Mark Thiele", "Lydia Leong",
        "Dave Kennedy (ReL1K)", "Elias Khnaser",
        "Vin Vashishta", "Vin Vashistha", "Vin Vashista",
        "Vin Vashishta - $5,500",
    ],
    "Entrepreneur / Founder": [
        "Allie Miller",  # removed from Data bucket above if she ends up here — but she's in Data, fine
        "Zoe Mensah",
    ],
}

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

total = 0
for persona, names in MANUAL.items():
    for name in names:
        cur.execute(
            "UPDATE influencers SET persona_group = ? WHERE name = ? AND persona_group != ?",
            (persona, name, persona),
        )
        total += cur.rowcount

conn.commit()

print(f"Manual corrections applied: {total} rows changed")
print()
cur.execute("SELECT persona_group, COUNT(*) FROM influencers GROUP BY persona_group ORDER BY 2 DESC")
print("Final distribution:")
for p, c in cur.fetchall():
    print(f"  {c:4d}  {p}")

conn.close()
