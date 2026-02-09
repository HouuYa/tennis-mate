"""
Tennis Rules ETL - Bilingual SQL Generator
==========================================
Generates SQL INSERT statements from extracted tennis rules text (Korean/English).
Based on Tennis_Rules_RAG/gen_sql_from_txt.py with bilingual support + metadata.

Usage:
  python scripts/gen_sql_bilingual.py --input full_rules_text.txt --source "테니스규정집.pdf" --language ko
  python scripts/gen_sql_bilingual.py --input english_rules.txt --source "2026-rules-of-tennis-english.pdf" --language en
  python scripts/gen_sql_bilingual.py --input english_rules.txt --source "2026-rules-of-tennis-english.pdf" --language en --dry-run
"""
import os
import re
import argparse
import numpy as np
import google.generativeai as genai
from tqdm import tqdm
from dotenv import load_dotenv

load_dotenv()


class BilingualSQLGen:
    def __init__(self, dry_run=False):
        self.dry_run = dry_run
        self.embedding_model = "models/gemini-embedding-001"
        self.embedding_dim = 768

        if not dry_run:
            self.gemini_key = os.getenv("GEMINI_API_KEY")
            if not self.gemini_key:
                raise ValueError("GEMINI_API_KEY not found in environment variables")
            genai.configure(api_key=self.gemini_key)

    def load_text(self, txt_path):
        with open(txt_path, 'r', encoding='utf-8') as f:
            return f.read()

    def split_into_chunks(self, text, source_name, language):
        """Split text into chunks using bilingual regex patterns."""

        # Start marker: skip TOC and find where actual content begins
        start_marker = re.search(
            r"(\*\*1\.\s*(?:코트|THE COURT|Court)"
            r"|\*\*(?:ITF\s*테니스\s*룰|ITF\s*Rules\s*of\s*Tennis|FOREWORD)\*\*"
            r"|\*\*Rule\s*1[\.\s])",
            text, flags=re.IGNORECASE
        )

        intro_text = ""
        body_text = text

        if start_marker:
            intro_text = text[:start_marker.start()]
            body_text = text[start_marker.start():]
            print(f"Body start found at character {start_marker.start()}")
        else:
            print("Warning: Could not find main body start marker. Using full text.")

        # Body split pattern (bilingual)
        body_split_pattern = re.compile(
            r"(\n\s*\*\*(?!(?:페이지|목차|표지|머리말|Page|Contents|Table\s*of|Note))"
            r"(?:\d+\.\s|[I-V]+\.\s|[A-Z]\.\s|Rule\s*\d+|APPENDIX\s+[IVX]+|Appendix\s+[IVX]+)"
            r".*?\*\*(\n|$))",
            flags=re.IGNORECASE
        )

        parts = body_split_pattern.split(body_text)
        chunks = []

        # Add intro/foreword if present
        if intro_text.strip():
            chunks.append({
                "source_file": source_name,
                "rule_id": "Foreword/Intro",
                "content": intro_text.strip()[:8000],
                "metadata": {
                    "language": language,
                    "section_type": "foreword",
                    "original_len": len(intro_text.strip()),
                }
            })

        for i in range(1, len(parts), 3):
            header = parts[i].strip()
            content = parts[i + 2].strip() if i + 2 < len(parts) else ""

            rule_id = header.replace("**", "").strip()
            full_content = f"{header}\n{content}"

            if len(full_content.strip()) > 30:
                # Determine section type from rule_id
                section_type = self._classify_section(rule_id)

                chunks.append({
                    "source_file": source_name,
                    "rule_id": rule_id,
                    "content": full_content,
                    "metadata": {
                        "language": language,
                        "section_type": section_type,
                        "original_len": len(full_content),
                    }
                })

        # Fallback if no chunks found
        if not chunks and body_text.strip():
            chunks.append({
                "source_file": source_name,
                "rule_id": "Full Body (Fallback)",
                "content": body_text.strip()[:8000],
                "metadata": {
                    "language": language,
                    "section_type": "other",
                    "original_len": len(body_text.strip()),
                }
            })

        return chunks

    def _classify_section(self, rule_id):
        """Classify section type from rule_id."""
        if re.match(r'^\d+\.', rule_id):
            return "rule"
        if re.match(r'^[a-zA-Z]\.', rule_id):
            return "sub-section"
        if re.match(r'^(부록|Appendix|APPENDIX|[IVX]+\.)', rule_id, re.IGNORECASE):
            return "appendix"
        if re.match(r'^(Foreword|머리말|FOREWORD)', rule_id, re.IGNORECASE):
            return "foreword"
        return "other"

    def generate_sql(self, chunks, output_file):
        """Generate SQL INSERT statements with embeddings and metadata."""
        import time
        import json

        print(f"Generating SQL for {len(chunks)} chunks...")

        if self.dry_run:
            print("\n[DRY RUN] Skipping embedding generation. Showing chunk summary:\n")
            for i, item in enumerate(chunks):
                print(f"  {i + 1:3d}. [{item['metadata']['original_len']:5d} chars] "
                      f"[{item['metadata']['section_type']:12s}] {item['rule_id'][:60]}")
            print(f"\nTotal: {len(chunks)} chunks")
            return

        with open(output_file, "w", encoding="utf-8") as f:
            for item in tqdm(chunks):
                max_retries = 5
                retry_delay = 2
                embedding = None

                for attempt in range(max_retries):
                    try:
                        result = genai.embed_content(
                            model=self.embedding_model,
                            content=item["content"],
                            task_type="retrieval_document",
                            output_dimensionality=self.embedding_dim,
                        )
                        embedding = result['embedding']
                        break
                    except Exception as e:
                        if "429" in str(e) or "Resource exhausted" in str(e):
                            if attempt < max_retries - 1:
                                time.sleep(retry_delay)
                                retry_delay *= 2
                                continue
                        print(f"\nError processing {item.get('rule_id', 'unknown')}: {e}")
                        break

                if embedding is None:
                    continue

                try:
                    # Normalize
                    vec_np = np.array(embedding, dtype=float)
                    norm = np.linalg.norm(vec_np)
                    if norm > 0:
                        vec_np = vec_np / norm
                    embedding_list = vec_np.tolist()

                    content_esc = item["content"].replace("'", "''")
                    rule_id_esc = item["rule_id"].replace("'", "''")
                    source_esc = item["source_file"].replace("'", "''")
                    metadata_json = json.dumps(item["metadata"], ensure_ascii=False).replace("'", "''")
                    embedding_str = str(embedding_list)

                    sql = (
                        f"INSERT INTO tennis_rules (source_file, rule_id, content, metadata, embedding) "
                        f"VALUES ('{source_esc}', '{rule_id_esc}', '{content_esc}', "
                        f"'{metadata_json}'::jsonb, '{embedding_str}'::vector);\n"
                    )
                    f.write(sql)
                    f.flush()

                    time.sleep(1.0)

                except Exception as e:
                    print(f"SQL formulation error for {item.get('rule_id', 'unknown')}: {e}")

        print(f"Done! SQL saved to {output_file}")


def main():
    parser = argparse.ArgumentParser(description="Bilingual Tennis Rules SQL Generator")
    parser.add_argument("--input", required=True, help="Path to extracted text file")
    parser.add_argument("--source", required=True, help="Source PDF filename")
    parser.add_argument("--language", required=True, choices=["ko", "en"], help="Language of the text")
    parser.add_argument("--output", default="insert_rules.sql", help="Output SQL file")
    parser.add_argument("--dry-run", action="store_true", help="Only show chunks, skip embedding generation")
    args = parser.parse_args()

    etl = BilingualSQLGen(dry_run=args.dry_run)

    text = etl.load_text(args.input)
    print(f"Loaded {len(text)} chars from {args.input}")

    chunks = etl.split_into_chunks(text, args.source, args.language)
    print(f"Found {len(chunks)} chunks.")

    etl.generate_sql(chunks, args.output)


if __name__ == "__main__":
    main()
