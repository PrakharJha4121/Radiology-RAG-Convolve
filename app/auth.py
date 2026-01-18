import uuid
from qdrant_client import QdrantClient

# Constant UUID namespace for deterministic patient IDs
NAMESPACE = uuid.UUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')  # DNS namespace

def get_patient_id(email: str) -> str:
    """
    Generate a deterministic UUID from the user's email.
    This creates a consistent patient_id for each email.
    """
    return str(uuid.uuid5(NAMESPACE, email))

def register_user_if_new(email: str, metadata: dict):
    """
    Upsert user metadata into the 'user_registry' collection in Qdrant.
    The patient_id is used as the point ID.
    Assumes Qdrant is running on localhost:6333 and the collection exists.
    """
    client = QdrantClient("localhost", port=6333)
    patient_id = get_patient_id(email)

    # Upsert the user data
    client.upsert(
        collection_name="user_registry",
        points=[{
            "id": patient_id,
            "payload": {
                "email": email,
                **metadata  # e.g., {"name": "John Doe", "age": 30}
            }
        }]
    )
