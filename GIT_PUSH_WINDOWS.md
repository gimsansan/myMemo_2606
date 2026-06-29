# Windows에서 Git push 인증 — 원리와 따라하기

GitHub에 `git push`할 때 **403 Permission denied**가 나왔을 때,  
**제어판(자격 증명 관리자)에서 항목을 삭제**하고 다시 push하는 방법을 정리한 문서입니다.

나중에 기억이 안 날 때 **순서대로 따라 하면** 됩니다.

---

## 목차

> **Obsidian:** 읽기 모드에서 아래 링크를 클릭하세요.

1. [[#1. 한 줄 요약|한 줄 요약]]
2. [[#2. 왜 이런 일이 생기나 (원리)|왜 이런 일이 생기나 (원리)]]
3. [[#3. 에러 메시지 읽는 법|에러 메시지 읽는 법]]
4. [[#4. 해결 절차 (따라하기)|해결 절차 (따라하기)]]
5. [[#5. 성공 확인|성공 확인]]
6. [[#6. 안 될 때 (PAT)|안 될 때 (PAT)]]
7. [[#7. 두 GitHub 계정을 쓸 때|두 GitHub 계정을 쓸 때]]
8. [[#8. 지우면 안 되는 항목|지우면 안 되는 항목]]
9. [[#9. 자주 묻는 질문|자주 묻는 질문]]

---

## 1. 한 줄 요약

| 단계 | 할 일 |
|------|--------|
| 1 | **자격 증명 관리자**에서 `git:https://github.com` **삭제** |
| 2 | `git push` 다시 실행 |
| 3 | 로그인 창에서 **저장소 주인 계정**으로 로그인 (예: `gimsansan`) |

**원리:** PC에 **예전 계정 로그인 정보**가 남아 있으면, Git은 그 계정으로 push를 시도합니다.  
저장소 주인과 **다른 계정**이면 GitHub가 **403**으로 거절합니다.

---

## 2. 왜 이런 일이 생기나 (원리)

### push할 때 실제로 일어나는 일

```
[내 PC]  git push
    ↓
[Windows] 저장된 GitHub 로그인 정보를 꺼냄  ← 자격 증명 관리자
    ↓
[GitHub]  "이 계정이 이 저장소에 쓸 수 있나?" 확인
    ↓
권한 있음 → push 성공
권한 없음 → 403 Permission denied
```

### 세 가지를 구분하기

| 개념 | 설명 | 예시 |
|------|------|------|
| **저장소(remote)** | push **목적지** URL | `https://github.com/gimsansan/myMemo_2606.git` |
| **저장소 주인** | 그 repo의 **소유 계정** | `gimsansan` |
| **지금 PC에 저장된 로그인** | Windows가 기억한 **GitHub 계정** | `k-songs` (예전에 로그인해 둠) |

**문제 상황:** remote는 `gimsansan/...` 인데, PC에는 `k-songs` 로그인이 저장돼 있음  
→ GitHub: "`k-songs`는 `gimsansan` repo에 push할 권한 없음" → **403**

### 왜 제어판에서 삭제하나?

- Git은 매번 비밀번호를 묻지 않고, **한 번 로그인한 정보를 Windows에 저장**해 둡니다.
- 그 항목이 **`git:https://github.com`** 입니다.
- **삭제** = "예전 계정 기억 지우기" → 다음 `git push` 때 **다시 로그인**하게 됨
- 그때 **올바른 계정**(`gimsansan`)으로 로그인하면 push 성공

### 로컬 커밋은 안전한가?

- **403은 push만 실패**합니다.
- `git commit`으로 만든 내용은 **내 PC에 그대로** 남습니다.
- 인증만 고치면 같은 커밋을 다시 push하면 됩니다.

---

## 3. 에러 메시지 읽는 법

실제로 본 메시지 예:

```
remote: Permission to gimsansan/myMemo_2606.git denied to k-songs.
fatal: unable to access 'https://github.com/gimsansan/myMemo_2606.git/': The requested URL returned error: 403
```

| 부분 | 의미 |
|------|------|
| `gimsansan/myMemo_2606.git` | push하려는 **저장소** |
| `denied to k-songs` | GitHub가 **`k-songs` 계정**으로 시도한 것으로 판단 |
| `403` | **권한 없음** (인증은 됐지만 쓰기 권한 없음) |

**둘 다 내 계정이어도** PC에 **잘못된 쪽**이 저장돼 있으면 같은 에러가 납니다.  
→ **삭제 후 저장소 주인 계정으로 다시 로그인**하면 해결되는 경우가 많습니다.

---

## 4. 해결 절차 (따라하기)

### 4-1. push 대상 확인 (선택)

PowerShell 또는 CMD:

```powershell
cd D:\Projects\mymemo_1\myMemo_2606
git remote -v
```

예상 출력:

```
origin  https://github.com/gimsansan/myMemo_2606.git (fetch)
origin  https://github.com/gimsansan/myMemo_2606.git (push)
```

→ push 목적지가 **어느 계정/repo**인지 확인합니다.

---

### 4-2. Windows 자격 증명 삭제

#### 방법 A — 설정 앱 (Windows 11 등)

1. **설정** → **개인 정보 및 보안** → **Windows 자격 증명**
2. **Windows 자격 증명** (또는 **일반 자격 증명**) 목록에서  
   **`git:https://github.com`** 찾기
3. 클릭 → **제거** (또는 **삭제**)

#### 방법 B — 제어판 (클래식)

1. Windows 검색: **`자격 증명 관리자`** 또는 **`Credential Manager`**
2. **Windows 자격 증명** 탭
3. **`git:https://github.com`** 선택 → **제거**

#### 스크린샷에서 본 목록 예

| 항목 | 이번에 삭제? |
|------|----------------|
| `git:https://github.com` | **예 — 이것만 삭제** |
| `git:http://192.168.0.46` | 아니오 (사내/로컬 Git) |
| `git:https://gitlab.com` | 아니오 (GitLab) |
| `git:https://oauth-refresh-token.gitlab.com` | 아니오 (GitLab) |

---

### 4-3. 다시 push

```powershell
cd D:\Projects\mymemo_1\myMemo_2606
git push
```

#### 로그인 창이 뜨면

- **저장소 URL의 주인 계정**으로 로그인  
  - `gimsansan/myMemo_2606` → **`gimsansan`**
- 브라우저/Git Credential Manager 안내를 따릅니다.

#### 로그인 창이 안 뜨고 또 403이면

→ [[#6. 안 될 때 (PAT)]] 참고

---

## 5. 성공 확인

```powershell
git log -1 --oneline
git status
```

성공 시 `git status` 예:

```
On branch main
Your branch is up to date with 'origin/main'.
nothing to commit, working tree clean
```

또는 push 직후:

```
Enumerating objects: ...
To https://github.com/gimsansan/myMemo_2606.git
   xxxxx..c7cd396  main -> main
```

GitHub 웹에서 **Commits** 탭에 방금 커밋 메시지가 보이면 완료입니다.

---

## 6. 안 될 때 (PAT)

**Personal Access Token** — GitHub 비밀번호 대신 쓰는 **앱용 비밀번호**입니다.

### 6-1. 토큰 만들기

1. 브라우저에서 **저장소 주인 계정**으로 GitHub 로그인 (예: `gimsansan`)
2. **Settings** → **Developer settings** → **Personal access tokens**
3. **Generate new token** (classic 또는 fine-grained)
4. **repo** 권한 포함 → 생성 → **토큰 복사** (한 번만 보임)

### 6-2. push 시 입력

```powershell
git push
```

| 항목 | 입력 |
|------|------|
| Username | `gimsansan` |
| Password | **토큰 문자열** (GitHub 로그인 비밀번호 아님) |

---

## 7. 두 GitHub 계정을 쓸 때

둘 다 **본인 계정**이어도, **repo마다 주인이 하나**입니다.

| 저장소 | push 시 로그인할 계정 |
|--------|------------------------|
| `gimsansan/myMemo_2606` | `gimsansan` |
| `k-songs/어떤-repo` | `k-songs` |

**계정을 바꿀 때마다** `git:https://github.com` 자격 증명을 지우고 push하는 방식이 가장 단순합니다.

**자주 바꾼다면** (고급): 계정별 **SSH 키** + `~/.ssh/config` — 별도 학습 주제입니다.

---

## 8. 지우면 안 되는 항목

- **GitLab** 관련 (`gitlab.com`, `oauth-refresh-token.gitlab.com`) — GitLab push에 사용
- **사내 Git** (`192.168.x.x` 등) — 회사 저장소에 사용

GitHub push만 고칠 때는 **`git:https://github.com`만** 삭제하세요.

---

## 9. 자주 묻는 질문

### 커밋 메시지를 잘못 썼어요 (아직 push 전)

```powershell
git commit --amend -m "새 메시지"
```

이미 push한 뒤에는 `--amend` + force push가 필요해 **혼자 쓰는 repo일 때만** 권장합니다.

### `git push`만 하면 되나요? `git push origin main`?

remote가 `origin`이고 브랜치가 `main`이면 **`git push`만**으로도 보통 동일합니다.

### Vercel은 언제 반영되나?

GitHub에 push되고, Vercel이 그 repo와 연동돼 있으면 **자동으로 다시 빌드·배포**됩니다.

### 401과 403 차이

| 코드 | 대략적인 의미 |
|------|----------------|
| **401** | 로그인 자체가 안 됨 (비밀번호/토큰 틀림) |
| **403** | 로그인은 됐는데 **이 repo에 권한 없음** (다른 계정으로 시도한 경우 많음) |

---

## 빠른 체크리스트 (복붙용)

```
□ git remote -v 로 push 대상 repo·계정 확인
□ 자격 증명 관리자 → git:https://github.com 삭제
□ git push
□ 저장소 주인 계정으로 로그인 (예: gimsansan)
□ git status / GitHub 웹에서 커밋 확인
```

---

## 관련 문서

| 문서 | 내용 |
|------|------|
| [[USAGE]] | 앱 사용법·Vercel 배포 |
| [[README]] | 프로젝트 개요 |

---

*이 문서는 `Permission to gimsansan/... denied to k-songs` (403) 상황을 기준으로 작성했습니다.*
