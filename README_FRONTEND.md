# APL Fit - Frontend

이 폴더는 APL Fit의 프론트엔드 정적 웹사이트입니다.

## 폴더 구조

```
public/
├── index.html          # 메인 HTML 파일
├── css/
│   └── style.css       # 스타일시트
├── js/
│   └── app.js          # JavaScript 로직
└── images/
    └── APLCOLOR_logo.png  # 로고
```

## Cloudflare Pages 배포 방법

### 1. GitHub에 업로드

```bash
# Git 초기화 (아직 안 했다면)
git init

# 모든 파일 추가
git add .

# 커밋
git commit -m "Initial frontend commit"

# GitHub 저장소 연결 (본인의 저장소 URL로 변경)
git remote add origin https://github.com/YOUR_USERNAME/apl-fit.git

# 푸시
git push -u origin main
```

### 2. Cloudflare Pages 설정

1. [Cloudflare Dashboard](https://dash.cloudflare.com)에 로그인
2. "Pages" 메뉴 선택
3. "Create a project" 클릭
4. GitHub 저장소 연결
5. 빌드 설정:
   - **Build command**: (비워두기)
   - **Build output directory**: `public`
   - **Root directory**: `/` 또는 `apl_fit`
6. "Save and Deploy" 클릭

### 3. 배포 완료

몇 분 후 `https://your-project.pages.dev` 형식의 URL로 접속 가능합니다.

## 로컬 테스트

간단한 로컬 서버로 테스트할 수 있습니다:

```bash
# Python 사용
cd public
python3 -m http.server 8000

# 또는 Node.js의 http-server 사용
npx http-server public -p 8000
```

브라우저에서 `http://localhost:8000` 접속

## 주요 기능

- 반응형 디자인 (데스크탑, 태블릿, 모바일)
- 드래그 앤 드롭 이미지 업로드
- 실시간 이미지 미리보기
- 로딩 모달
- 알림 시스템

## 브라우저 지원

- Chrome (최신 버전)
- Firefox (최신 버전)
- Safari (최신 버전)
- Edge (최신 버전)

## 커스터마이징

### 색상 변경
`public/css/style.css`의 `:root` 변수를 수정하세요:

```css
:root {
    --primary-color: #7C6EAD;
    --secondary-color: #A87C7C;
    /* ... */
}
```

### 로고 변경
`public/images/` 폴더의 로고 파일을 교체하세요.

## 라이선스

MIT License
