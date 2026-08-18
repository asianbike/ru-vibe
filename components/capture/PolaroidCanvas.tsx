"use client";

// useRef = "화면을 다시 그려도 값이 유지되지만, 바뀌어도 화면을 다시 그리진 않는 상자".
// 여기선 실제 <canvas> DOM 요소를 붙잡아 두는 데 쓴다(그림을 그리려면 요소 자체가 필요).
import { useEffect, useRef, useState } from "react";

// canvas = 그림을 그릴 수 있는 HTML 요소. 픽셀 하나하나를 코드로 칠할 수 있다.
// 여기서 하는 일: 진짜 폴라로이드 종이 사진(public/frame.jpg)을 깔고 → 그 흰 창 안에
// 유저 사진을 정사각형으로 오려 넣고 → 35mm 필름 스캔처럼 색을 손보고 →
// 사진 안쪽 아래에 지명·날짜·시간을 각인한다. 결과물 한 장을 업로드한다.

// ── 종이 ────────────────────────────────────────────────────────────
// 프레임을 코드로 그리지 않고 **실물 사진을 쓴다.** 종이 질감·색 얼룩·모서리 곡선은
// 실제 스캔에만 있는 불규칙함이고, 그게 "진짜 물건" 인상의 정체다.
// 코드로 흉내 내면 아무리 공들여도 균일해서 인쇄물처럼 보인다.
//
// 아래 숫자는 public/frame.jpg 를 픽셀 단위로 재서 얻은 값이다(흰 창의 경계를 찾아서).
// 프레임 사진을 갈아끼우면 이 값도 다시 재야 한다.
const FRAME = {
  src: "/frame.jpg",
  w: 573, // 종이 전체 가로
  h: 684, // 종이 전체 세로
  x: 35, // 흰 창의 좌상단
  y: 30,
  s: 505, // 흰 창 한 변 (정확히는 505×506이라 정사각형으로 취급)
};

// 사진 한 변의 픽셀 수. 프레임 사진을 이 크기에 맞춰 확대해서 쓴다.
// iOS Safari는 캔버스가 너무 크면 에러도 없이 빈 이미지를 내놓는다(48MP 아이폰 사진이 여기 걸림).
//
// 1100 → 900 (2026-08-12). 화질 욕심이 아니라 **전송량** 때문이다:
// 완성된 카드 한 장이 700KB였는데, 지도 팝업은 그걸 통째로 받아서 200px로 줄여 보여준다.
// 50명이 쓰면 하루 수백 MB가 그 낭비로 나간다. 카드가 여전히 1000px 너비라
// 인스타 공유(1080 기준)에도 부족하지 않다.
const PHOTO_PX = 900;

// 프레임 이미지는 한 번만 받아서 재사용한다.
// 모듈 바깥(=컴포넌트 밖)에 두면 페이지를 오가도 살아 있어서, 재촬영할 때마다
// 같은 파일을 다시 받지 않는다. ??= 는 "비어 있을 때만 채워라".
let framePromise: Promise<HTMLImageElement> | null = null;
function loadFrame() {
  framePromise ??= new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("frame image failed to load"));
    img.src = FRAME.src;
  });
  return framePromise;
}

// 사진 아래쪽에 새길 두 줄. 예:
//   ● COLLEGE AVE, NEW BRUNSWICK
//   AUG. 18 - 9:04 PM
//
// 달 이름을 배열로 들고 있는 이유: toLocaleString()은 폰 언어 설정을 따라가서
// 한국어 폰에서는 "8월"이 나온다. 앱에 표시되는 문구는 전부 영어여야 한다.
const MONTHS = "JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC".split(" ");

function timeLine(d: Date) {
  // padStart(2, "0") = 한 자리 숫자 앞에 0을 붙여 두 자리로. 7 → "07"
  const p = (n: number) => String(n).padStart(2, "0");
  // getMonth()는 0부터 시작하는 게 자바스크립트 함정. 1월이 0이라 MONTHS[0]이 JAN이 맞다.
  // 12시간제. 0시는 12 AM, 13시는 1 PM — %12는 0을 내놓으므로 || 12로 바꿔준다.
  const h = d.getHours();
  return `${MONTHS[d.getMonth()]}. ${d.getDate()} - ${h % 12 || 12}:${p(d.getMinutes())} ${h < 12 ? "AM" : "PM"}`;
}

