"""Parse Lawrence book PDF and extract deals with surrounding text."""
import fitz
import json
import re

doc = fitz.open('C:/Users/shram/Downloads/Lawrence_2019.pdf')

# Extract all text
pages = []
for i in range(len(doc)):
    pages.append(doc[i].get_text())

full_text = "\n\n".join(pages)

# Find all deals (N/S hands pattern)
# Pattern: lines with suit symbols or Russian card notation
# Deals typically have the compass diagram N W E S pattern

# Split by chapters
chapters = {
    1: {"title": "Рассмотрение дела", "start": 8, "end": 15},
    2: {"title": "Поиск свидетелей", "start": 16, "end": 47},
    3: {"title": "Анализ мотивов", "start": 48, "end": 66},
    4: {"title": "Проведение расследования", "start": 67, "end": 98},
    5: {"title": "Проверка улик", "start": 99, "end": 130},
    6: {"title": "Закрытие дела", "start": 131, "end": 168},
}

# Card notation conversion
def convert_cards(s):
    """Convert Russian card notation to standard."""
    s = s.replace('Т', 'A').replace('К', 'K').replace('Д', 'Q').replace('В', 'J')
    s = s.strip()
    return s

# Find deals in each chapter
# A deal is identified by the compass pattern N W E S with card listings
deal_pattern = re.compile(r'([ТКДВ\d]+)\s*\n\s*([ТКДВ\d]+)\s*\n\s*([ТКДВ\d]+)\s*\n\s*([ТКДВ\d]+)\s*\n.*?N\s*\n.*?W\s+E\s*\n.*?S\s*\n\s*([ТКДВ\d]+)\s*\n\s*([ТКДВ\d]+)\s*\n\s*([ТКДВ\d]+)\s*\n\s*([ТКДВ\d]+)', re.DOTALL)

# Simpler approach: count deals per chapter by counting "N\n\nW" patterns
results = {}
for ch_num, ch_info in chapters.items():
    ch_text = ""
    for p in range(ch_info["start"] - 1, min(ch_info["end"], len(pages))):
        ch_text += pages[p] + "\n\n"

    # Count compass diagrams
    compass_count = ch_text.count("W               E")
    # Count "Контракт" mentions
    contract_count = len(re.findall(r'Контракт \d', ch_text))
    # Count "Атака:" mentions
    attack_count = ch_text.count("Атака:")

    results[ch_num] = {
        "title": ch_info["title"],
        "pages": f"{ch_info['start']}-{ch_info['end']}",
        "compass_diagrams": compass_count,
        "contracts": contract_count,
        "attacks": attack_count,
    }
    print(f"Глава {ch_num}. {ch_info['title']}: {compass_count} раскладов, {attack_count} атак")

total = sum(r["compass_diagrams"] for r in results.values())
print(f"\nВсего раскладов: {total}")
