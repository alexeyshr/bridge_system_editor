"""Extract all deals from Lawrence book with surrounding text context."""
import fitz
import json
import re

doc = fitz.open('C:/Users/shram/Downloads/Lawrence_2019.pdf')

# Extract all pages text
all_text = []
for i in range(len(doc)):
    all_text.append(doc[i].get_text())

# Card conversion
def convert_cards(s):
    return s.replace('Т', 'A').replace('К', 'K').replace('Д', 'Q').replace('В', 'J').strip()

# Parse deals from text
# Pattern: 4 lines of cards (north), compass, 4 lines of cards (south)
# Cards are combinations of ТКДВ and digits

deals = []
deal_id = 0

for page_idx, page_text in enumerate(all_text):
    lines = page_text.strip().split('\n')
    lines = [l.strip() for l in lines]

    # Find compass pattern "W               E" or "W\t\tE"
    for i, line in enumerate(lines):
        if re.match(r'^W\s+E$', line):
            # Found compass - extract north (above) and south (below)
            # North: 4 lines before N line (which is before W E)
            # South: 4 lines after S line (which is after W E)

            # Find N line above
            n_idx = None
            for j in range(i-1, max(i-3, -1), -1):
                if lines[j].strip() == 'N':
                    n_idx = j
                    break

            # Find S line below
            s_idx = None
            for j in range(i+1, min(i+3, len(lines))):
                if lines[j].strip() == 'S':
                    s_idx = j
                    break

            if n_idx is None or s_idx is None:
                continue

            # North cards: 4 lines above N
            north_cards = []
            for j in range(max(0, n_idx-4), n_idx):
                card_line = lines[j].strip()
                # Filter: must contain card characters
                if re.match(r'^[ТКДВ\d\s–\-♠♥♦♣]+$', card_line) and len(card_line) > 0:
                    # Remove suit symbols
                    clean = re.sub(r'[♠♥♦♣\s]', '', card_line)
                    if clean and clean not in ['N', 'S', 'W', 'E', '–', '-']:
                        north_cards.append(convert_cards(clean))

            # South cards: 4 lines after S
            south_cards = []
            for j in range(s_idx+1, min(len(lines), s_idx+6)):
                card_line = lines[j].strip()
                if re.match(r'^[ТКДВ\d\s–\-♠♥♦♣]+$', card_line) and len(card_line) > 0:
                    clean = re.sub(r'[♠♥♦♣\s]', '', card_line)
                    if clean and clean not in ['N', 'S', 'W', 'E', '–', '-']:
                        south_cards.append(convert_cards(clean))

            # Also check for West cards (left of compass) and East cards (right)
            west_cards = []
            east_cards = []

            # Check lines around compass for W/E hands
            # West is typically on lines near i-2 to i+2, left side
            # East is on right side
            # This is harder to parse from text, skip for now

            # Check if this is a full deal (4 hands) or partial (2 hands)
            # Full deals have cards on both sides of compass

            # Get surrounding text context
            context_start = max(0, n_idx - 8)
            context_end = min(len(lines), s_idx + 10)
            context = '\n'.join(lines[context_start:context_end])

            # Determine contract from nearby text
            contract = ""
            for j in range(max(0, n_idx-10), min(len(lines), s_idx+15)):
                m = re.search(r'Контракт (\d[♠♥♦♣БКНТ]+|3БК|4♠|4♥|6♠|6♥|7♠)', lines[j])
                if m:
                    contract = m.group(1)
                    break

            # Determine chapter
            page_num = page_idx + 1
            chapter = 0
            if page_num <= 15: chapter = 1
            elif page_num <= 47: chapter = 2
            elif page_num <= 66: chapter = 3
            elif page_num <= 98: chapter = 4
            elif page_num <= 130: chapter = 5
            else: chapter = 6

            deal_id += 1
            deal = {
                "id": deal_id,
                "page": page_num,
                "chapter": chapter,
                "north": north_cards[:4],  # s, h, d, c
                "south": south_cards[:4],
                "contract": contract,
                "has_full_deal": len(west_cards) > 0,
            }
            deals.append(deal)

print(f"Extracted {len(deals)} deals")
print(f"\nPer chapter:")
for ch in range(1, 7):
    ch_deals = [d for d in deals if d["chapter"] == ch]
    print(f"  Chapter {ch}: {len(ch_deals)} deals")

# Print first 10 for verification
print(f"\nFirst 15 deals:")
for d in deals[:15]:
    print(f"  #{d['id']} p.{d['page']} ch.{d['chapter']}: N={d['north']} S={d['south']} contract={d['contract']}")

# Save to JSON
with open('C:/Users/shram/Desktop/BRIDGE/bridge_system_editor_sync/tmp-lawrence-deals.json', 'w', encoding='utf-8') as f:
    json.dump(deals, f, ensure_ascii=False, indent=2)

print(f"\nSaved to tmp-lawrence-deals.json")
