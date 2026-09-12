"""
shared_embedding.py
--------------------
One shared SentenceTransformer instance, used by both dag_cache.py and
semantic_cache.py, so the model loads into memory once instead of twice.
"""
from sentence_transformers import SentenceTransformer

embedding_model = SentenceTransformer("all-MiniLM-L6-v2")