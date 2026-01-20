# import json
# import os
# import torch
# import random
# import open_clip
# import matplotlib.pyplot as plt
# import textwrap
# from PIL import Image
# from qdrant_client import QdrantClient

# # --- CONFIGURATION ---
# TEST_FILE = "radiology_test_set.json" 
# COLLECTION_NAME = "radiology_memory"

# from dotenv import load_dotenv # <--- 1. Add this import

# # Load environment variables from .env file
# load_dotenv() # <--- 2. Add this line

# # ... existing imports ...

# # --- CONFIGURATION ---
# # Replace your hardcoded strings with os.getenv("VARIABLE_NAME")
# QDRANT_URL = os.getenv("QDRANT_URL")
# QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
# COLLECTION_NAME = os.getenv("QDRANT_COLLECTION")
# MODEL_ID = os.getenv("MODEL_NAME")

# # --- 🏥 LOAD MODEL ---
# print("🏥 Loading BioMedCLIP...")
# model, _, preprocess = open_clip.create_model_and_transforms(
#     'hf-hub:microsoft/BiomedCLIP-PubMedBERT_256-vit_base_patch16_224'
# )
# client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)

# def test_random_sample():
#     # 1. Load the TEST records
#     try:
#         with open(TEST_FILE, 'r') as f:
#             records = json.load(f)
#     except FileNotFoundError:
#         print(f"❌ Error: {TEST_FILE} not found.")
#         return

#     if not records:
#         print("❌ Test file is empty.")
#         return
        
#     # 2. Pick a RANDOM patient
#     test_record = random.choice(records)
    
#     test_image_path = os.path.normpath(test_record['image_path'])
#     actual_report = test_record['report_text']
#     patient_id = test_record.get('patient_id', 'Unknown')
    
#     print(f"\n🔎 Testing Random Patient ID: {patient_id}")
#     print(f"🖼️ Image: {test_image_path}")

#     # 3. Generate Embedding
#     if not os.path.exists(test_image_path):
#         print(f"❌ Error: Image file not found at {test_image_path}")
#         return

#     image = preprocess(Image.open(test_image_path)).unsqueeze(0)
#     with torch.no_grad():
#         features = model.encode_image(image)
#         features /= features.norm(dim=-1, keepdim=True)
#         query_vector = features.squeeze().tolist()

#     # 4. Search Qdrant
#     try:
#         response = client.query_points(
#             collection_name=COLLECTION_NAME,
#             query=query_vector,
#             using="image_vector",
#             limit=1,
#             with_payload=True 
#         )
        
#         results = response.points

#         if not results:
#             print("❌ No matches found in Qdrant.")
#             return

#         match = results[0]
#         matched_payload = match.payload
#         score = match.score
#         match_id = matched_payload.get('patient_id')
#         match_report = matched_payload.get('report_text', '')
#         match_image_path = os.path.normpath(matched_payload.get('image_path', ''))

#         # --- CONSOLE OUTPUT ---
#         print("\n" + "="*60)
#         print(f"📊 DIAGNOSTIC MATCH RESULT (Score: {score:.4f})")
#         print("="*60)
        
#         print(f"\n🔵 INPUT PATIENT (The Unknown Case):")
#         print(f"   ID: {patient_id}")
#         print("-" * 30)
#         print(f"   Diagnosis: {test_record.get('diagnosis', 'N/A')}")
#         print(f"   Snippet: {actual_report[:200]}...")

#         print(f"\n\n🟢 AI PREDICTED MATCH (The Retrieved Case):")
#         print(f"   ID: {match_id}")
#         print("-" * 30)
#         print(f"   Diagnosis: {matched_payload.get('diagnosis', 'N/A')}")
#         print(f"   Snippet: {match_report[:200]}...")
        
#         print("\n" + "="*60)

#         # --- VISUALIZATION OUTPUT ---
#         print("🖼️ Displaying images...")
        
#         fig, axes = plt.subplots(1, 2, figsize=(14, 7))
        
#         # Plot 1: Input Image
#         img1 = Image.open(test_image_path)
#         axes[0].imshow(img1, cmap='gray')
#         axes[0].set_title(f"INPUT CASE\nID: {patient_id}", fontsize=12, color='blue', fontweight='bold')
#         axes[0].axis('off')
        
#         # Add report text below input image
#         wrapped_report1 = "\n".join(textwrap.wrap(actual_report, width=50))[:500]
#         axes[0].text(0.5, -0.1, f"REPORT:\n{wrapped_report1}...", 
#                      transform=axes[0].transAxes, ha='center', va='top', fontsize=9, wrap=True)

#         # Plot 2: Matched Image
#         if os.path.exists(match_image_path):
#             img2 = Image.open(match_image_path)
#             axes[1].imshow(img2, cmap='gray')
#             axes[1].set_title(f"BEST MATCH (Sim: {score:.4f})\nID: {match_id}", fontsize=12, color='green', fontweight='bold')
#             axes[1].axis('off')
            
