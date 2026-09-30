import os
import urllib.request

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models", "all-MiniLM-L6-v2")
os.makedirs(MODEL_DIR, exist_ok=True)

BASE_URL = "https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/resolve/main/"
FILES = [
    "config.json",
    "config_sentence_transformers.json",
    "modules.json",
    "sentence_bert_config.json",
    "special_tokens_map.json",
    "tokenizer.json",
    "tokenizer_config.json",
    "vocab.txt",
    "model.safetensors",
]

def download():
    print(f"Downloading model files to {MODEL_DIR}...")
    headers = {"User-Agent": "Mozilla/5.0"}
    for fname in FILES:
        dest_path = os.path.join(MODEL_DIR, fname)
        if os.path.exists(dest_path) and os.path.getsize(dest_path) > 0:
            print(f"  [ALREADY EXISTS] {fname} ({os.path.getsize(dest_path)} bytes)")
            continue

        url = BASE_URL + fname
        print(f"  Downloading {fname} from {url}...")
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as resp, open(dest_path, "wb") as out_f:
            total = 0
            while True:
                chunk = resp.read(1024 * 512)
                if not chunk:
                    break
                out_f.write(chunk)
                total += len(chunk)
        print(f"  [DONE] {fname} ({total} bytes)")

    print("All model files downloaded successfully!")

if __name__ == "__main__":
    download()
