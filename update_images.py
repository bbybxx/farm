import json
import os

# Load the extracted items
with open('c:\\работа\\craft-calculator\\items_data.json', 'r', encoding='utf-8') as f:
    items = json.load(f)

# Directory with images
image_dir = 'c:\\работа\\craft-calculator\\all-items_files'

# Get list of image files
image_files = os.listdir(image_dir)

# Create a mapping from filename to full path
image_paths = {f: os.path.join(image_dir, f) for f in image_files}

# Update items with full image paths
for item in items:
    filename = item['image']
    if filename in image_paths:
        item['image_path'] = image_paths[filename]
    else:
        item['image_path'] = None

# Save updated JSON
with open('c:\\работа\\craft-calculator\\items_with_images.json', 'w', encoding='utf-8') as f:
    json.dump(items, f, indent=4, ensure_ascii=False)

print(f"Updated {len(items)} items with image paths")
