import os
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.http import models

# 1. Load the SAME variables the backend uses
load_dotenv()

qdrant_url = os.getenv("QDRANT_URL", "http://localhost:6333")
qdrant_key = os.getenv("QDRANT_API_KEY")

print(f"🔌 Connecting to: {qdrant_url}...")

# Connect to Qdrant (Cloud or Local)
client = QdrantClient(url=qdrant_url, api_key=qdrant_key)

# Collection Names
USER_COLLECTION = os.getenv("QDRANT_USER_COLLECTION", "patient_uploads")
KNOWLEDGE_COLLECTION = os.getenv("QDRANT_KNOWLEDGE_COLLECTION", "radiology_memory")

def create_coll(name):
    try:
        if not client.collection_exists(name):
            print(f"🛠️ Creating collection: {name}...")
            client.create_collection(
                collection_name=name,
                vectors_config={
                    "image_vector": models.VectorParams(size=512, distance=models.Distance.COSINE),
                    "text_vector": models.VectorParams(size=512, distance=models.Distance.COSINE)
                }
            )
            print(f"✅ Created {name}!")
        else:
            print(f"👍 Collection '{name}' already exists.")
    except Exception as e:
        print(f"❌ Error creating {name}: {e}")

# Run creation
create_coll(USER_COLLECTION)
create_coll(KNOWLEDGE_COLLECTION)