#!/usr/bin/env python3
"""
Tennis Rules ETL Script
-----------------------
PDF 파일에서 테니스 룰을 추출하고, 조항별로 chunking한 후,
Gemini embeddings를 생성하여 Supabase에 업로드합니다.

사용법:
    python upload_tennis_rules.py --pdf-dir ./pdfs --supabase-url YOUR_URL --supabase-key YOUR_KEY --gemini-key YOUR_KEY

필수 환경 변수:
    SUPABASE_URL: Supabase 프로젝트 URL
    SUPABASE_SERVICE_KEY: Supabase service role key (관리자 권한)
    GEMINI_API_KEY: Google Gemini API key
"""

import os
import re
import sys
import argparse
import logging
from pathlib import Path
from typing import List, Dict, Tuple
from datetime import datetime

try:
    from dotenv import load_dotenv
    from supabase import create_client, Client
    import PyPDF2
    import google.generativeai as genai
except ImportError as e:
    print(f"❌ 필수 패키지가 설치되지 않았습니다: {e}")
    print("다음 명령어로 설치하세요: pip install -r requirements.txt")
    sys.exit(1)

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class TennisRulesETL:
    """테니스 룰 ETL 파이프라인"""

    def __init__(self, supabase_url: str, supabase_key: str, gemini_api_key: str):
        """
        Args:
            supabase_url: Supabase 프로젝트 URL
            supabase_key: Supabase service role key
            gemini_api_key: Gemini API key
        """
        self.supabase: Client = create_client(supabase_url, supabase_key)
        genai.configure(api_key=gemini_api_key)
        self.embedding_model = 'models/text-embedding-004'

        logger.info("✓ Supabase 및 Gemini API 초기화 완료")

    def extract_text_from_pdf(self, pdf_path: Path) -> str:
        """PDF 파일에서 텍스트 추출"""
        try:
            with open(pdf_path, 'rb') as file:
                reader = PyPDF2.PdfReader(file)
                text = ""
                for page_num, page in enumerate(reader.pages, 1):
                    page_text = page.extract_text()
                    text += page_text + "\n"
                    if page_num % 10 == 0:
                        logger.info(f"  {pdf_path.name}: {page_num}/{len(reader.pages)} 페이지 처리 중...")

                logger.info(f"✓ {pdf_path.name}: {len(reader.pages)} 페이지, {len(text)} 글자 추출 완료")
                return text
        except Exception as e:
            logger.error(f"❌ PDF 읽기 실패 ({pdf_path}): {e}")
            return ""

    def chunk_by_articles(self, text: str, source_file: str, language: str) -> List[Dict]:
        """
        텍스트를 조항별로 chunking

        영어: Article, Rule, Section 등으로 구분
        한글: 제N조, 제N장 등으로 구분
        """
        chunks = []

        if language == 'ko':
            # 한글: 제N조, 제N장 패턴
            pattern = r'(제\s*\d+\s*[조장절항])'
            splits = re.split(pattern, text)
        else:
            # 영어: Article/Rule/Section N 패턴
            pattern = r'((?:Article|Rule|Section|ARTICLE|RULE|SECTION)\s+\d+)'
            splits = re.split(pattern, text)

        current_title = None
        current_content = []

        for i, segment in enumerate(splits):
            segment = segment.strip()
            if not segment:
                continue

            # 제목인 경우
            if re.match(pattern, segment):
                # 이전 chunk 저장
                if current_title and current_content:
                    content_text = ' '.join(current_content).strip()
                    if len(content_text) > 50:  # 최소 길이 체크
                        chunks.append({
                            'title': current_title,
                            'content': content_text,
                            'source_file': source_file,
                            'language': language,
                            'chunk_index': len(chunks)
                        })

                # 새 chunk 시작
                current_title = segment
                current_content = []
            else:
                # 내용 추가
                current_content.append(segment)

        # 마지막 chunk 저장
        if current_title and current_content:
            content_text = ' '.join(current_content).strip()
            if len(content_text) > 50:
                chunks.append({
                    'title': current_title,
                    'content': content_text,
                    'source_file': source_file,
                    'language': language,
                    'chunk_index': len(chunks)
                })

        # 조항 패턴을 찾지 못한 경우, 크기 기반 chunking
        if not chunks:
            logger.warning(f"⚠️  조항 패턴을 찾지 못함. 크기 기반 chunking 사용: {source_file}")
            chunks = self._chunk_by_size(text, source_file, language)

        logger.info(f"✓ Chunking 완료: {len(chunks)} chunks 생성")
        return chunks

    def _chunk_by_size(self, text: str, source_file: str, language: str,
                       chunk_size: int = 800, overlap: int = 150) -> List[Dict]:
        """크기 기반 chunking (fallback)"""
        chunks = []
        start = 0
        chunk_index = 0

        while start < len(text):
            end = start + chunk_size
            chunk_text = text[start:end].strip()

            if chunk_text:
                chunks.append({
                    'title': f"Section {chunk_index + 1}",
                    'content': chunk_text,
                    'source_file': source_file,
                    'language': language,
                    'chunk_index': chunk_index
                })
                chunk_index += 1

            start = end - overlap

        return chunks

    def generate_embeddings(self, chunks: List[Dict]) -> List[Dict]:
        """Gemini API로 embeddings 생성"""
        logger.info(f"Embeddings 생성 시작: {len(chunks)} chunks")

        for i, chunk in enumerate(chunks, 1):
            try:
                # Gemini embedding API 호출
                combined_text = f"{chunk['title']}\n\n{chunk['content']}"
                result = genai.embed_content(
                    model=self.embedding_model,
                    content=combined_text,
                    task_type="retrieval_document"
                )

                chunk['embedding'] = result['embedding']

                if i % 10 == 0:
                    logger.info(f"  Embeddings: {i}/{len(chunks)} 완료")

            except Exception as e:
                logger.error(f"❌ Embedding 생성 실패 (chunk {i}): {e}")
                chunk['embedding'] = None

        # embedding이 없는 chunk 제거
        valid_chunks = [c for c in chunks if c.get('embedding') is not None]
        logger.info(f"✓ Embeddings 생성 완료: {len(valid_chunks)}/{len(chunks)} 성공")

        return valid_chunks

    def upload_to_supabase(self, chunks: List[Dict]) -> int:
        """Supabase에 데이터 업로드"""
        logger.info(f"Supabase 업로드 시작: {len(chunks)} chunks")

        uploaded_count = 0
        batch_size = 10

        for i in range(0, len(chunks), batch_size):
            batch = chunks[i:i+batch_size]

            try:
                # Supabase에 삽입할 데이터 준비
                records = []
                for chunk in batch:
                    records.append({
                        'title': chunk['title'],
                        'content': chunk['content'],
                        'source_file': chunk['source_file'],
                        'language': chunk['language'],
                        'chunk_index': chunk['chunk_index'],
                        'embedding': chunk['embedding'],
                        'created_at': datetime.utcnow().isoformat()
                    })

                # Batch insert
                result = self.supabase.table('tennis_rules').insert(records).execute()
                uploaded_count += len(batch)

                logger.info(f"  업로드: {uploaded_count}/{len(chunks)} 완료")

            except Exception as e:
                logger.error(f"❌ Supabase 업로드 실패 (batch {i//batch_size + 1}): {e}")

        logger.info(f"✓ Supabase 업로드 완료: {uploaded_count} chunks")
        return uploaded_count

    def process_pdf(self, pdf_path: Path, language: str) -> int:
        """단일 PDF 파일 처리"""
        logger.info(f"\n{'='*60}")
        logger.info(f"PDF 처리 시작: {pdf_path.name} ({language})")
        logger.info(f"{'='*60}")

        # 1. PDF에서 텍스트 추출
        text = self.extract_text_from_pdf(pdf_path)
        if not text:
            return 0

        # 2. 조항별 chunking
        chunks = self.chunk_by_articles(text, pdf_path.name, language)
        if not chunks:
            logger.warning(f"⚠️  Chunk 생성 실패: {pdf_path.name}")
            return 0

        # 3. Embeddings 생성
        chunks_with_embeddings = self.generate_embeddings(chunks)
        if not chunks_with_embeddings:
            logger.warning(f"⚠️  Embedding 생성 실패: {pdf_path.name}")
            return 0

        # 4. Supabase 업로드
        uploaded = self.upload_to_supabase(chunks_with_embeddings)

        logger.info(f"✓ {pdf_path.name} 처리 완료: {uploaded} chunks 업로드됨\n")
        return uploaded

    def process_directory(self, pdf_dir: Path) -> Tuple[int, int]:
        """디렉토리 내 모든 PDF 파일 처리"""
        pdf_files = list(pdf_dir.glob("*.pdf"))

        if not pdf_files:
            logger.error(f"❌ PDF 파일을 찾을 수 없습니다: {pdf_dir}")
            return 0, 0

        logger.info(f"\n{'='*60}")
        logger.info(f"총 {len(pdf_files)}개의 PDF 파일 발견")
        logger.info(f"{'='*60}\n")

        total_files = 0
        total_chunks = 0

        for pdf_file in pdf_files:
            # 파일명으로 언어 감지 (ko/en)
            if any(x in pdf_file.stem.lower() for x in ['한글', 'korean', 'ko', '규칙']):
                language = 'ko'
            else:
                language = 'en'

            chunks = self.process_pdf(pdf_file, language)
            if chunks > 0:
                total_files += 1
                total_chunks += chunks

        logger.info(f"\n{'='*60}")
        logger.info(f"✅ 전체 처리 완료")
        logger.info(f"  - 처리된 파일: {total_files}/{len(pdf_files)}")
        logger.info(f"  - 업로드된 chunks: {total_chunks}")
        logger.info(f"{'='*60}\n")

        return total_files, total_chunks


