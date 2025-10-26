# APL Fit - AI 기반 가상 피팅 서비스

당신의 사진에 옷을 입혀보세요! AI 기술을 활용한 실시간 가상 피팅 서비스입니다.

## 🌟 주요 기능

- 📸 **고객 사진 업로드**: 정면, 측면, 45도 각도 사진 지원
- 👔 **의류 선택**: 업로드하거나 준비된 샘플 의류 사용
- 🤖 **AI 가상 착장**: Replicate IDM-VTON 모델 사용
- 💾 **이력 관리**: MongoDB에 고객 정보 및 착장 기록 저장
- ☁️ **클라우드 저장**: AWS S3에 모든 이미지 저장

---

## 📁 프로젝트 구조

```
APL_fit/
├── .env                      # 로컬 개발 환경변수 (포트 3000)
├── .env.test                 # 테스트 환경변수 (포트 3004)
├── .env.production           # 프로덕션 환경변수 (포트 3005)
│
├── public/                   # 프론트엔드 (Cloudflare Pages)
│   ├── index.html
│   ├── js/app.js            # API 연동 코드
│   └── sample-clothes/
│
├── server/                   # 백엔드 (Oracle Cloud)
│   ├── server.js            # Express 서버 (환경별 설정)
│   ├── ecosystem.config.js  # PM2 설정
│   ├── models/              # MongoDB 스키마
│   ├── routes/              # API 라우트
│   └── services/            # 비즈니스 로직
│
└── 의류이미지/               # 로컬 샘플 이미지
```

---

## 🚀 환경별 설정

### 로컬 개발 환경
- **포트**: 3000
- **데이터베이스**: `apl_fit`
- **환경 파일**: `.env`

### 테스트 환경 (Oracle Cloud)
- **포트**: 3004
- **데이터베이스**: `apl_fit_test`
- **환경 파일**: `.env.test`
- **프로세스**: `apl-fit-test`

### 프로덕션 환경 (Oracle Cloud)
- **포트**: 3005
- **데이터베이스**: `apl_fit`
- **환경 파일**: `.env.production`
- **프로세스**: `apl-fit-prod`

---

## 🛠️ 로컬 설치 및 실행

### 1. 의존성 설치
```bash
cd server
npm install
```

### 2. 환경변수 설정
`.env` 파일을 프로젝트 루트에 생성 (`.env.example` 참고)

### 3. 서버 실행

```bash
# 개발 모드 (포트 3000)
npm start

# 테스트 모드 (포트 3004)
npm run start:test

# 프로덕션 모드 (포트 3005)
npm run start:prod
```

### 4. 브라우저 접속
- http://localhost:3000 (개발)
- http://localhost:3004 (테스트)
- http://localhost:3005 (프로덕션)

---

## ☁️ Oracle Cloud 배포

자세한 내용은 [ORACLE_DEPLOYMENT.md](ORACLE_DEPLOYMENT.md) 참고

```bash
# Oracle VM에서
cd ~/projects
git clone <repo-url> APL_fit
cd APL_fit/server
npm install

# PM2로 실행
pm2 start ecosystem.config.js

# 부팅 시 자동 시작
pm2 startup && pm2 save
```

---

## 📡 API 엔드포인트

```
GET  /api/health                        # Health Check
POST /api/images/upload-customer        # 고객 사진 업로드
POST /api/images/upload-clothing        # 의류 이미지 업로드
POST /api/fitting/create                # 가상 착장 생성
GET  /api/fitting/result/:id            # 착장 결과 조회
```

---

## 🔧 기술 스택

- **Frontend**: HTML5, CSS3, JavaScript
- **Backend**: Node.js, Express.js
- **Database**: MongoDB Atlas
- **Storage**: AWS S3
- **AI**: Replicate IDM-VTON
- **Deploy**: Oracle Cloud + PM2

---

## 📊 PM2 관리

```bash
pm2 list                   # 상태 확인
pm2 logs apl-fit-test      # 테스트 로그
pm2 logs apl-fit-prod      # 프로덕션 로그
pm2 restart apl-fit-test   # 재시작
pm2 monit                  # 모니터링
```

---

## 📞 포트 사용 현황

```
3004: APL Fit 테스트 서버 ⭐
3005: APL Fit 프로덕션 서버 ⭐
```

---

## 📄 문서

- [Oracle 배포 가이드](ORACLE_DEPLOYMENT.md)
- [프로젝트 구조](PROJECT_STRUCTURE.md)
- [빠른 시작](QUICK_START.md)
