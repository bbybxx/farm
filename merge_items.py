import json

# Load existing items API
with open('c:\\работа\\craft-calculator\\src\\data\\items-api.json', 'r', encoding='utf-8') as f:
    existing_items = json.load(f)

# Load extracted items
with open('c:\\работа\\craft-calculator\\items_with_images.json', 'r', encoding='utf-8') as f:
    extracted_items = json.load(f)

# Create mapping from title to item data for quick lookup
extracted_map = {item['title']: item for item in extracted_items}

# Update existing items with image paths if missing
updated_count = 0
added_count = 0

for title, item_data in existing_items.items():
    if title in extracted_map:
        extracted = extracted_map[title]
        # Update image path to web path
        if 'image' not in item_data or not item_data['image']:
            item_data['image'] = f'/img/items/{extracted["image"]}'
            updated_count += 1

# Add missing items
for item in extracted_items:
    title = item['title']
    if title not in existing_items:
        existing_items[title] = {
            'name': title,
            'type': 'item',
            'image': f'/img/items/{item["image"]}',
            'canCraft': False,  # Default, can be updated later
            'craftingLevel': 0
        }
        added_count += 1

# Save updated API
with open('c:\\работа\\craft-calculator\\src\\data\\items-api-updated.json', 'w', encoding='utf-8') as f:
    json.dump(existing_items, f, indent=2, ensure_ascii=False)

print(f"Updated {updated_count} existing items, added {added_count} new items")
print(f"Total items now: {len(existing_items)}")
