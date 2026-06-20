import os
import json
import re
import logging
from typing import Dict, List, Any, Union
from .client import get_client, get_model_for_service

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def load_prompt(filename: str, fallback_content: str) -> str:
    """Loads a prompt template dynamically from ai/prompts/."""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    prompt_path = os.path.join(current_dir, "..", "prompts", filename)
    
    if os.path.exists(prompt_path):
        with open(prompt_path, "r", encoding="utf-8") as f:
            return f.read()
    else:
        logger.warning("Prompt file not found at %s. Using fallback prompt.", prompt_path)
        return fallback_content

def generate_search_queries(profile: Union[Dict[str, Any], str]) -> List[str]:
    """
    Generates 2-3 target search engine queries based on a user profile.
    
    Args:
        profile: The user profile (dict or JSON string).
        
    Returns:
        A list of search query strings.
    """
    fallback = "You are a search planner for Indian government schemes. Analyze the profile and output 2 to 3 web search queries, one per line."
    system_prompt = load_prompt("discoverer_queries.txt", fallback)
    
    profile_str = json.dumps(profile, indent=2) if isinstance(profile, dict) else str(profile)
    user_content = f"User Profile JSON:\n{profile_str}"
    
    try:
        client = get_client()
        response = client.chat.completions.create(
            model=get_model_for_service("discoverer"),
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            temperature=0.3
        )
        
        content = response.choices[0].message.content
        if not content:
            raise ValueError("Nebius API returned empty search query suggestion.")
            
        # Split by lines and clean queries
        queries = []
        for line in content.splitlines():
            cleaned_line = line.strip().lstrip("-*•").strip()
            # Remove leading numbers (e.g. "1. query")
            cleaned_line = re.sub(r'^\d+[\.\)\-]\s*', '', cleaned_line).strip()
            if cleaned_line:
                queries.append(cleaned_line)
                
        # Limit to maximum of 3 queries
        return queries[:3]
        
    except Exception as e:
        logger.error("Error generating search queries: %s", e)
        # Fallback queries based on profile elements
        prof_dict = profile if isinstance(profile, dict) else {}
        state = prof_dict.get("state", "India")
        caste = prof_dict.get("caste_category", "")
        return [
            f"latest {state} government schemes 2026",
            f"government schemes for students {caste} 2026"
        ]

def extract_schemes_from_search(profile: Union[Dict[str, Any], str], search_results: str) -> List[Dict[str, Any]]:
    """
    Parses raw search engine outputs and user profile, returning a structured list of matched schemes.
    
    Args:
        profile: The user profile (dict or JSON string).
        search_results: The text block containing raw search snippets or contents.
        
    Returns:
        A list of structured scheme dictionaries.
    """
    if not search_results.strip():
        return []
        
    fallback = "You are a government scheme extraction system. Parse the raw search results and return a structured JSON list of matching schemes."
    system_prompt = load_prompt("discoverer_extractor.txt", fallback)
    
    profile_str = json.dumps(profile, indent=2) if isinstance(profile, dict) else str(profile)
    user_content = f"User Profile:\n{profile_str}\n\nSearch Results / Web snippets:\n{search_results}"
    
    try:
        client = get_client()
        response = client.chat.completions.create(
            model=get_model_for_service("discoverer"),
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            temperature=0.1
        )
        
        content = response.choices[0].message.content
        if not content:
            raise ValueError("Nebius API returned empty scheme extraction response.")
            
        # Clean potential markdown wrappers
        cleaned = content.strip()
        match = re.search(r'```(?:json)?\s*(\[.*?\])\s*```', cleaned, re.DOTALL)
        if match:
            cleaned = match.group(1)
        else:
            start = cleaned.find('[')
            end = cleaned.rfind(']')
            if start != -1 and end != -1:
                cleaned = cleaned[start:end+1]
                
        parsed_schemes = json.loads(cleaned)
        
        if not isinstance(parsed_schemes, list):
            if isinstance(parsed_schemes, dict):
                return [parsed_schemes]
            return []
            
        return parsed_schemes
        
    except json.JSONDecodeError as e:
        logger.error("Failed to parse extracted schemes as JSON. Content: %s. Error: %s", content if 'content' in locals() else 'N/A', e)
        return []
    except Exception as e:
        logger.error("Error extracting schemes from search results: %s", e)
        return []
