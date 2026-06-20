import os
import json
import logging
from typing import Dict, List, Any, Union
from .client import get_client, get_model_for_service

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def load_system_prompt() -> str:
    """Loads system prompt from ai/prompts/roadmap.txt dynamically."""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    prompt_path = os.path.join(current_dir, "..", "prompts", "roadmap.txt")
    
    if os.path.exists(prompt_path):
        with open(prompt_path, "r", encoding="utf-8") as f:
            return f.read()
    else:
        logger.warning("Prompt file not found at %s. Using fallback inline prompt.", prompt_path)
        return """
You are a strategic advisor for Indian government schemes application planning.
Your task is to generate a priority-based application roadmap for the user based on their profile and a list of matched schemes.
Priority order:
1. Scholarships
2. Grants
3. Subsidies
4. Loans
"""

def generate_action_plan(profile: Union[Dict[str, Any], str], matched_schemes: Union[List[Dict[str, Any]], str]) -> str:
    """
    Generates a priority-based application roadmap for matched schemes.
    
    Args:
        profile: The user profile (dict or JSON string).
        matched_schemes: The list of matched schemes (list of dicts or JSON string).
        
    Returns:
        A formatted priority application roadmap.
    """
    system_prompt = load_system_prompt()
    
    # Standardize input formats to JSON strings for LLM injection
    profile_str = json.dumps(profile, indent=2) if isinstance(profile, dict) else str(profile)
    schemes_str = json.dumps(matched_schemes, indent=2) if isinstance(matched_schemes, list) else str(matched_schemes)
    
    user_content = f"User Profile:\n{profile_str}\n\nMatched Schemes:\n{schemes_str}"
    
    try:
        client = get_client()
        response = client.chat.completions.create(
            model=get_model_for_service("roadmap"),
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            temperature=0.2  # Low temperature for logical consistency
        )
        
        content = response.choices[0].message.content
        if not content:
            raise ValueError("Nebius API returned an empty completion.")
            
        return content.strip()
        
    except Exception as e:
        logger.error("Error calling Nebius API in generate_action_plan: %s", e)
        return "An error occurred while generating the application roadmap. Please try again later."
