"""
check_chunk_lengths.py
------------------------
Checks the token count of every chunk in your ChromaDB collection against
the all-MiniLM-L6-v2 embedding model's 256-token limit. Chunks longer than
this get silently truncated during embedding - meaning content past the
limit is NOT actually being used for retrieval matching.

Run this to see exactly which chunks are affected before deciding how to
fix them.
"""

import chromadb
from chromadb.utils import embedding_functions
from transformers import AutoTokenizer

# ---------- CONFIG ----------
CHROMA_DB_PATH = r"C:\Users\nsaip\OneDrive\Desktop\Kinematics\chroma_db"
COLLECTION_NAME = "kinematics_lectures"
MAX_TOKENS = 256  # all-MiniLM-L6-v2's actual limit
# -----------------------------

embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name="all-MiniLM-L6-v2"
)
client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
collection = client.get_collection(COLLECTION_NAME, embedding_function=embedding_fn)

# Use the same tokenizer the embedding model uses internally
tokenizer = AutoTokenizer.from_pretrained("sentence-transformers/all-MiniLM-L6-v2")

# Pull everything from the collection
all_data = collection.get(include=["documents", "metadatas"])
ids = all_data["ids"]
documents = all_data["documents"]

results = []
for cid, doc in zip(ids, documents):
    token_count = len(tokenizer.encode(doc))
    over_limit = token_count > MAX_TOKENS
    results.append((cid, token_count, over_limit))

# Sort by token count, descending - worst offenders first
results.sort(key=lambda x: x[1], reverse=True)

over_count = sum(1 for _, _, over in results if over)
print(f"Total chunks checked: {len(results)}")
print(f"Chunks OVER {MAX_TOKENS} tokens (will be truncated): {over_count}")
print(f"Chunks within limit: {len(results) - over_count}")
print()
print(f"{'CHUNK_ID':30s} {'TOKENS':>8s}  STATUS")
print("-" * 55)
for cid, count, over in results:
    status = "TRUNCATED" if over else "ok"
    print(f"{cid:30s} {count:>8d}  {status}")

# Save flagged chunks to a file for easy reference
with open("chunks_over_limit.txt", "w") as f:
    f.write(f"Chunks exceeding {MAX_TOKENS} tokens (embedding truncation risk):\n\n")
    for cid, count, over in results:
        if over:
            f.write(f"{cid}: {count} tokens (excess: {count - MAX_TOKENS})\n")

print(f"\nList of over-limit chunks saved to chunks_over_limit.txt")