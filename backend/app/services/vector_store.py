from pathlib import Path
from typing import Optional

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings

from ..config import DATA_DIR

# FAISS index folder
VECTORSTORE_DIR = DATA_DIR / "internal_docs_index"

# simple in-memory cache
_embeddings = None
_vectordb_cache: Optional[FAISS] = None


def _get_embeddings() -> HuggingFaceEmbeddings:
    """
    Ek hi embeddings object poore app me reuse karne ke liye
    (varnah har call pe model load hoga = slow).
    """
    global _embeddings
    if _embeddings is None:
        _embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )
    return _embeddings


def build_internal_docs_vectorstore() -> Optional[FAISS]:
    """
    internal_docs/ ke sab PDFs ko:
    - load karta hai
    - chunks me split karta hai
    - embeddings banata hai
    - FAISS index bana ke disk pe save karta hai

    Ye function ya to tum manually run kar sakte ho
    ya pehli baar app run hote time auto-call ho sakta hai.
    """
    docs_dir = DATA_DIR / "internal_docs"
    pdf_paths = list(docs_dir.glob("*.pdf"))

    if not pdf_paths:
        print("⚠️  No PDFs found in internal_docs/. Cannot build vector store.")
        return None

    all_docs = []
    for path in pdf_paths:
        loader = PyPDFLoader(str(path))
        docs = loader.load()
        all_docs.extend(docs)

    if not all_docs:
        print("⚠️  PDFs found but no readable text extracted.")
        return None

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=150,
    )
    split_docs = text_splitter.split_documents(all_docs)

    embeddings = _get_embeddings()
    vectordb = FAISS.from_documents(split_docs, embeddings)

    VECTORSTORE_DIR.mkdir(parents=True, exist_ok=True)
    vectordb.save_local(str(VECTORSTORE_DIR))
    print(f"✅ Built internal_docs vectorstore with {len(split_docs)} chunks.")

    global _vectordb_cache
    _vectordb_cache = vectordb
    return vectordb


def _load_internal_docs_vectorstore() -> Optional[FAISS]:
    """
    Disk se FAISS index load karta hai (agar exist karta ho).
    Memory me cache bhi rakhta hai.
    """
    global _vectordb_cache
    if _vectordb_cache is not None:
        return _vectordb_cache

    if not VECTORSTORE_DIR.exists():
        return None

    embeddings = _get_embeddings()
    vectordb = FAISS.load_local(
        str(VECTORSTORE_DIR),
        embeddings,
        allow_dangerous_deserialization=True,
    )
    _vectordb_cache = vectordb
    print("✅ Loaded internal_docs vectorstore from disk.")
    return vectordb


def get_internal_docs_vectorstore() -> Optional[FAISS]:
    """
    Public helper:
    - pehle memory cache check
    - nahi mila to disk se load
    - disk bhi nahi mila to attempt build (agar PDFs hain)
    """
    db = _load_internal_docs_vectorstore()
    if db is not None:
        return db

    # try to build if not present
    return build_internal_docs_vectorstore()


if __name__ == "__main__":
    # Agar tum direct run karo:
    #   cd backend
    #   python -m app.services.vector_store
    # to ye vector store build kar dega.
    build_internal_docs_vectorstore()
