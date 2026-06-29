# Flash Memo (myMemo)

브라우저에서 쓰는 가벼운 메모 앱 — 태그, 검색, 고정, 간단 마크다운, PWA 설치 지원.

---

## 처음 쓰는 분

**→ [USAGE.md](./USAGE.md)** 에 사용법이 정리되어 있습니다.

- 메모 쓰기·저장  
- 태그·즐겨찾기·검색  
- 고정·수정·삭제  
- PC에 앱처럼 설치 (PWA)  
- 자주 묻는 질문  

---

## 빠른 시작 (개발)

```powershell
cd d:\Projects\mymemo_1\myMemo_2606
npm install
npm run dev
```

브라우저: http://localhost:5173

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 (5173) |
| `npm run build` | 배포용 빌드 (`dist`) |
| `npm run preview` | 빌드 결과 로컬 확인 (4173) |
| `npm run lint` | ESLint |

---

## 기술 스택

- React 19 + Vite 8  
- `vite-plugin-pwa` (앱 이름: **Flash Memo**)  
- 데이터: 브라우저 `localStorage` (`flashMemos` 등)

---

## 배포

Vercel 등에 연결 시: Framework **Vite**, Build `npm run build`, Output **`dist`**.  
매일 사용은 배포된 **HTTPS URL** + 브라우저 **앱 설치**를 권장합니다. 자세한 절차는 [USAGE.md §10](./USAGE.md#10-개발자-프로젝트-실행).

---

## 문서

| 파일 | 대상 |
|------|------|
| [USAGE.md](./USAGE.md) | **일반 사용자** + 설치·배포 안내 |
| [SECURITY.md](./SECURITY.md) | **보안·프라이버시** — URL 공유, localStorage, 주의사항 |
| [GIT_PUSH_WINDOWS.md](./GIT_PUSH_WINDOWS.md) | **Git push 403** — 자격 증명 삭제·재로그인 (Windows) |
| README.md (이 파일) | 저장소 개요·개발 명령 |
