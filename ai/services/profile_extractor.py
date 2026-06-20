import os
import json
import re
import logging
from typing import Dict, Any
from .client import get_client, get_model_for_service

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Default empty/null schema matching the requirements
DEFAULT_SCHEMA: Dict[str, Any] = {
    "age": None,
    "gender": None,
    "state": None,
    "occupation": None,
    "annual_income": None,
    "education_level": None,
    "caste_category": None,
    "student": False,
    "farmer": False,
    "business_owner": False,
    "senior_citizen": False,
    "disabled": False
}

def load_system_prompt() -> str:
    """Loads system prompt from ai/prompts/extractor.txt dynamically."""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    prompt_path = os.path.join(current_dir, "..", "prompts", "extractor.txt")
    
    if os.path.exists(prompt_path):
        with open(prompt_path, "r", encoding="utf-8") as f:
            return f.read()
    else:
        logger.warning("Prompt file not found at %s. Using fallback inline prompt.", prompt_path)
        return """
You are an expert information extraction system.
Extract user profile information from natural language.
Return ONLY valid JSON.
Schema:
{
  "age": null,
  "gender": null,
  "state": null,
  "occupation": null,
  "annual_income": null,
  "education_level": null,
  "caste_category": null,
  "student": false,
  "farmer": false,
  "business_owner": false,
  "senior_citizen": false,
  "disabled": false
}
Rules:
- Convert income values such as "3 lakh" into integer rupees.
- Infer occupation when obvious.
- Unknown values should be null.
- Return JSON only.
"""

def clean_and_parse_json(text: str) -> Dict[str, Any]:
    """Cleans potential LLM markdown/formatting wrappers and parses JSON."""
    cleaned = text.strip()
    
    # 1. Strip markdown code block wrappers like ```json ... ```
    match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', cleaned, re.DOTALL)
    if match:
        cleaned = match.group(1)
    else:
        # 2. If no wrapper, locate first '{' and last '}'
        start = cleaned.find('{')
        end = cleaned.rfind('}')
        if start != -1 and end != -1:
            cleaned = cleaned[start:end+1]
            
    # 3. Parse JSON
    parsed = json.loads(cleaned)
    
    # 4. Fill in missing keys to ensure exact adherence to the schema
    result = {}
    for key, default in DEFAULT_SCHEMA.items():
        val = parsed.get(key, default)
        
        # Ensure correct boolean types for flags
        if isinstance(default, bool):
            if isinstance(val, str):
                result[key] = val.lower() == "true"
            else:
                result[key] = bool(val)
        else:
            result[key] = val
            
    return result

def extract_profile(user_text: str) -> Dict[str, Any]:
    """
    Extracts profile details from a user's natural language input using Qwen3-32B.
    
    Args:
        user_text: Natural language string describing the user's demographic/economic profile.
        
    Returns:
        A dictionary containing parsed user profile data matching the schema.
    """
    system_prompt = load_system_prompt()
    
    try:
        client = get_client()
        response = client.chat.completions.create(
            model=get_model_for_service("extractor"),
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_text}
            ],
            temperature=0.0  # Zero temperature for deterministic extraction
        )
        
        content = response.choices[0].message.content
        if not content:
            raise ValueError("Nebius API returned an empty completion.")
            
        return clean_and_parse_json(content)
        
    except json.JSONDecodeError as e:
        logger.error("Failed to parse LLM response as JSON. Response was: %s. Error: %s", content if 'content' in locals() else 'N/A', e)
        return DEFAULT_SCHEMA.copy()
    except Exception as e:
        logger.error("Error calling Nebius API in extract_profile: %s", e)
        return DEFAULT_SCHEMA.copy()
