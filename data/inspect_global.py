import os
import numpy as np
from qdrant_client import QdrantClient

from dotenv import load_dotenv # <--- 1. Add this import

# Load environment variables from .env file
load_dotenv() # <--- 2. Add this line

# ... existing imports ...

# --- CONFIGURATION ---
# Replace your hardcoded strings with os.getenv("VARIABLE_NAME")
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
COLLECTION_NAME = os.getenv("QDRANT_COLLECTION")
MODEL_ID = os.getenv("MODEL_NAME")

COLLECTION_NAME = "radiology_memory"

# Connect to Cloud
# Added timeout=60 to be safe, similar to your ingestion script
client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY, timeout=60)

print("Calculating... Fetching raw vectors from Qdrant Cloud...\n")

# 1. Get one record from the Cloud
hits = client.scroll(
    collection_name=COLLECTION_NAME,
    limit=1,
    with_payload=True,
    with_vectors=True 
)

if not hits[0]:
    print("❌ No data found! Did you run the ingestion script?")
    exit()

# 2. Extract the Data
point = hits[0][0]
vectors = point.vector

# 3. Display the "Image" Embedding
img_vec = vectors['image_vector']
print(f"🖼️  IMAGE EMBEDDING (Size: {len(img_vec)})")
print(f"   First 5 dims: {img_vec[:5]}...")

# 4. Display the "Text" Embedding
txt_vec = vectors['text_vector']
print(f"📄  TEXT EMBEDDING (Size: {len(txt_vec)})")
print(f"   First 5 dims: {txt_vec[:5]}...")

print("-" * 50)
print("🧠 STATUS: CONNECTED GLOBALLY")
print("You are viewing this data from a remote server.")