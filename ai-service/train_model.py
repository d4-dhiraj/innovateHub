import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import joblib

# Load the dataset
print("Loading dataset...")
df = pd.read_csv('problem_dataset.csv')

print(f"Dataset shape: {df.shape}")
print(f"Categories: {df['category'].unique()}")
print(f"Category distribution:\n{df['category'].value_counts()}")

# Split features and target
X = df['description']
y = df['category']

# Split into train and test sets
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

# Create TF-IDF vectorizer
print("Creating TF-IDF vectorizer...")
tfidf_vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')

# Fit and transform training data
X_train_tfidf = tfidf_vectorizer.fit_transform(X_train)
X_test_tfidf = tfidf_vectorizer.transform(X_test)

# Train Logistic Regression classifier
print("Training Logistic Regression classifier...")
classifier = LogisticRegression(max_iter=1000, random_state=42)
classifier.fit(X_train_tfidf, y_train)

# Evaluate the model
print("Evaluating model...")
y_pred = classifier.predict(X_test_tfidf)
accuracy = accuracy_score(y_test, y_pred)
print(f"Accuracy: {accuracy:.4f}")
print("\nClassification Report:")
print(classification_report(y_test, y_pred))

# Save the model and vectorizer
print("Saving model and vectorizer...")
joblib.dump(classifier, 'classifier.pkl')
joblib.dump(tfidf_vectorizer, 'tfidf_vectorizer.pkl')

print("Model and vectorizer saved successfully!")
print("Files saved: classifier.pkl, tfidf_vectorizer.pkl")