// 위경도 대신 **지명**을 새긴다. `40.500, -74.448`은 사람이 읽어도 어딘지 모르고,
// 남에게 보여줄 사진에 좌표가 박히는 건 그 자체로 불필요한 노출이다.
// 지명은 "어느 동네" 수준(≈500m)이라 분위기는 남고 집 주소는 안 남는다.
//
// 지오코딩 API(위경도 → 주소)를 쓰지 않는 이유: 우리 Mapbox 토큰은 지도 타일만
// 허용돼 있어서 geocoding 요청이 Forbidden으로 막힌다. 게다가 이 앱은 러트거스
// 전용이라 나올 수 있는 답이 사실상 이 표에 다 있다 — 네트워크 왕복 0회가 낫다.
// ponytail: 가장 가까운 한 곳을 고르는 단순 거리 비교. 캠퍼스 밖이면 아무것도 안 쓴다.
const AREAS: [lat: number, lng: number, label: string][] = [
  [40.5010, -74.4487, "COLLEGE AVE, NEW BRUNSWICK"],
  [40.4998, -74.4514, "EASTON AVE, NEW BRUNSWICK"],
  [40.4955, -74.4460, "DOWNTOWN NEW BRUNSWICK"],
  [40.5222, -74.4620, "BUSCH CAMPUS, PISCATAWAY"],
  [40.5227, -74.4370, "LIVINGSTON CAMPUS, PISCATAWAY"],
  [40.4810, -74.4360, "COOK/DOUGLASS, NEW BRUNSWICK"],
];
// 이 거리(약 2km)보다 멀면 "모르는 곳"으로 치고 지명 줄을 아예 안 쓴다.
// 위도 1도 ≈ 111km이므로 0.018도 ≈ 2km. 경도는 위도 40°에서 한 도가 더 짧지만
// (cos40 ≈ 0.77), 여기선 "가장 가까운 곳 고르기"라 그 왜곡이 순서를 바꿀 만큼 크지 않다.
//
// 처음엔 800m였는데 캠퍼스에서 1km쯤 떨어진 집에서 찍으니 줄이 통째로 빠졌다.
// 2km면 뉴브런즈윅 안에서는 항상 뭔가 나오고, 대신 "가장 가까운 캠퍼스"라는
// 뜻이 된다(1km 떨어져도 COLLEGE AVE로 찍힌다). 지도 핀은 진짜 좌표를 쓰므로
// 이 어긋남은 각인 문구에만 있다.
const AREA_RADIUS = 0.018;

function placeLine(coords: { lat: number; lng: number }) {
  let best: string | null = null;
  let bestD = AREA_RADIUS;
  for (const [lat, lng, label] of AREAS) {
    // Math.hypot(a, b) = √(a²+b²). 두 점 사이 직선거리를 "도(degree)" 단위로 잰다.
    const d = Math.hypot(lat - coords.lat, lng - coords.lng);
    if (d < bestD) {
      bestD = d;
      best = label;
    }
  }
  return best;
}

// 필름 그레인(입자)용 흑백 노이즈 타일을 만든다.
//
// 왜 타일인가: 사진 전체(1100×1100 = 121만 픽셀)에 픽셀 하나씩 난수를 넣으면 느리다.
// 작은 정사각형 하나만 만들어 바둑판처럼 반복해 깔면 눈으로는 구분이 안 되면서 훨씬 싸다.
// block = 입자 하나의 크기(px). 1이면 픽셀 단위, 2면 2×2 덩어리.
function grainPattern(ctx: CanvasRenderingContext2D, size = 96, block = 1, spread = 110) {
  // 먼저 작게 만든 뒤 확대해서 붙이면 입자가 덩어리로 커진다.
  const small = document.createElement("canvas");
  small.width = small.height = Math.round(size / block);
  const sctx = small.getContext("2d")!;

  // ImageData = 픽셀 배열 그 자체. [R,G,B,A, R,G,B,A, ...] 순으로 한 줄로 늘어서 있다.
  const img = sctx.createImageData(small.width, small.height);
  for (let i = 0; i < img.data.length; i += 4) {
    // 중간 회색(128)을 기준으로 위아래로 흔든다. 아래에서 overlay 모드로 얹을 때
    // 128은 "변화 없음"이라, 밝은 점은 밝게 어두운 점은 어둡게만 작용한다.
    const v = 128 + (Math.random() - 0.5) * spread;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255; // 불투명
  }
  sctx.putImageData(img, 0, 0);

  if (block === 1) return ctx.createPattern(small, "repeat")!;

  const tile = document.createElement("canvas");
  tile.width = tile.height = size;
  const tctx = tile.getContext("2d")!;
  // 확대할 때 보간을 끄면 픽셀이 뭉개지지 않고 각진 덩어리로 커진다.
  tctx.imageSmoothingEnabled = false;
  tctx.drawImage(small, 0, 0, size, size);
  return ctx.createPattern(tile, "repeat")!;
}

