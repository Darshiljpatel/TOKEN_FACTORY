# SchemeSathi AI Module

An AI-powered Government Scheme Finder and Application Planner for India. This module encapsulates all AI-driven agents responsible for profile extraction, real-time scheme discovery, eligibility explanation, priority application roadmaps, and multilingual translation.

---

## 1. Folder Structure

```text
ai/
├── prompts/
│   ├── extractor.txt            # System prompt for profile extraction JSON schema
│   ├── explainer.txt            # System prompt for generating eligibility explanations
│   ├── roadmap.txt              # System prompt for priority application roadmap sorting
│   ├── translator.txt           # System prompt for multilingual regional language translation
│   ├── discoverer_queries.txt   # System prompt for generating search engine queries
│   └── discoverer_extractor.txt # System prompt for parsing raw search snippets into JSON
├── services/
│   ├── __init__.py              # Package initialization & public exports
│   ├── client.py                # Shared client configured for Nebius API & Dynamic Routing
│   ├── profile_extractor.py     # Profile Extraction Agent
│   ├── scheme_discoverer.py     # Scheme Discovery Agent (Real-time finding)
│   ├── explainer.py             # Eligibility Explanation Agent
│   ├── roadmap.py               # Roadmap Planning Agent
│   └── translator.py            # Multilingual Translation Agent
├── tests/
│   ├── test_extractor.py        # Simple profile extractor agent test script
│   └── test_integration.py      # E2E Integration test validating the full agent pipeline
├── README.md                    # Documentation (this file)
└── requirements.txt             # Python package dependencies
```

---

## 2. Environment Variables & Model Routing

This module uses the **OpenAI SDK** to communicate with the **Nebius API** backend.

### Environment Variable Setup
Ensure you configure this in a `.env` file at the root of the project:

```bash
# Required: Your Nebius token factory API key
NEBIUS_API_KEY=your_nebius_api_key_here
```

### Dynamic Model Routing
To optimize speed, quality, and capabilities, different agent services route their requests to specialized LLMs configured in `services/client.py`:

* **`extractor`**: `Qwen/Qwen3-32B` (Fast, highly accurate schema extraction)
* **`explainer`**: `Qwen/Qwen3-235B-A22B-Instruct-2507` (High reasoning for rule matching)
* **`roadmap`**: `Qwen/Qwen3-235B-A22B-Thinking-2507` (Thinking model optimized for structured planning)
* **`translator`**: `Qwen/Qwen3.5-397B-A17B` (Top-tier multilingual model for Indian regional languages)
* **`discoverer`**: `Qwen/Qwen3-235B-A22B-Instruct-2507` (Robust comprehension for structuring web snippets)

---

## 3. Getting Started & Running Tests

### Prerequisites
- Python 3.8+
- Active internet connection

### Installation
From the `ai/` directory, install the dependencies:

```bash
pip install -r requirements.txt
```

### Running Tests

1. **Profile Extraction Test**:
   Validates profile parsing.
   ```bash
   python tests/test_extractor.py
   ```

2. **Integration Test Suite**:
   Runs the entire pipeline (Profile extraction -> Search query generation -> Scheme extraction from search results -> Eligibility explanation -> Priority roadmap -> Multilingual translation).
   ```bash
   python tests/test_integration.py
   ```

---

## 4. Reusable AI Service Functions

All functions are designed to be fully modular and ready to be imported directly into **FastAPI** route endpoints.

### 1. `extract_profile`
- **Path**: `services/profile_extractor.py`
- **Signature**: `extract_profile(user_text: str) -> dict`
- **Description**: Parses user natural language inputs and extracts details into a strict JSON profile matching the schema (age, gender, state, income, student/farmer flags).

### 2. `generate_search_queries`
- **Path**: `services/scheme_discoverer.py`
- **Signature**: `generate_search_queries(profile: dict) -> list[str]`
- **Description**: Formulates 2-3 specific search strings (e.g. "latest Karnataka student scholarship schemes 2026 OBC") tailored to find schemes for the user's demographic on Google/Bing.

### 3. `extract_schemes_from_search`
- **Path**: `services/scheme_discoverer.py`
- **Signature**: `extract_schemes_from_search(profile: dict, search_results: str) -> list[dict]`
- **Description**: Extracts a structured list of schemes from raw web search output text/snippets. Outputs schemes containing name, category, description, benefit, and required documents.

### 4. `generate_explanation`
- **Path**: `services/explainer.py`
- **Signature**: `generate_explanation(profile: dict, matched_schemes: list) -> str`
- **Description**: Formulates concise eligibility reasons, benefits, and document checklists for the matched schemes.

### 5. `generate_action_plan`
- **Path**: `services/roadmap.py`
- **Signature**: `generate_action_plan(profile: dict, matched_schemes: list) -> str`
- **Description**: Groups schemes into a priority application roadmap (Scholarships > Grants > Subsidies > Loans).

### 6. `translate_response`
- **Path**: `services/translator.py`
- **Signature**: `translate_response(text: str, language: str) -> str`
- **Description**: Translates explanations or roadmaps into **Hindi, Kannada, Tamil, Telugu, and English**. It guarantees that scheme names are kept unchanged in English.

---

## 5. Example Real-time Discovery Pipeline Flow

```python
from services.profile_extractor import extract_profile
from services.scheme_discoverer import generate_search_queries, extract_schemes_from_search

# 1. User details entered
user_text = "I am a 19 year old engineering student from Karnataka. Family income 3 lakh, caste OBC."
profile = extract_profile(user_text)

# 2. Get search query strings
search_queries = generate_search_queries(profile)
# Returns: ["latest Karnataka government scholarship schemes 2026 OBC student", ...]

# 3. Backend executes search_queries against Serper/Google (simulation)
raw_search_results = "..." # Raw HTML/text returned from search engine

# 4. Extract structured scheme JSON list from search output
schemes = extract_schemes_from_search(profile, raw_search_results)
# Returns list of dicts: [{"name": "Karnataka Post-Matric Scholarship...", "category": "Scholarship", ...}]
```
