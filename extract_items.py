import re
from bs4 import BeautifulSoup

# Read the HTML file
with open('c:\\работа\\craft-calculator\\source-index.html', 'r', encoding='utf-8') as f:
    html_content = f.read()

# Parse the HTML
soup = BeautifulSoup(html_content, 'html.parser')

# Find all item links
items = soup.find_all('a', href=re.compile(r'item\.php\?id=\d+'))

item_data = []

for item in items:
    href = item.get('href')
    id_match = re.search(r'id=(\d+)', href)
    if id_match:
        item_id = id_match.group(1)
        
        # Find the image
        img = item.find('img')
        if img:
            img_src = img.get('src')
            img_alt = img.get('alt')
            
            # Extract image filename
            img_filename = img_src.split('/')[-1] if img_src else None
            
            # Find the title
            title_div = item.find('div', class_='item-title')
            if title_div:
                strong = title_div.find('strong')
                if strong:
                    title = strong.get_text().strip()
                    
                    item_data.append({
                        'id': item_id,
                        'title': title,
                        'image': img_filename,
                        'alt': img_alt
                    })

# Remove duplicates based on id
unique_items = []
seen_ids = set()
for item in item_data:
    if item['id'] not in seen_ids:
        unique_items.append(item)
        seen_ids.add(item['id'])

# Write to JSON
import json
with open('c:\\работа\\craft-calculator\\items_data.json', 'w', encoding='utf-8') as f:
    json.dump(unique_items, f, indent=4, ensure_ascii=False)

print(f"Extracted {len(unique_items)} unique items")