// 사진 영역에만 필름 색감을 입힌다. (x, y, s) = 사진의 좌상단과 한 변.
//
// 레퍼런스는 물 빠진 폴라로이드가 아니라 **35mm 필름 스캔**이다. 그래서 방향이 중요하다:
// 검정은 제대로 검고, 채도도 살아 있고, 전체가 오히려 차갑고 깨끗하다.
// 대비를 뭉개고 색을 빼면 필름이 아니라 그냥 흐린 사진이 된다.
//
// globalCompositeOperation = "이미 그려진 것과 새로 칠하는 것을 어떻게 섞을까".
// 기본값 source-over는 "덮어쓰기"라 사진이 그냥 가려진다. 아래 모드들은 다르게 섞는다.
function gradeFilm(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.save(); // 지금 설정을 저장 — 아래에서 마구 바꾸고 마지막에 restore로 되돌린다

  // 사진 바깥(종이 여백)까지 물들면 안 되므로 그리는 범위를 사진 사각형으로 제한한다.
  ctx.beginPath();
  ctx.rect(x, y, s, s);
  ctx.clip();

  // ① 아주 옅은 찬 색. multiply = 곱하기 — 흰색을 곱하면 그대로, 어두운 값은 그만큼 깎인다.
  //    파랑이 높은 색을 곱하면 R·G만 살짝 깎여서 노란기가 빠진다.
  //    레퍼런스의 흰 벽·하늘이 차가운 쪽으로 기운 게 이 느낌이다. 세게 하면 사진이 죽는다.
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = "rgba(224,235,255,0.22)";
  ctx.fillRect(x, y, s, s);

  // ② 검정을 아주 조금만 들어올린다. 필름도 완전한 0은 잘 안 나오지만,
  //    폴라로이드처럼 뿌옇게 뜨지는 않는다. 여기가 3300과 r1/r2가 갈리는 지점이다.
  ctx.globalCompositeOperation = "lighten";
  ctx.fillStyle = "rgb(30,34,39)";
  ctx.fillRect(x, y, s, s);

  // ③ 하이라이트에 아주 옅은 온기. screen = 밝게 섞기.
  //    ②가 그림자를 차갑게, ③이 밝은 쪽을 따뜻하게 만들어 색이 갈린다(split tone).
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = "rgba(255,186,181,0.12)";
  ctx.fillRect(x, y, s, s);

  // ④ 비네팅 — 가장자리를 어둡게. 렌즈가 구석까지 빛을 못 보내서 생기는 현상이라
  //    이게 있으면 "찍힌 사진", 없으면 "만든 이미지"처럼 보인다.
  ctx.globalCompositeOperation = "source-over"; // 그냥 위에 덮기
  const cx = x + s / 2;
  const cy = y + s / 2;
  const vignette = ctx.createRadialGradient(cx, cy, s * 0.42, cx, cy, s * 0.8);
  vignette.addColorStop(0, "rgba(18,16,20,0)");
  vignette.addColorStop(1, "rgba(18,16,20,0.26)");
  ctx.fillStyle = vignette;
  ctx.fillRect(x, y, s, s);

  // ⑤ 필름 그레인. overlay = 밝은 곳은 더 밝게, 어두운 곳은 더 어둡게 (대비를 살린 합성).
  //    중간 회색은 아무 영향이 없어서 노이즈 타일과 짝이 맞는다.
  //    레퍼런스의 입자는 눈에 띄지만 거칠지 않다 — 두 층 다 예전보다 약하게.
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = 0.18; // 굵은 층
  ctx.fillStyle = grainPattern(ctx, 96, 2, 130);
  ctx.fillRect(x, y, s, s);
  ctx.globalAlpha = 0.14; // 미세한 층 — 굵은 층만 있으면 격자무늬처럼 규칙적으로 보인다
  ctx.fillStyle = grainPattern(ctx, 96, 1, 110);
  ctx.fillRect(x, y, s, s);

  ctx.restore(); // clip·합성모드·alpha를 전부 원래대로
}

