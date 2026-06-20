import os
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables (walks up directory tree to find .env)
load_dotenv()

# Centralized configuration
NEBIUS_BASE_URL = "https://api.tokenfactory.nebius.com/v1/"
DEFAULT_MODEL = "Qwen/Qwen3-32B"

# Specialized model mapping based on task requirements
MODEL_ROUTING = {
    "extractor": "Qwen/Qwen3-32B",                           # Fast & strict JSON schema extractor
    "explainer": "Qwen/Qwen3-235B-A22B-Instruct-2507",       # High capacity for contextual reasoning
    "roadmap": "Qwen/Qwen3-235B-A22B-Thinking-2507-fast",    # Thinking/Reasoning model for prioritization (fast endpoint)
    "translator": "deepseek-ai/DeepSeek-V3.2",               # Top-tier multilingual model for Indian languages (DeepSeek V3)
    "discoverer": "Qwen/Qwen3-235B-A22B-Instruct-2507"       # High reasoning for matching search snippets
}

def get_client() -> OpenAI:
    """
    Initializes and returns the OpenAI client configured for Nebius.
    """
    api_key = os.getenv("NEBIUS_API_KEY")
    if not api_key:
        raise ValueError(
            "NEBIUS_API_KEY is not set in the environment variables. "
            "Please ensure it is set in your .env file."
        )
    
    return OpenAI(
        base_url=NEBIUS_BASE_URL,
        api_key=api_key
    )

def get_model_for_service(service_name: str) -> str:
    """
    Returns the designated model identifier based on the service category.
    """
    return MODEL_ROUTING.get(service_name, DEFAULT_MODEL)