def main():
    """메인 함수"""
    parser = argparse.ArgumentParser(
        description='Tennis Rules ETL Pipeline - PDF to Supabase with Gemini Embeddings'
    )
    parser.add_argument(
        '--pdf-dir',
        type=str,
        required=True,
        help='PDF 파일이 있는 디렉토리 경로'
    )
    parser.add_argument(
        '--supabase-url',
        type=str,
        help='Supabase URL (또는 환경변수 SUPABASE_URL 사용)'
    )
    parser.add_argument(
        '--supabase-key',
        type=str,
        help='Supabase Service Role Key (또는 환경변수 SUPABASE_SERVICE_KEY 사용)'
    )
    parser.add_argument(
        '--gemini-key',
        type=str,
        help='Gemini API Key (또는 환경변수 GEMINI_API_KEY 사용)'
    )

    args = parser.parse_args()

    # .env 파일 로드
    load_dotenv()

    # 환경 변수 확인
    supabase_url = args.supabase_url or os.getenv('SUPABASE_URL')
    supabase_key = args.supabase_key or os.getenv('SUPABASE_SERVICE_KEY')
    gemini_key = args.gemini_key or os.getenv('GEMINI_API_KEY')

    if not all([supabase_url, supabase_key, gemini_key]):
        logger.error("❌ 필수 환경 변수가 설정되지 않았습니다:")
        logger.error("  - SUPABASE_URL")
        logger.error("  - SUPABASE_SERVICE_KEY")
        logger.error("  - GEMINI_API_KEY")
        logger.error("\n.env 파일을 생성하거나 명령줄 인자로 전달하세요.")
        sys.exit(1)

    pdf_dir = Path(args.pdf_dir)
    if not pdf_dir.exists():
        logger.error(f"❌ 디렉토리를 찾을 수 없습니다: {pdf_dir}")
        sys.exit(1)

    # ETL 실행
    try:
        etl = TennisRulesETL(supabase_url, supabase_key, gemini_key)
        files, chunks = etl.process_directory(pdf_dir)

        if files > 0:
            logger.info("✅ ETL 파이프라인이 성공적으로 완료되었습니다!")
            sys.exit(0)
        else:
            logger.error("❌ 처리된 파일이 없습니다.")
            sys.exit(1)

    except Exception as e:
        logger.error(f"❌ ETL 실행 중 오류 발생: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
