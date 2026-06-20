import os
import logging
from .client import get_client, get_model_for_service

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def load_system_prompt() -> str:
    """Loads system prompt from ai/prompts/translator.txt dynamically."""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    prompt_path = os.path.join(current_dir, "..", "prompts", "translator.txt")
    
    if os.path.exists(prompt_path):
        with open(prompt_path, "r", encoding="utf-8") as f:
            return f.read()
    else:
        logger.warning("Prompt file not found at %s. Using fallback inline prompt.", prompt_path)
        return """
You are a high-quality professional translator for Indian regional languages.
Your task is to translate the provided text into the requested target language.
Supported Languages: Hindi, Kannada, Tamil, Telugu, English.
Keep scheme names unchanged.
"""

def translate_response(text: str, language: str) -> str:
    """
    Translates response text into a specified Indian regional language (or English).
    
    Args:
        text: The text content to translate.
        language: The target language (Hindi, Kannada, Tamil, Telugu, English).
        
    Returns:
        The translated text.
    """
    if not text.strip():
        return ""
        
    # If target language is English, return the original text directly
    if language.strip().lower() == "english":
        return text
        
    system_prompt = load_system_prompt()
    user_content = f"Target Language: {language}\n\nText to Translate:\n{text}"
    
    try:
        client = get_client()
        response = client.chat.completions.create(
            model=get_model_for_service("translator"),
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            temperature=0.3
        )
        
        content = response.choices[0].message.content
        if not content:
            raise ValueError("Nebius API returned an empty completion.")
            
        return content.strip()
        
    except Exception as e:
        logger.error("Error calling Nebius API in translate_response: %s", e)
        return text  # Return the original text as a fallback
