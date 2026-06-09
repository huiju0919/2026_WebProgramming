// config.js 템플릿입니다.
// 이 파일을 config.js로 복사한 뒤 실제 키 값을 입력하세요.
// config.js는 .gitignore에 추가되어 있어 GitHub에 올라가지 않습니다.

const CONFIG = {
  FIREBASE: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
  },
  GROQ_API_KEY: "",   // 폴백용 (OPENAI_API_KEY 없을 때 사용)
  OPENAI_API_KEY: "", // 있으면 우선 사용 (gpt-4o-mini, 한국어 품질↑). 콘솔에서 spending limit 설정 권장
  KAKAO_MAP_KEY: "",
  HANSUNG_LAT: 37.5826,
  HANSUNG_LNG: 127.0108,
  SWIPE: {
    TOTAL: 18,
    FIRST_PHASE: 7,
    SECOND_PHASE: 7,
    THIRD_PHASE: 4,
  },
  RECOMMEND_COUNT: 3,
};
