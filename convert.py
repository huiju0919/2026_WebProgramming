"""
이미지 일괄 webp 변환 스크립트
사용법: 터미널에 python convert.py 입력
- images 폴더 안의 jpg, jpeg, png 파일을 전부 webp로 변환
- 원본 파일은 삭제하지 않고 유지 (DELETE_ORIGINAL True로 바꾸고 다시 사용하면 원본 삭제)
"""

from PIL import Image
from pathlib import Path

# ── 설정 ──────────────────────────────────
IMAGES_DIR = Path("./images")   # 이미지 폴더 경로 (스크립트와 같은 위치)
QUALITY    = 85                  # webp 품질 (0~100, 85 권장)
DELETE_ORIGINAL = False          # True로 바꾸면 변환 후 원본 삭제
# ──────────────────────────────────────────

TARGET_EXTS = {".jpg", ".jpeg", ".png"}

def convert():
    if not IMAGES_DIR.exists():
        print(f"❌ 폴더를 찾을 수 없어요: {IMAGES_DIR.resolve()}")
        print("   스크립트를 프로젝트 폴더(images 폴더가 있는 곳)에 놓고 실행하세요.")
        return

    files = [f for f in IMAGES_DIR.iterdir() if f.suffix.lower() in TARGET_EXTS]

    if not files:
        print("변환할 파일이 없어요. (jpg, jpeg, png 파일을 찾지 못했어요)")
        return

    print(f"총 {len(files)}개 파일 변환 시작...\n")

    success, fail = 0, 0
    for f in sorted(files):
        out = f.with_suffix(".webp")
        try:
            img = Image.open(f).convert("RGB")
            img.save(out, "webp", quality=QUALITY)
            print(f"  ✅ {f.name}  →  {out.name}")
            if DELETE_ORIGINAL:
                f.unlink()
                print(f"     🗑️  원본 삭제: {f.name}")
            success += 1
        except Exception as e:
            print(f"  ❌ {f.name} 실패: {e}")
            fail += 1

    print(f"\n완료! 성공 {success}개 / 실패 {fail}개")
    if not DELETE_ORIGINAL:
        print("원본 파일은 유지됐어요. 확인 후 직접 삭제하거나 DELETE_ORIGINAL = True로 바꾸고 재실행하세요.")

if __name__ == "__main__":
    convert()
