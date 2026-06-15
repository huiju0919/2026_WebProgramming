# 🍴 FOOD FIRST

한성대학교 주변 맛집을 **스와이프로 취향을 분석**해 AI가 추천해 주는 웹 애플리케이션입니다.
2026 웹프로그래밍 팀 프로젝트.

---

## 📖 사이트 소개

"오늘 뭐 먹지?"를 고민하는 한성대 학생을 위한 맞춤 맛집 추천 서비스입니다.
스와이프 형식으로 메뉴 사진을 좌우로 넘기며 좋아요/싫어요를 표시하면, 그 데이터를 바탕으로
AI(gpt-4o-mini)가 취향을 분석해 어울리는 맛집을 추천하고 카카오 지도로 위치를 보여줍니다.

### 주요 기능

| 페이지 | 설명 |
|--------|------|
| `login.html` | 구글 로그인 / 비로그인 둘러보기 |
| `index.html` | 메인 피드 — 카테고리별 식당 그리드, 상세 모달(메뉴·리뷰·지도), 좋아요·단골 |
| `swipe.html` | 틴더 스타일 스와이프(메뉴 사진 좌우로 넘기며 취향 수집, 단계별 진행) |
| `result.html` | 스와이프 결과 기반 AI 맛집 추천 + 카카오 지도 |
| `mypage.html` | 프로필, 좋아요·단골·최근 본 식당, 친구·활동 피드, 리뷰 관리 |
| `settings.html` | 테마(다크모드)·대표색·폰트·알림·공개 범위 설정, 계정 관리 |

### 부가 기능
- **취향 분석**: 스와이프 데이터를 태그 점수로 누적해 개인화 추천에 활용
- **친구**: 이메일로 친구 추가, 친구의 좋아요·단골·리뷰 활동 피드
- **리뷰**: 별점 + 한 줄 평, 공개 범위(전체/친구/나만) 설정
- **알림**: 친구 요청, AI 오늘의 추천(토스트·시스템 알림)
- **테마**: 라이트/다크/시스템 자동, 7가지 대표색 + 커스텀 색상

---

## 🛠 기술 스택

- **Frontend**: 순수 HTML / CSS / JavaScript (프레임워크 없음, ES Modules)
- **Backend**: Firebase Firestore (DB) + Firebase Authentication (Google 로그인)
- **AI 추천**: OpenAI `gpt-4o-mini` (없으면 Groq `llama-3.3-70b` 폴백)
- **지도**: 카카오맵 SDK

---

## 📁 파일 구조

```
FOODFIRST/
├── login.html            # 로그인 / 둘러보기
├── index.html            # 메인 피드
├── swipe.html            # 스와이프(취향 수집)
├── result.html           # AI 추천 결과 + 지도
├── mypage.html           # 마이페이지
├── settings.html         # 설정
├── upload_tool.html      # (관리용) Firestore 데이터 업로드 도구
├── export-firestore.html # (관리용) Firestore 데이터 내보내기 도구
│
├── firebase.js           # Firestore CRUD·공통 유틸(영업상태·거리·캐시 등)
├── auth.js               # 구글 로그인/로그아웃/계정 관리
├── notifications.js      # 알림 벨·토스트·AI 추천
├── icons.js              # 공용 SVG 아이콘 세트
├── escape.js             # XSS 방지용 이스케이프 유틸
├── theme.js / theme.css  # 테마·폰트·대표색 (FOUC 방지)
├── common.css            # 공통 스타일
├── sidebar.js            # 사이드바 토글
├── navavatar.js          # 네비 아바타 캐시
│
├── config.example.js     # 🔑 설정 템플릿 (이 파일을 복사해 config.js 생성)
└── config.js             # 🔑 실제 키 (gitignore — 저장소에 없음)
```

---

## 🔑 키 설정 방식

이 프로젝트는 외부 서비스 키가 필요합니다. 보안을 위해 실제 키가 담긴 `config.js`는
`.gitignore`에 등록되어 **저장소(GitHub)에 포함되지 않습니다.** 아래 순서로 직접 만들어 주세요.

### 1. 설정 파일 생성
`config.example.js`를 복사해 같은 폴더에 `config.js`라는 이름으로 저장합니다.

```bash
cp config.example.js config.js   # Windows: copy config.example.js config.js
```

### 2. 키 값 입력
`config.js`를 열어 각 항목을 채웁니다.

```js
const CONFIG = {
  FIREBASE: {
    apiKey: "...",
    authDomain: "...",
    projectId: "...",
    storageBucket: "...",
    messagingSenderId: "...",
    appId: "...",
  },
  OPENAI_API_KEY: "",  // 있으면 우선 사용 (gpt-4o-mini)
  GROQ_API_KEY:   "",  // OPENAI 키 없을 때 폴백
  KAKAO_MAP_KEY:  "",
  HANSUNG_LAT: 37.5826,
  HANSUNG_LNG: 127.0108,
  SWIPE: { TOTAL: 18, FIRST_PHASE: 7, SECOND_PHASE: 7, THIRD_PHASE: 4 },
  RECOMMEND_COUNT: 3,
};
```

### 3. 키 발급처

| 키 | 발급처 |
|----|--------|
| `FIREBASE` | [Firebase Console](https://console.firebase.google.com) → 프로젝트 설정 → 웹 앱 SDK 설정값 |
| `OPENAI_API_KEY` | [OpenAI Platform](https://platform.openai.com/api-keys) (선택, 한국어 품질↑) |
| `GROQ_API_KEY` | [Groq Console](https://console.groq.com/keys) (무료, 폴백용) |
| `KAKAO_MAP_KEY` | [Kakao Developers](https://developers.kakao.com) → 내 애플리케이션 → JavaScript 키 |

> ⚠️ **주의**: `OPENAI_API_KEY`는 결제와 연결되어 있습니다. 콘솔에서 **사용 한도(spending limit)**를
> 설정하고, 키를 외부에 공개하지 마세요. `config.js`는 절대 GitHub에 커밋하지 않습니다.

---

## ▶️ 실행 방법

ES Modules와 fetch를 사용하므로 **로컬 웹 서버**로 실행해야 합니다. (`file://`로 직접 열면 동작하지 않음)

```bash
# 방법 1) Node (npx)
npx serve

# 방법 2) Python
python -m http.server 8000

# 방법 3) VS Code 확장 "Live Server"의 "Go Live" 클릭
```

브라우저에서 `http://localhost:8000/login.html` (또는 표시된 주소)로 접속합니다.

---

