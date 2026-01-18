# Radiology-RAG-Convolve

Minimal scaffold for the Radiology-RAG-Convolve repository used in the hackathon.

This repo contains the top-level files and empty folders needed to start development. Folders are intentionally left empty and tracked via `.gitkeep` so you can add real files (images, reports, models) without committing large demo datasets to git.

Repository structure
- .env.example             # Template for API keys (Google, Qdrant, OpenAI) - NEVER push the real .env
- .gitignore               # Ignore .env, __pycache__, and huge dataset files
- docker-compose.yaml      # Spinning up Qdrant locally
- requirements.txt         # Python dependencies
- README.md                # This file

- app/                     # Main Application Source Code (kept empty)
- data/                    # For demo assets (kept empty)
  - sample_xrays/          # Example images (kept empty)
  - sample_reports/        # Corresponding text reports (kept empty)
- docs/                    # Hackathon Documentation (kept empty)

Quick start (local)
1. Clone or create repo and add these files.
2. Create and fill your local `.env` from `.env.example`.
   cp .env.example .env
   # then edit .env and add credentials
3. Start Qdrant (optional, for local dev):
   docker-compose up -d
4. Create virtual env and install deps:
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt

Notes
- Folders are intentionally empty. If you prefer actual starter files (e.g., main.py or example images), tell me which files you want and I will add them.
- If you want me to create the repository on GitHub and push this scaffold, provide the repository owner (username or org) and confirm — I will then ask for the repo name and push details.