from qdrant_client import QdrantClient
from qdrant_client.http import models

# Connect to Qdrant
client = QdrantClient(url="http://localhost:6333")
COLLECTION_NAME = "radiology_memory"

print(f"🔍 Scanning '{COLLECTION_NAME}' for the most recent uploads...")

# 1. Get the 10 most recently inserted points (using scroll which usually returns newest last or first depending on internal ID)
# Since UUIDs are random, we can't sort by ID easily. 
# We will search for points that match EITHER of the "placeholder" texts.

bad_texts = [
    "Medical scan uploaded",           # Old code
    "Medical scan uploaded by patient", # New code
    "Pending analysis"                 # Another potential variation
]

points_to_delete = []

# Search for each type of "bad" text
for text in bad_texts:
    results = client.scroll(
        collection_name=COLLECTION_NAME,
        scroll_filter=models.Filter(
            must=[
                models.FieldCondition(
                    key="report_text",
                    match=models.MatchValue(value=text)
                )
            ]
        ),
        limit=100,
        with_payload=True
    )[0] # scroll returns (points, offset)
    
    points_to_delete.extend(results)

if not points_to_delete:
    print("✅ No 'placeholder' uploads found! Your collection might already be clean.")
    print("Current Count:", client.count(COLLECTION_NAME).count)
else:
    print(f"\n⚠️ Found {len(points_to_delete)} items to delete:")
    
    # List them for the user
    ids_to_delete = []
    for point in points_to_delete:
        print(f" - ID: {point.id} | Text: {point.payload.get('report_text', 'No text')}")
        ids_to_delete.append(point.id)

    # DELETE ACTION
    print("\nDELETING items now...")
    client.delete(
        collection_name=COLLECTION_NAME,
        points_selector=models.PointIdsList(points=ids_to_delete)
    )
    print("✅ Successfully deleted!")
    print("New Count:", client.count(COLLECTION_NAME).count)