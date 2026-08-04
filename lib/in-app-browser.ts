// 인스타/Gmail 같은 앱 "안에서" 열리는 브라우저인지 판별한다.
//
// 왜 필요한가: 이런 브라우저에서는 GPS가 죽는다. 그것도 조용히 —
// 권한 팝업이 아예 안 뜨고, 성공/실패 콜백 둘 다 안 불려서 화면이 "locating…"에
// 영원히 멈춘다(getCurrentPosition의 timeout은 권한을 허용한 *다음*부터 세기 때문에
// 타이머조차 시작을 안 한다). 카메라는 멀쩡히 되기 때문에 원인이 더 안 보인다.
// 게다가 "홈 화면에 추가"도 여기선 불가능하다.
//
// 브라우저가 자기를 소개하는 문자열(navigator.userAgent)에 앱 이름이 붙어 오는 걸로 본다.
// 유저가 마음대로 바꿀 수 있는 값이라 보안에는 절대 못 쓰지만, 여기서 하는 일은
// "안내문을 띄울까 말까"라 틀려도 손해가 없다.
// GSA = Google Search App(구글 앱·Gmail이 링크를 여는 그것).
const IN_APP_BROWSER = /Instagram|FBAN|FBAV|Messenger|GSA\/|Snapchat|TikTok|LinkedIn/i;

// 반드시 브라우저에서만 불러야 한다(서버에는 navigator가 없다).
// 부르는 쪽은 useEffect 안에서 쓸 것 — 이유는 InAppBrowserBanner의 주석 참고.
export function isInAppBrowser() {
  return IN_APP_BROWSER.test(navigator.userAgent);
}
