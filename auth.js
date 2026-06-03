// 구글 로그인 / 로그아웃 / 상태 감지
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  linkWithPopup,           
  unlink,                  
  reauthenticateWithPopup, 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { auth, getUserDoc, deleteUserData, saveUserIdentity } from "./firebase.js";

const provider = new GoogleAuthProvider();

// 구글 로그인 (팝업 방식)
export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, provider);
  const user = result.user;
  await getUserDoc(user.uid);
  // 이메일/이름 저장 → 친구 검색에 사용
  await saveUserIdentity(user.uid, user.email, user.displayName);
  return user;
}

// 구글 계정 연동
export async function linkGoogleAccount() {
  const user = auth.currentUser;
  if (!user) throw new Error("로그인된 사용자가 없습니다");

  try {
    const result = await linkWithPopup(user, provider);
    return result.user;
  } catch (error) {
    if (error.code === "auth/credential-already-in-use") {
      throw new Error("이미 다른 계정에 연동된 구글 계정입니다");
    }
    throw error;
  }
}

// 계정 연동 해제
export async function unlinkGoogleAccount() {
  const user = auth.currentUser;
  if (!user) throw new Error("로그인된 사용자가 없습니다");
  await unlink(user, "google.com");
}

// 로그아웃
export async function logout() {
  // 외형(테마·폰트·대표색) 캐시 정리 → 다른 계정 로그인 시 설정이 새지 않게
  try {
    ["ff_theme", "ff_fontSize", "ff_accent", "ff_accentCustom", "ff_accentCustomList"]
      .forEach(k => localStorage.removeItem(k));
  } catch (e) {}
  await signOut(auth);
}
// Firestore 삭제 → Auth 계정 삭제 → 로그아웃
async function _deleteAccountInternal() {
  const user = auth.currentUser;
  if (!user) throw new Error("로그인된 사용자가 없습니다");

  await deleteUserData(user.uid);
  await user.delete();
  await signOut(auth);
}

// 계정 삭제
export async function deleteAccount() {
  try {
    await _deleteAccountInternal();
  } catch (error) {
    if (error.code === "auth/requires-recent-login") {
      const user = auth.currentUser;
      if (!user) throw error;
      await reauthenticateWithPopup(user, provider);
      await _deleteAccountInternal();
    } else {
      throw error;
    }
  }
}

// 현재 로그인된 사용자 가져오기
export function getCurrentUser() {
  return auth.currentUser;
}

// 로그인 상태 감지 (페이지 로드 시 사용)
export function onAuthChanged(callback) {
  onAuthStateChanged(auth, callback);
}

// 로그인 필요 페이지에서 비로그인 시 로그인 페이지로 이동
export function requireAuth() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if (!user) {
        window.location.href = "./login.html";
      } else {
        resolve(user);
      }
    });
  });
}