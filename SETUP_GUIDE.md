# 🚀 APL Fit 설치 및 사용 가이드

## 📋 목차
1. [시스템 개요](#시스템-개요)
2. [환경 설정](#환경-설정)
3. [서버 실행](#서버-실행)
4. [사용 방법](#사용-방법)
5. [API 문서](#api-문서)
6. [문제 해결](#문제-해결)

---

## 🎯 시스템 개요

APL Fit은 AI 기반 가상 피팅 서비스입니다.

### 주요 기능
- ✅ 고객 사진 업로드 (AWS S3)
- ✅ 의류 이미지 관리 (MongoDB + S3)
- ✅ AI 가상 피팅 (Replicate IDM-VTON)
- ✅ 피팅 기록 저장 (MongoDB)
- ✅ 결과 이미지 저장 및 표시

---

## ⚙️ 환경 설정

### 1. .env 파일 설정

`/Users/kimvstiger/KimVsTiger_code/APL_fit/.env` 파일을 열고 다음 값들을 입력하세요:

```env
# MongoDB 연결 설정
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/aplfit

# 서버 포트
PORT=3000

# AWS S3 설정
AWS_ACCESS_KEY_ID=여기에_AWS_Access_Key_입력
AWS_SECRET_ACCESS_KEY=여기에_AWS_Secret_Key_입력
AWS_REGION=ap-northeast-2
AWS_S3_BUCKET=여기에_버킷_이름_입력

# Replicate AI API
REPLICATE_API_TOKEN=여기에_Replicate_Token_입력
```

### 2. AWS S3 버킷 설정

1. AWS Console에서 S3 버킷 생성
2. 버킷 이름 예: `aplfit-images`
3. 리전: ap-northeast-2 (서울)
4. IAM 사용자 생성 및 S3 권한 부여
5. Access Key 발급

### 3. MongoDB 설정

1. MongoDB Atlas 계정 생성 (무료)
2. 클러스터 생성
3. 연결 URI 복사하여 `.env`에 입력

### 4. Replicate API 설정

1. https://replicate.com 가입
2. API Token 발급
3. `.env`에 입력

---

## 🚀 서버 실행

### 1. 패키지 설치 (이미 완료됨)

```bash
cd /Users/kimvstiger/KimVsTiger_code/APL_fit
npm install
```

### 2. 서버 시작

```bash
npm start
```

### 3. 접속 확인

브라우저에서:
- 메인 페이지: http://localhost:3000
- Health Check: http://localhost:3000/api/health

---

## 📱 사용 방법

### Step 1: 의류 이미지 업로드

API를 통해 의류 이미지 업로드:

```bash
curl -X POST http://localhost:3000/api/images/upload-clothing \
  -F "image=@의류이미지.jpg" \
  -F "name=화이트 셔츠" \
  -F "category=top" \
  -F "color=white"
```

또는 프론트엔드에서 업로드 (추후 구현)

### Step 2: 고객 사진 업로드

```bash
curl -X POST http://localhost:3000/api/images/upload-customer \
  -F "photo=@고객사진.jpg" \
  -F "customerId=temp123"
```

### Step 3: 가상 피팅 실행

```bash
curl -X POST http://localhost:3000/api/fitting/create \
  -H "Content-Type: application/json" \
  -d '{
    "customerPhotoUrl": "https://s3.../고객사진.jpg",
    "clothingItemId": "의류ID"
  }'
```

### Step 4: 결과 확인

```bash
curl http://localhost:3000/api/fitting/result/피팅기록ID
```

---

## 📡 API 문서

### 이미지 업로드

#### 고객 사진 업로드
```http
POST /api/images/upload-customer
Content-Type: multipart/form-data

Fields:
- photo: File (required)
- customerId: String (optional)
```

#### 의류 이미지 업로드
```http
POST /api/images/upload-clothing
Content-Type: multipart/form-data

Fields:
- image: File (required)
- name: String (required)
- category: String (required) - top, bottom, dress, outer
- color: String (required)
- description: String
- gender: String - male, female, unisex
- price: Number
```

#### 의류 목록 조회
```http
GET /api/images/clothing?category=top&page=1&limit=20
```

### 가상 피팅

#### 피팅 생성
```http
POST /api/fitting/create
Content-Type: application/json

Body:
{
  "customerPhotoUrl": "https://s3.../photo.jpg",
  "clothingItemId": "mongodb_id",
  "customerId": "customer_id" (optional)
}
```

#### 피팅 결과 조회
```http
GET /api/fitting/result/:fittingRecordId
```

#### 고객 피팅 기록
```http
GET /api/fitting/history/:customerId
```

### 고객 관리

#### 고객 생성
```http
POST /api/customers
Content-Type: application/json

Body:
{
  "name": "홍길동",
  "email": "test@example.com",
  "phone": "010-1234-5678"
}
```

#### 고객 조회
```http
GET /api/customers/:customerId
```

---

## 🗂️ 프로젝트 구조

```
APL_fit/
├── .env                    # 환경 변수 (AWS, MongoDB 키)
├── .env.example            # 환경 변수 예시
├── server.js               # 메인 서버
├── package.json
├── models/                 # MongoDB 스키마
│   ├── Customer.js         # 고객 모델
│   ├── ClothingItem.js     # 의류 모델
│   └── FittingRecord.js    # 피팅 기록 모델
├── services/               # 비즈니스 로직
│   ├── s3Service.js        # AWS S3 업로드
│   └── fittingService.js   # AI 가상 피팅
├── routes/                 # API 라우터
│   ├── imageRoutes.js      # 이미지 업로드 API
│   ├── fittingRoutes.js    # 가상 피팅 API
│   └── customerRoutes.js   # 고객 관리 API
└── public/                 # 프론트엔드
    ├── index.html
    ├── css/
    └── js/
```

---

## 🔧 문제 해결

### MongoDB 연결 실패
```
⚠️  MongoDB 없이 서버를 시작합니다
```
- `.env` 파일의 `MONGODB_URI` 확인
- MongoDB Atlas IP 화이트리스트 확인 (0.0.0.0/0 허용)

### S3 업로드 실패
```
❌ S3 업로드 실패
```
- AWS Access Key 확인
- S3 버킷 이름 확인
- IAM 권한 확인 (`s3:PutObject` 필요)

### AI 피팅 실패
```
❌ AI 가상 피팅 실패
```
- Replicate API 토큰 확인
- 크레딧 잔액 확인
- 자동으로 간단한 오버레이 방식으로 전환됨

---

## 💰 비용 예상

### AWS S3
- 저장: $0.023 / GB / 월
- 월 100회 사용: 약 $0.5

### Replicate AI
- IDM-VTON: $0.005 ~ $0.01 / image
- 월 100회: 약 $0.5 ~ $1

### MongoDB Atlas
- Free Tier: 512MB (무료)
- 충분히 사용 가능

**총 예상: 월 $1~$2**

---

## ✅ 체크리스트

설정 완료 확인:

- [ ] `.env` 파일에 AWS 키 입력
- [ ] `.env` 파일에 MongoDB URI 입력
- [ ] `.env` 파일에 Replicate 토큰 입력
- [ ] S3 버킷 생성 완료
- [ ] `npm start` 서버 실행 성공
- [ ] http://localhost:3000/api/health 접속 확인

---

## 📞 다음 단계

1. **프론트엔드 통합**: 기존 `public/index.html`에 API 연동
2. **의류 샘플 업로드**: `의류이미지` 폴더의 이미지들을 S3에 업로드
3. **테스트**: 고객 사진 + 의류 선택 → 가상 피팅 실행
4. **UI 개선**: 결과 표시, 히스토리 관리 등

준비되면 말씀해주세요! 🚀
