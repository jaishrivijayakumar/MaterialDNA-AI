"""
MaterialDNA AI — Candidate Retriever

Uses TF-IDF vectorization + cosine similarity for fast candidate retrieval
from the material database. Returns top-K most similar materials for
detailed comparison.
"""

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from typing import Optional


class CandidateRetriever:
    """
    TF-IDF-based candidate retriever for material descriptions.

    Builds an inverted index over normalized material descriptions
    and retrieves the most similar candidates for a query.
    """

    def __init__(self):
        self.vectorizer = TfidfVectorizer(
            analyzer="char_wb",
            ngram_range=(2, 4),
            max_features=10000,
            sublinear_tf=True,
            strip_accents="unicode",
        )
        self.tfidf_matrix = None
        self.material_ids: list[str] = []
        self.descriptions: list[str] = []
        self._fitted = False

    def fit(self, material_ids: list[str], descriptions: list[str]) -> None:
        """
        Build the TF-IDF index from material descriptions.

        Args:
            material_ids: List of material IDs corresponding to descriptions
            descriptions: List of normalized material descriptions
        """
        if not descriptions:
            return

        self.material_ids = list(material_ids)
        self.descriptions = list(descriptions)
        self.tfidf_matrix = self.vectorizer.fit_transform(descriptions)
        self._fitted = True

    def add_materials(self, material_ids: list[str], descriptions: list[str]) -> None:
        """Add new materials and rebuild the index."""
        self.material_ids.extend(material_ids)
        self.descriptions.extend(descriptions)
        if self.descriptions:
            self.tfidf_matrix = self.vectorizer.fit_transform(self.descriptions)
            self._fitted = True

    def retrieve(
        self,
        query: str,
        top_k: int = 10,
        exclude_ids: Optional[list[str]] = None,
        min_similarity: float = 0.1,
    ) -> list[dict]:
        """
        Retrieve top-K candidate materials for a query description.

        Args:
            query: Normalized query description
            top_k: Maximum number of candidates to return
            exclude_ids: Material IDs to exclude from results
            min_similarity: Minimum similarity threshold

        Returns:
            List of dicts with keys: material_id, description, similarity
        """
        if not self._fitted or self.tfidf_matrix is None:
            return []

        exclude_set = set(exclude_ids or [])

        # Transform query using fitted vectorizer
        query_vec = self.vectorizer.transform([query])

        # Calculate cosine similarity
        similarities = cosine_similarity(query_vec, self.tfidf_matrix).flatten()

        # Get top indices sorted by similarity (descending)
        top_indices = np.argsort(similarities)[::-1]

        results = []
        for idx in top_indices:
            if len(results) >= top_k:
                break

            mat_id = self.material_ids[idx]
            sim = float(similarities[idx])

            if mat_id in exclude_set:
                continue
            if sim < min_similarity:
                break

            results.append({
                "material_id": mat_id,
                "description": self.descriptions[idx],
                "similarity": round(sim, 4),
            })

        return results

    def compute_similarity(self, text_a: str, text_b: str) -> float:
        """
        Compute pairwise similarity between two descriptions.
        Does not require a fitted index.
        """
        if not text_a or not text_b:
            return 0.0

        temp_vectorizer = TfidfVectorizer(
            analyzer="char_wb",
            ngram_range=(2, 4),
            max_features=5000,
            sublinear_tf=True,
        )
        matrix = temp_vectorizer.fit_transform([text_a, text_b])
        sim = cosine_similarity(matrix[0:1], matrix[1:2])[0][0]
        return round(float(sim), 4)


# Singleton instance
_retriever: Optional[CandidateRetriever] = None


def get_retriever() -> CandidateRetriever:
    """Get or create the global CandidateRetriever instance."""
    global _retriever
    if _retriever is None:
        _retriever = CandidateRetriever()
    return _retriever


def reset_retriever() -> None:
    """Reset the global retriever (for re-indexing after data changes)."""
    global _retriever
    _retriever = None
