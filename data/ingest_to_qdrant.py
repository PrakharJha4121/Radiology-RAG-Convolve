import json
import os
import random
import torch
import open_clip
from tqdm import tqdm
from PIL import Image
from qdrant_client import QdrantClient
from qdrant_client.http import models
from dotenv import load_dotenv
# --- CONFIGURATION ---
INPUT_FILE = "radiology_memory.json"  # Ensure this is your 4000+ record file
TEST_FILE = "radiology_test_set.json"
COLLECTION_NAME = "radiology_memory"

# Size of the "Brain" (Training Data)
TRAIN_SIZE = 3500
# Size of the "Test" (Unseen Data)
TEST_SIZE = 500 

# --- ☁️ CREDENTIALS ---
 # <--- 1. Add this import

# Load environment variables from .env file
load_dotenv() # <--- 2. Add this line

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
COLLECTION_NAME = os.getenv("QDRANT_COLLECTION")
MODEL_ID = os.getenv("MODEL_NAME")

# --- 🏥 LOAD BIOMEDCLIP MODEL ---
print("🏥 Loading Microsoft BioMedCLIP...")
model, _, preprocess = open_clip.create_model_and_transforms(
    'hf-hub:microsoft/BiomedCLIP-PubMedBERT_256-vit_base_patch16_224'
)
tokenizer = open_clip.get_tokenizer('hf-hub:microsoft/BiomedCLIP-PubMedBERT_256-vit_base_patch16_224')

client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY, timeout=60)

def setup_collection():
    if client.collection_exists(COLLECTION_NAME):
        print(f"⚠️ Re-creating collection '{COLLECTION_NAME}'...")
        client.delete_collection(COLLECTION_NAME)
    
    client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config={
            "image_vector": models.VectorParams(size=512, distance=models.Distance.COSINE),
            "text_vector": models.VectorParams(size=512, distance=models.Distance.COSINE),
        }
    )
    print("✅ Collection created!")

def process_and_upload():
    # 1. Load Data
    try:
        with open(INPUT_FILE, 'r') as f:
            all_records = json.load(f)
    except FileNotFoundError:
        print(f"❌ Error: {INPUT_FILE} not found.")
        return

    # 2. Check if we have enough data
    total_needed = TRAIN_SIZE + TEST_SIZE
    if len(all_records) < total_needed:
        print(f"❌ Not enough data! You have {len(all_records)}, but need {total_needed}.")
        return

    # 3. Shuffle and Split
    print("🔀 Shuffling data...")
    random.seed(42) # Ensures the split is consistent every time you run it
    random.shuffle(all_records)

    train_records = all_records[:TRAIN_SIZE]
    test_records = all_records[TRAIN_SIZE : TRAIN_SIZE + TEST_SIZE]

    # 4. Save Test Set
    print(f"💾 Saving {len(test_records)} test records to '{TEST_FILE}'...")
    with open(TEST_FILE, 'w') as f:
        json.dump(test_records, f, indent=4)

    # 5. Ingest Training Set
    print(f"🚀 Ingesting {len(train_records)} records into Qdrant...")
    
    points_to_upload = []
    BATCH_SIZE = 50 

    for idx, record in enumerate(tqdm(train_records)):
        try:
            # Handle Windows/Linux path differences
            image_path = os.path.normpath(record['image_path'])
            if not os.path.exists(image_path): 
                continue

            # Generate Embeddings
            image = preprocess(Image.open(image_path)).unsqueeze(0)
            text_tokens = tokenizer([record['report_text']])

            with torch.no_grad():
                img_features = model.encode_image(image)
                img_features /= img_features.norm(dim=-1, keepdim=True)
                
                txt_features = model.encode_text(text_tokens)
                txt_features /= txt_features.norm(dim=-1, keepdim=True)

            point = models.PointStruct(
                id=idx, 
                vector={
                    "image_vector": img_features.squeeze().tolist(),
                    "text_vector": txt_features.squeeze().tolist()
                },
                payload=record 
            )
            points_to_upload.append(point)

            # Upload Batch
            if len(points_to_upload) >= BATCH_SIZE:
                client.upsert(collection_name=COLLECTION_NAME, points=points_to_upload)
                points_to_upload = []

        except Exception as e:
            continue

    # Final Upload
    if points_to_upload:
        client.upsert(collection_name=COLLECTION_NAME, points=points_to_upload)
    
    print("\n🎉 Success!")
    print(f"✅ Indexed {TRAIN_SIZE} patients in Qdrant.")
    print(f"✅ Saved {TEST_SIZE} unseen patients to '{TEST_FILE}'.")

if __name__ == "__main__":
    setup_collection()
    process_and_upload()