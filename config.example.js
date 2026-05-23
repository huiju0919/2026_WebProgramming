// config.js 템플릿입니다.
// 이 파일을 config.js로 복사한 뒤 실제 키 값을 입력하세요.
// config.js는 .gitignore에 추가되어 있어 GitHub에 올라가지 않습니다.

const CONFIG = {
  FIREBASE: {
    apiKey: "AIzaSyDanFHGHYueyZGKdz5he_OBUGBA12LtTak",
    authDomain: "food-first-gm.firebaseapp.com",
    projectId: "food-first-gm",
    storageBucket: "food-first-gm.firebasestorage.app",
    messagingSenderId: "401494731165",
    appId: "1:401494731165:web:ac65290b6de35bf020e774",
  },
  GROQ_API_KEY: "", //Groq, Gemini 뭐든 상관 없음
  KAKAO_MAP_KEY: "5727448fe70c2c1f8db2139532a34354",
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
