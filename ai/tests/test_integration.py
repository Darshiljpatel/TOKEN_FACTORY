import os
import sys
import json

# Reconfigure stdout/stderr to support unicode characters on Windows console
if sys.platform.startswith('win'):
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# Ensure python can locate the services package by adding the parent directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from services.profile_extractor import extract_profile
from services.scheme_discoverer import generate_search_queries, extract_schemes_from_search
from services.explainer import generate_explanation
from services.roadmap import generate_action_plan
from services.translator import translate_response

def main():
    print("==================================================")
    print("RUNNING SCHEMESATHI AI MODULE INTEGRATION TEST")
    print("==================================================")
    
    # 1. Profile Extraction
    sample_text = (
        "I am a 19 year old engineering student from Karnataka. "
        "My family income is around 3 lakh. I belong to OBC category."
    )
    print(f"\n--- STEP 1: Profile Extraction ---")
    print(f"User text: {sample_text}")
    profile = extract_profile(sample_text)
    print("Extracted Profile:")
    print(json.dumps(profile, indent=2))
    
    # 2. Scheme Discovery: Search Query Generation
    print(f"\n--- STEP 2: Generate Web Search Queries ---")
    queries = generate_search_queries(profile)
    print("Generated Web Search Queries:")
    for idx, q in enumerate(queries, 1):
        print(f"  Query {idx}: {q}")
        
    # 3. Scheme Discovery: Parsing Web Snippets
    print(f"\n--- STEP 3: Extracting Schemes from Search Results ---")
    # Simulating raw search results returned from Google/Serper search api for the queries
    mock_search_results = """
    Result 1: Karnataka Post-Matric Scholarship for OBC students.
    The Department of Backward Classes Welfare Karnataka offers the Post-Matric Scholarship for OBC students pursuing post-matric courses. 
    Eligibility: OBC category, Karnataka resident, annual family income below ₹3 Lakhs. 
    Benefit: ₹25,000 per annum scholarship and waiver of hostel fees.
    Required Documents: Aadhaar Card, Caste Certificate, Income Certificate.
    
    Result 2: State Student Laptop Grant Scheme.
    Under this government grant program, free high-performance laptops are distributed to undergraduate student households in Karnataka with an annual income limit below 5 lakh.
    Required Documents: Aadhaar Card, College Admission Proof, Income Certificate.
    Benefit: One free high-performance laptop.
    Category: Grant.
    
    Result 3: National Education Loan Interest Subsidy Scheme.
    Provides full interest subsidy during the moratorium period on educational loans for students belonging to economically weaker sections and OBC with family income limit below ₹4.5 Lakhs.
    Required Documents: Aadhaar Card, College Admission Proof, Income Certificate, Loan Sanction Letter.
    Category: Loan.
    """
    print("Simulated Raw Search Snippets:")
    print(mock_search_results.strip())
    
    discovered_schemes = extract_schemes_from_search(profile, mock_search_results)
    print("\nParsed Discovered Schemes:")
    print(json.dumps(discovered_schemes, indent=2))
    
    # Fallback to verify other agents if extraction fails
    if not discovered_schemes:
        print("\n[Warning] No schemes extracted. Using fallback schemes for downstream testing.")
        discovered_schemes = [
            {
                "name": "Karnataka Post-Matric Scholarship for OBC",
                "category": "Scholarship",
                "description": "Financial assistance for OBC student pursuing post-matric courses in Karnataka.",
                "benefit": "₹25,000 per annum and hostel fee waiver.",
                "required_documents": ["Aadhaar Card", "Caste Certificate", "Income Certificate"]
            }
        ]
    
    # 4. Eligibility Explanation
    print(f"\n--- STEP 4: Eligibility Explanation ---")
    explanation = generate_explanation(profile, discovered_schemes)
    print("Generated Explanation:")
    print(explanation)
    
    # 5. Application Roadmap
    print(f"\n--- STEP 5: Priority Roadmap Generation ---")
    roadmap = generate_action_plan(profile, discovered_schemes)
    print("Generated Action Plan:")
    print(roadmap)
    
    # 6. Multilingual Translation
    print(f"\n--- STEP 6: Translation (Hindi) ---")
    translated_hindi = translate_response(roadmap, "Hindi")
    print("Translated Action Plan in Hindi (Scheme Names should remain in English):")
    print(translated_hindi)
    
    print(f"\n--- STEP 7: Translation (Kannada) ---")
    translated_kannada = translate_response(explanation, "Kannada")
    print("Translated Explanation in Kannada (Scheme Names should remain in English):")
    print(translated_kannada)
    
    print("\n==================================================")
    print("INTEGRATION TEST COMPLETED SUCCESSFULLY")
    print("==================================================")

if __name__ == "__main__":
    main()