#             # Add report text below matched image
#             wrapped_report2 = "\n".join(textwrap.wrap(match_report, width=50))[:500]
#             axes[1].text(0.5, -0.1, f"REPORT:\n{wrapped_report2}...", 
#                          transform=axes[1].transAxes, ha='center', va='top', fontsize=9, wrap=True)
#         else:
#             axes[1].text(0.5, 0.5, "Image File Not Found Locally", ha='center')
#             axes[1].set_title("BEST MATCH (Image Missing)", color='red')
#             axes[1].axis('off')

#         plt.tight_layout()
#         plt.subplots_adjust(bottom=0.3) # Make room for text
#         plt.show()

#     except Exception as e:
#         print(f"❌ Error: {e}")

# if __name__ == "__main__":
#     test_random_sample()

import json
import os
import torch
import random
import open_clip
import matplotlib.pyplot as plt
from PIL import Image
from qdrant_client import QdrantClient
from fpdf import FPDF, XPos, YPos
import openai # We still use the openai library to talk to Gemini
import re

# --- 🔑 CONFIGURATION ---
QDRANT_URL = "https://10cc0ed4-d483-4a82-96fc-9924824e0126.us-east4-0.gcp.cloud.qdrant.io:6333"
QDRANT_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.jlp6fBcZVrug-EfUKbfjCHsb0-sn4Dq7ms8l_uI1_bo"

# GEMINI SETTINGS
GEMINI_API_KEY = "AIzaSyARAGEF2mWEoXH151VHsDPDdNEt7Ot4kws"
GEMINI_MODEL = "gemini-2.5-flash"

COLLECTION_NAME = "radiology_memory"
TEST_FILE = "radiology_test_set.json"

# --- 🏥 INITIALIZE CLIENTS ---
print("🏥 Loading BioMedCLIP & Clients...")
model, _, preprocess = open_clip.create_model_and_transforms(
    'hf-hub:microsoft/BiomedCLIP-PubMedBERT_256-vit_base_patch16_224'
)
qdrant_client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)

# Pointing the OpenAI client to Google's Gemini endpoint
gemini_client = openai.OpenAI(
    api_key=GEMINI_API_KEY,
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
)

def clean_text_for_pdf(text):
    """Removes non-Latin-1 characters to prevent PDF crashes."""
    return re.sub(r'[^\x00-\x7F]+', '', text)

def create_pdf_report(patient_id, report_content, similarity_score):
    """Generates a professional PDF document."""
    pdf = FPDF()
    pdf.add_page()
    
    # Header
    pdf.set_font("Helvetica", 'B', 16)
    pdf.cell(200, 10, text="Automated Radiology Diagnostic Report", align='C', new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.ln(10)
    
    # Patient Info
    pdf.set_font("Helvetica", 'B', 12)
    pdf.cell(0, 10, text=f"Patient ID: {patient_id}", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.cell(0, 10, text=f"AI Matching Confidence: {similarity_score:.4f}", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.ln(5)
    
    # Report Body
    pdf.set_font("Helvetica", size=11)
    safe_report = clean_text_for_pdf(report_content)
    pdf.multi_cell(0, 7, text=safe_report)
    
    output_filename = f"Report_Patient_{patient_id}.pdf"
    pdf.output(output_filename)
    return output_filename

def generate_well_report(raw_text, score):
    """Uses Gemini to generate a structured clinical report."""
    print(f"✍️ Generating detailed report via Gemini...")
    
    prompt = f"""
    You are an expert diagnostic radiologist. Create a detailed clinical report based on a similar case.
    USE PLAIN TEXT ONLY. NO EMOJIS.
    
    RETRIEVED DATA:
    {raw_text}
    
    STRUCTURE:
    1. CLINICAL FINDINGS: (Anatomical observations)
    2. IMPRESSION: (Main diagnosis)
    3. RECOMMENDED REMEDIES & LIFESTYLE: (Actionable medical advice)
    4. CLINICAL FOLLOW-UP: (Next steps for the patient)
    """

    try:
        response = gemini_client.chat.completions.create(
            model=GEMINI_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"❌ Gemini API Error: {e}"

def test_random_sample():
    try:
        with open(TEST_FILE, 'r') as f:
            records = json.load(f)
        
        test_record = random.choice(records)
        test_image_path = os.path.normpath(test_record['image_path'])
        patient_id = test_record.get('patient_id', 'Unknown')
        
        print(f"\n🔎 Processing Case ID: {patient_id}")

        # 1. Embedding
        image = preprocess(Image.open(test_image_path)).unsqueeze(0)
        with torch.no_grad():
            features = model.encode_image(image)
            features /= features.norm(dim=-1, keepdim=True)
            query_vector = features.squeeze().tolist()

        # 2. Search
        response = qdrant_client.query_points(
            collection_name=COLLECTION_NAME,
            query=query_vector,
            using="image_vector",
            limit=1
        )
        
        if response.points:
            match = response.points[0]
            nice_report = generate_well_report(match.payload.get('report_text', ''), match.score)
            
            # 3. Save to PDF
            pdf_path = create_pdf_report(patient_id, nice_report, match.score)
            print(f"\n✅ Report Saved: {pdf_path}")
            print("-" * 30)
            print(nice_report)

    except Exception as e:
        print(f"❌ System Error: {e}")

if __name__ == "__main__":
    test_random_sample()