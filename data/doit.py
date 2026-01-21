import os
import shutil
import json

# --- CONFIGURATION ---
JSON_FILE_PATH = "radiology_test_set.json"  # The path to your JSON file
SOURCE_DIR = "./data/chest_xrays"           # Where all 3,505 images are
DEST_DIR = "./data/test_chest_xrays"        # The new folder for just test images

def organize_test_images():
    # 1. Create the destination folder if it doesn't exist
    if not os.path.exists(DEST_DIR):
        os.makedirs(DEST_DIR)
        print(f"✅ Created directory: {DEST_DIR}")

    # 2. Load the JSON file
    try:
        with open(JSON_FILE_PATH, 'r') as f:
            test_records = json.load(f)
    except FileNotFoundError:
        print(f"❌ Error: Could not find {JSON_FILE_PATH}")
        return

    # 3. Loop through JSON and copy images
    copied_count = 0
    missing_count = 0

    for record in test_records:
        # Extract the filename from the path in the JSON (handles both / and \)
        raw_path = record.get("image_path", "")
        filename = os.path.basename(raw_path.replace("\\", "/"))
        
        if not filename:
            continue

        src_path = os.path.join(SOURCE_DIR, filename)
        dst_path = os.path.join(DEST_DIR, filename)

        # Check if the image exists in the source folder before copying
        if os.path.exists(src_path):
            # shutil.copy2 preserves original metadata (timestamps, etc.)
            shutil.copy2(src_path, dst_path)
            copied_count += 1
        else:
            print(f"⚠️ Warning: {filename} not found in {SOURCE_DIR}")
            missing_count += 1

    print(f"\n--- Task Complete ---")
    print(f"Total images in JSON: {len(test_records)}")
    print(f"Successfully copied: {copied_count}")
    print(f"Missing from source: {missing_count}")

if __name__ == "__main__":
    organize_test_images()