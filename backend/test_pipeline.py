import os
from parser import parse_document
from rag import analyze_contract_text
import fitz # PyMuPDF

def test_pipeline():
    print("=== 1. 파일 파싱(PDF) 테스트 ===")
    test_pdf_path = "test_contract.pdf"
    
    # 더미 PDF 생성
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 50), "제 1조(목적)\n본 계약은 갑과 을 사이의 하도급 대금에 대해 규정한다.\n제 2조(위약금)\n을의 귀책사유로 계약이 해지될 경우, 을은 갑에게 총 계약금액의 50%를 배상한다.")
    doc.save(test_pdf_path)
    doc.close()
    
    with open(test_pdf_path, "rb") as f:
        file_bytes = f.read()
        
    extracted_text = parse_document(file_bytes, test_pdf_path)
    print(f"[파싱 결과]\n{extracted_text.strip()}")
    
    if "제 1조(목적)" in extracted_text:
        print("✅ 파싱 성공")
    else:
        print("❌ 파싱 실패")

    print("\n=== 2. Vector DB 및 AI 연동 테스트 ===")
    result = analyze_contract_text(extracted_text)
    
    print(f"상태: {result.get('status')}")
    print(f"Mock 모드 여부: {result.get('mock')}")
    if result.get("status") == "success" and not result.get("mock"):
        print("✅ AI 연동 및 RAG 체인 호출 성공")
        analysis = result.get("analysis", {})
        print("--- AI 분석 결과 ---")
        for clause in analysis.get("clauses", []):
            print(f"- 조항명: {clause.get('clause_name')}")
            print(f"  위험도: {clause.get('risk_level')}")
            print(f"  리뷰: {clause.get('ai_review')}")
    else:
        print("❌ AI 연동 실패 또는 Mock 모드로 작동됨")
        print(result)

    # 테스트 종료 후 더미 파일 정리
    if os.path.exists(test_pdf_path):
        os.remove(test_pdf_path)
        print(f"\n[정리] 테스트 파일 '{test_pdf_path}' 삭제 완료")

if __name__ == "__main__":
    test_pipeline()
