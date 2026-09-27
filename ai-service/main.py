from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import uvicorn
import os
from dotenv import load_dotenv
from supabase import create_client, Client
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="Problem Category Classifier")

# Enable CORS for all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the trained model and vectorizer
print("Loading model and vectorizer...")
classifier = joblib.load('classifier.pkl')
tfidf_vectorizer = joblib.load('tfidf_vectorizer.pkl')
print("Model and vectorizer loaded successfully!")

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not supabase_url or not supabase_service_role_key:
    print("Warning: Supabase credentials not found in environment variables")
    supabase_client = None
else:
    supabase_client: Client = create_client(supabase_url, supabase_service_role_key)
    print("Supabase client initialized successfully!")

# Define request models
class ClassificationRequest(BaseModel):
    text: str

class DuplicateCheckRequest(BaseModel):
    text: str
    category: str

@app.post("/classify")
async def classify(request: ClassificationRequest):
    """
    Classify a problem description into one of the predefined categories.

    Args:
        request: JSON body with "text" field containing the problem description

    Returns:
        JSON response with "category" field containing the predicted category
    """
    try:
        # Transform the input text using the loaded vectorizer
        text_tfidf = tfidf_vectorizer.transform([request.text])

        # Predict the category
        predicted_category = classifier.predict(text_tfidf)[0]

        return {"category": predicted_category}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/check-duplicate")
async def check_duplicate(request: DuplicateCheckRequest):
    """
    Check if a problem description is similar to existing problems in the same category.

    Args:
        request: JSON body with "text" and "category" fields

    Returns:
        JSON response with "duplicate" field containing the most similar problem
        (with similarity score) if score > 0.6, else null
    """
    if not supabase_client:
        # Return null if Supabase is not configured
        return {"duplicate": None}

    try:
        # Fetch existing problems from the same category
        response = supabase_client.table('problems').select('id, title, description').eq('category', request.category).execute()

        if not response.data or len(response.data) == 0:
            return {"duplicate": None}

        existing_problems = response.data

        # Transform the new text
        new_text_tfidf = tfidf_vectorizer.transform([request.text])

        # Transform all existing descriptions
        existing_descriptions = [problem['description'] for problem in existing_problems]
        existing_tfidf = tfidf_vectorizer.transform(existing_descriptions)

        # Calculate cosine similarity
        similarities = cosine_similarity(new_text_tfidf, existing_tfidf)[0]

        # Find the most similar problem
        max_similarity_idx = np.argmax(similarities)
        max_similarity = similarities[max_similarity_idx]

        if max_similarity > 0.6:
            most_similar_problem = existing_problems[max_similarity_idx]
            return {
                "duplicate": {
                    "id": most_similar_problem['id'],
                    "title": most_similar_problem['title'],
                    "description": most_similar_problem['description'],
                    "similarity_score": float(max_similarity)
                }
            }
        else:
            return {"duplicate": None}

    except Exception as e:
        # Return null on any error instead of throwing 500
        print(f"Error checking duplicate: {e}")
        return {"duplicate": None}

@app.get("/")
async def root():
    return {"message": "Problem Category Classifier API is running"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