// onCapture는 "부모가 넘겨주는 함수". 사진을 다 그린 뒤 이걸 호출해서
// "끝났어"라고 부모(capture/page.tsx)에게 알린다. ?는 안 넘겨도 된다는 뜻.
export default function PolaroidCanvas({
  onCapture,
  coords,
}: {
  onCapture?: (canvas: HTMLCanvasElement) => void;
  // 촬영 시점엔 아직 없다. GPS는 셔터를 누른 뒤 몇 초 걸려서 도착하므로,
  // 사진은 먼저 그려두고 좌표가 오면 그 위에 두 줄만 덧그린다.
  // 캔버스는 이미 그려진 픽셀 위에 덧칠하는 방식이라 사진을 다시 그릴 필요가 없다.
  coords?: { lat: number; lng: number } | null;
}) {
  // 처음엔 아직 <canvas>가 화면에 없으니 null. 아래 ref={canvasRef}가 연결해준다.
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [captured, setCaptured] = useState(false); // 한 장이라도 찍었나 (버튼 문구/캔버스 표시용)
  const [status, setStatus] = useState(""); // 에러 메시지 (폰에서 원인을 눈으로 보려고)
  // 촬영한 순간. 캡션을 나중에 그릴 때 "그릴 때 시각"이 아니라 "찍은 시각"을 써야 한다.
  const shotAtRef = useRef<Date | null>(null);

  // 좌표가 도착하면 **아래 흰 여백**에 지명·시각을 검은 글자로 적는다.
  // 실물 폴라로이드에 펜으로 적던 자리다. 사진 위에 흰 글자로 얹어도 봤는데,
  // 밝은 사진에서는 그림자를 넣어도 글자가 사진을 가려서 여백 쪽이 깔끔했다.
  // 재촬영하면 종이가 새로 깔리므로 옛 글자는 저절로 사라진다 — 지우는 코드가 따로 없다.
  useEffect(() => {
    const canvas = canvasRef.current;
    const shotAt = shotAtRef.current;
    if (!canvas || !shotAt || !coords) return;

    // 사진(흰 창)의 위치와 크기. handleFile에서 쓴 계산과 같은 것을 다시 한다.
    const scale = canvas.width / FRAME.w;
    const s = FRAME.s * scale;

    const ctx = canvas.getContext("2d")!;
    ctx.save(); // 아래에서 정렬·색을 바꾸므로 마지막에 되돌린다

    const fontSize = Math.round(s * 0.052);
    // 폰에 실제로 깔려 있는 글꼴이라 파일을 받을 필요가 없다.
    // 쉼표 뒤는 대비책 — 앞의 것이 없는 기기에서 차례로 넘어간다(마지막은 "아무 고딕").
    ctx.font = `bold ${fontSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle"; // y가 글자의 세로 한가운데 — 초록 점과 높이를 맞추기 쉽다
    ctx.fillStyle = "#111";

    // 흰 여백 = 사진 아래끝부터 종이 아래끝까지. 그 안에서 세로 가운데를 잡는다.
    const stripMid = ((FRAME.y + FRAME.s) * scale + canvas.height) / 2;
    const cx = canvas.width / 2;
    const lineH = fontSize * 1.25;

    // 지명은 캠퍼스에서 너무 멀면 없다. 그때는 시각 한 줄만 여백 한가운데에 놓고,
    // 두 줄일 때는 가운데를 기준으로 반 줄씩 위아래로 벌린다.
    const place = placeLine(coords);
    const timeY = place ? stripMid + lineH / 2 : stripMid;
    ctx.fillText(timeLine(shotAt), cx, timeY);

    if (place) {
      const y = timeY - lineH;
      // 점 + 간격 + 글자를 한 덩어리로 보고 그 덩어리를 가운데 정렬한다.
      // textAlign="center"로는 글자만 가운데라 점 때문에 왼쪽으로 밀려 보인다.
      const r = fontSize * 0.16;
      const gap = fontSize * 0.36;
      const textW = ctx.measureText(place).width;
      const startX = cx - (r * 2 + gap + textW) / 2;
      ctx.textAlign = "left";
      ctx.fillText(place, startX + r * 2 + gap, y);
      ctx.beginPath();
      ctx.arc(startX + r, y, r, 0, Math.PI * 2);
      ctx.fillStyle = "#2fae4e"; // "지금 여기" 신호등. 흰 종이 위라 밝은 초록은 뜬다
      ctx.fill();
    }

    ctx.restore();
  }, [coords]);

  // async = 안에서 await를 쓸 수 있는 함수. await는 "이 작업 끝날 때까지 여기서 기다려".
  // 사진 디코딩과 프레임 다운로드가 시간이 걸리는 작업이라 기다려야 한다.
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    // <input type="file">이 고른 파일들 중 첫 번째. ?.는 "없으면 undefined" (에러 대신).
    const file = e.target.files?.[0];
    // 값을 비워두지 않으면 같은 사진을 다시 골랐을 때 "변경 없음"으로 취급돼 onChange가 안 뜬다.
    e.target.value = "";
    if (!file) return; // 유저가 취소한 경우

    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      // 파일은 압축된 JPEG 덩어리라 그대로는 그릴 수 없다. 픽셀로 펼치는(디코딩) 단계.
      // imageOrientation으로 EXIF 회전 정보를 반영하지 않으면 세로로 찍은 사진이 눕는다.
      //
      // Promise.all = 두 기다림을 나란히 시작해 둘 다 끝날 때까지 기다린다.
      // 순서대로 await하면 프레임을 받는 동안 사진 디코딩이 놀고 있다.
      const [bitmap, frame] = await Promise.all([
        createImageBitmap(file, { imageOrientation: "from-image" }),
        loadFrame(),
      ]);

      // ── 크기 계산 ──
      // 프레임 사진(573px)을 사진 한 변이 PHOTO_PX가 되도록 확대한다.
      const scale = PHOTO_PX / FRAME.s;
      canvas.width = Math.round(FRAME.w * scale);
      canvas.height = Math.round(FRAME.h * scale);
      const px = Math.round(FRAME.x * scale);
      const py = Math.round(FRAME.y * scale);
      const s = PHOTO_PX;

      // ctx(context) = 실제로 그리는 도구 모음. 붓이라고 생각하면 된다.
      // !는 "null 아님을 내가 보장한다"는 타입스크립트 표시.
      const ctx = canvas.getContext("2d")!;

      // ① 종이 사진을 통째로 깐다. 창은 흰색으로 칠해져 있고, 그 위에 사진을 얹을 것이다.
      ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);

      // ② 유저 사진을 창에 맞춰 정사각형으로 오려 넣는다.
      //    폴라로이드는 정사각형이므로 원본 가운데에서 짧은 변 길이만큼 잘라낸다.
      const side = Math.min(bitmap.width, bitmap.height);
      const cropX = (bitmap.width - side) / 2;
      const cropY = (bitmap.height - side) / 2;

      // ctx.filter는 그리는 순간 적용되는 보정.
      // 채도·대비를 거의 안 건드리는 게 요점이다 — 레퍼런스는 물 빠진 사진이 아니다.
      // blur는 화질을 깎는 게 아니라 디지털 특유의 칼 같은 가장자리를 눕히는 용도.
      ctx.filter = "saturate(0.82) contrast(0.91) brightness(1.06) blur(0.45px)";
      ctx.drawImage(bitmap, cropX, cropY, side, side, px, py, s, s);
      ctx.filter = "none"; // 안 되돌리면 아래 글자와 각인에도 보정이 걸린다
      bitmap.close(); // 디코딩된 픽셀은 메모리를 많이 먹는다. 다 썼으니 즉시 반납.

      // ③ 필름 색감
      gradeFilm(ctx, px, py, s);

      // ④ 사진과 창 사이 경계선. 실물은 사진이 종이보다 살짝 안으로 들어가 있어 그늘이 진다.
      ctx.strokeStyle = "rgba(0,0,0,0.20)";
      ctx.lineWidth = Math.max(1, s * 0.002);
      ctx.strokeRect(px, py, s, s);

      shotAtRef.current = new Date();
      setCaptured(true);
      setStatus("");
      // 부모가 onCapture를 넘겼으면 호출(= GPS 요청이 여기서 시작된다).
      onCapture?.(canvas);
    } catch (err) {
      // 폰에는 개발자 콘솔이 없으니 에러를 화면에 띄워 원인을 본다.
      setStatus(`${(err as Error).name} — ${(err as Error).message}`);
    }
  }

  return (
    <>
      {/* 버튼을 따로 만들지 않고 <label>로 감싼다 — label을 탭하면 안의 input이 눌린다.
          input을 hidden으로 숨겨도 동작하므로 파일 선택창의 못생긴 기본 UI를 안 보여줄 수 있다.
          capture="environment" — 탭하면 앨범이 아니라 후면 카메라가 바로 열린다. */}
      <label className="block cursor-pointer rounded bg-red-700 px-3 py-2 text-center text-white">
        {captured ? "Retake" : "Take photo"}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFile}
          className="hidden"
        />
      </label>
      {/* ref로 위의 canvasRef와 이 요소를 연결한다. 아직 안 찍었으면 빈 캔버스를 숨긴다. */}
      <canvas ref={canvasRef} className={`mt-3 w-full shadow-lg ${captured ? "" : "hidden"}`} />
      {status && <p className="mt-2 text-sm break-words text-amber-600">{status}</p>}
    </>
  );
}
