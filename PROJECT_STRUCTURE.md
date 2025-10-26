# 📁 APL Fit 프로젝트 구조

## 폴더 구조

```
APL_fit/
├── public/                    # 프론트엔드 (Frontend)
│   ├── index.html            # 메인 페이지
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── app.js
│   ├── images/
│   │   └── APLCOLOR_logo.png
│   └── sample-clothes/       # 샘플 의류 이미지
│
├── server/                   # 백엔드 (Backend) - Oracle Cloud 업로드
│   ├── server.js            # 메인 서버 파일
│   ├── package.json         # 의존성 관리
│   ├── models/              # MongoDB 스키마
│   │   ├── Customer.js      # 고객 모델
│   │   ├── ClothingItem.js  # 의류 모델
│   │   └── FittingRecord.js # 피팅 기록 모델
│   ├── routes/              # API 라우터
│   │   ├── imageRoutes.js   # 이미지 업로드 API
│   │   ├── fittingRoutes.js # 가상 피팅 API
│   │   └── customerRoutes.js # 고객 관리 API
│   └── services/            # 비즈니스 로직
│       ├── s3Service.js     # AWS S3 이미지 업로드
│       └── fittingService.js # AI 가상 피팅 (Replicate)
│
├── 의류이미지/                # 로컬 의류 샘플 (S3 업로드 전)
│   ├── 남성/
│   └── 여성/
│
├── .env                    # 환경 변수 (프로젝트 루트 - AWS, MongoDB 키)
├── .env.example            # 환경 변수 예시
├── README.md               # 프로젝트 소개
├── HISTORY.md              # 개발 히스토리
├── SETUP_GUIDE.md          # 설치 가이드
└── PROJECT_STRUCTURE.md    # 이 파일
```

---

## 🔄 작동 방식

### Frontend (public/)
- 사용자 인터페이스
- Cloudflare Pages에 배포
- API 호출로 백엔드와 통신

### Backend (server/)
- RESTful API 서버
- Oracle Cloud에 배포
- MongoDB + AWS S3 + Replicate AI 연동

---

## 🚀 배포 방법

### 1. Frontend 배포 (Cloudflare Pages)

**현재 상태:** 이미 배포됨
- Test: https://github.com/claud0604/Test_APL_fit
- Production: https://github.com/claud0604/APL_fit

**업데이트 방법:**
```bash
git add public/
git commit -m "Update frontend"
git push
# Cloudflare Pages가 자동 배포
```

### 2. Backend 배포 (Oracle Cloud)

**준비물:**
- Oracle Cloud VM (기존 사용 중)
- Node.js 18+ 설치
- PM2 설치

**배포 단계:**

#### Step 1: 서버에 폴더 업로드

```bash
# 로컬에서 server 폴더를 압축
cd /Users/kimvstiger/KimVsTiger_code/APL_fit
tar -czf server.tar.gz server/

# SCP로 Oracle Cloud에 업로드
scp server.tar.gz ubuntu@오라클서버IP:/home/ubuntu/

# 또는 Git 사용
cd server
git init
git add .
git commit -m "Backend setup"
git push origin main
```

#### Step 2: Oracle Cloud 서버에서 설정

```bash
# SSH 접속
ssh ubuntu@오라클서버IP

# 압축 해제
tar -xzf server.tar.gz
cd server

# Node.js 설치 (필요시)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 패키지 설치
npm install

# .env 파일 수정
nano .env
# AWS, MongoDB, Replicate 키 입력

# PM2 설치 (필요시)
sudo npm install -g pm2

# 서버 실행
pm2 start server.js --name apl-fit
pm2 save
pm2 startup
```

#### Step 3: 방화벽 설정

```bash
# Oracle Cloud 방화벽에서 포트 3000 열기
sudo iptables -I INPUT -p tcp --dport 3000 -j ACCEPT
sudo netfilter-persistent save

# 또는 ufw 사용
sudo ufw allow 3000
```

#### Step 4: 접속 확인

```
http://오라클서버IP:3000/api/health
```

---

## 🔗 Frontend ↔ Backend 연결

### Frontend에서 API 호출

`public/js/app.js`에 추가:

```javascript
// API 기본 URL 설정
const API_URL = 'http://오라클서버IP:3000/api';

// 예시: 고객 사진 업로드
async function uploadCustomerPhoto(file) {
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('customerId', 'temp123');

    const response = await fetch(`${API_URL}/images/upload-customer`, {
        method: 'POST',
        body: formData
    });

    return await response.json();
}

// 예시: 의류 목록 조회
async function getClothingList() {
    const response = await fetch(`${API_URL}/images/clothing`);
    return await response.json();
}

// 예시: 가상 피팅 생성
async function createFitting(customerPhotoUrl, clothingItemId) {
    const response = await fetch(`${API_URL}/fitting/create`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            customerPhotoUrl,
            clothingItemId
        })
    });

    return await response.json();
}
```

---

## 📊 데이터 흐름

```
1. 사용자가 프론트엔드에서 사진 업로드
   ↓
2. Frontend → Backend API 호출
   ↓
3. Backend → AWS S3에 이미지 저장
   ↓
4. Backend → MongoDB에 메타데이터 저장
   ↓
5. 사용자가 의류 선택
   ↓
6. Backend → Replicate AI로 가상 피팅 요청
   ↓
7. Replicate → 합성 이미지 반환
   ↓
8. Backend → S3에 결과 저장
   ↓
9. Backend → MongoDB에 피팅 기록 저장
   ↓
10. Frontend → 결과 이미지 표시
```

---

## 🔐 환경 변수 설정

**파일 위치:** `/APL_fit/.env` (프로젝트 루트)

```env
# MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/aplfit

# Server
PORT=3000
NODE_ENV=production

# AWS S3
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=ap-northeast-2
AWS_S3_BUCKET=aplfit-images

# Replicate AI
REPLICATE_API_TOKEN=r8_...
```

---

## 🛠️ 개발 워크플로우

### 로컬 개발

```bash
# Backend 개발
cd server
npm install
npm start
# → http://localhost:3000

# Frontend 개발
# public/index.html을 브라우저에서 열기
# 또는 Live Server 사용
```

### 프로덕션 배포

```bash
# Frontend: Git Push → Cloudflare 자동 배포
git add public/
git commit -m "Update frontend"
git push

# Backend: Oracle Cloud에 수동 업로드
cd server
pm2 restart apl-fit
```

---

## 📞 다음 단계

1. ✅ 폴더 구조 정리 완료
2. ⏳ `.env` 파일 설정 (AWS, MongoDB 키 입력)
3. ⏳ Oracle Cloud에 업로드
4. ⏳ Frontend API 연동
5. ⏳ 테스트 및 디버깅

---

## 💡 팁

- **Frontend 수정**: `public/` 폴더만 수정 후 Git Push
- **Backend 수정**: `server/` 폴더 수정 후 Oracle Cloud에 재배포
- **환경 변수**: 절대 Git에 커밋하지 말 것 (`.gitignore` 확인)
- **로그 확인**: `pm2 logs apl-fit`

---

준비되셨으면 Oracle Cloud 배포를 시작하겠습니다! 🚀
