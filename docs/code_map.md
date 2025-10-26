# Code Map - APL Fit API ↔ Service ↔ Model 연결 구조

## 📐 전체 아키텍처

```
프론트엔드 (public/js/app.js)
    ↓
API Layer (server/routes/)
    ↓
Service Layer (server/services/)
    ↓
Model Layer (server/models/)
    ↓
Database (MongoDB Atlas) / Storage (AWS S3)
```

---

## 🗂️ API Layer (routes/)

### `routes/imageRoutes.js`
**역할:** 이미지 업로드 및 조회 API 엔드포인트

**연결 관계:**
- → `services/s3Service.js` (이미지 업로드)
- → `models/Customer.js` (고객 정보 저장)
- → `models/ClothingItem.js` (의류 정보 저장)

**주요 엔드포인트:**
```javascript
POST   /api/images/upload-customer    // 고객 사진 업로드
  ├─> multer (multipart/form-data 처리)
  ├─> s3Service.uploadCustomerPhoto()
  └─> Customer.create() 또는 update()

POST   /api/images/upload-clothing     // 의류 이미지 업로드
  ├─> multer
  ├─> s3Service.uploadClothingImage()
  └─> ClothingItem.create()

GET    /api/images/clothing            // 의류 목록 조회
  └─> ClothingItem.find()

GET    /api/images/clothing/:id        // 특정 의류 조회
  └─> ClothingItem.findById()
```

---

### `routes/fittingRoutes.js`
**역할:** 가상 피팅(합성) API 엔드포인트

**연결 관계:**
- → `services/fittingService.js` (AI 합성 처리)
- → `services/s3Service.js` (결과 이미지 저장)
- → `models/FittingRecord.js` (피팅 기록 저장)
- → `models/Customer.js` (고객 조회/생성)
- → `models/ClothingItem.js` (의류 조회)

**주요 엔드포인트:**
```javascript
POST   /api/fitting/create             // 🔴 가상 피팅 생성 (핵심)
  ├─> Customer.findById() 또는 create()
  ├─> ClothingItem.findById()
  ├─> FittingRecord.create(status: 'processing')
  ├─> fittingService.processFitting() [비동기]
  │     ├─> createVirtualFitting() (Replicate AI)
  │     │     └─> Replicate API 호출
  │     ├─> downloadImageFromUrl() (AI 결과 다운로드)
  │     ├─> s3Service.uploadFittingResult() (S3 업로드)
  │     └─> FittingRecord.complete(resultUrl)
  └─> 응답: { fittingRecordId, status: 'processing' }

GET    /api/fitting/result/:id         // 피팅 결과 조회
  └─> FittingRecord.findById().populate('customer', 'clothingItem')

GET    /api/fitting/history/:customerId // 고객 피팅 이력
  └─> FittingRecord.find({ customer }).populate('clothingItem')
```

---

## 🧩 Service Layer (services/)

### `services/s3Service.js`
**역할:** AWS S3 이미지 업로드/다운로드

**사용 라이브러리:**
- `@aws-sdk/client-s3` (S3Client, PutObjectCommand)
- `@aws-sdk/lib-storage` (Upload)
- `sharp` (이미지 리사이징/최적화)

**주요 함수:**
```javascript
uploadImageToS3(fileBuffer, originalName, folder, options)
  ├─ 파라미터:
  │   - fileBuffer: Buffer (이미지 데이터)
  │   - originalName: String (원본 파일명)
  │   - folder: String ('customers', 'clothing', 'fitting-results')
  │   - options: Object { resize, quality }
  ├─ 처리:
  │   - Sharp로 이미지 리사이징/압축
  │   - 고유 파일명 생성 (UUID + timestamp)
  │   - S3에 업로드
  └─ 반환: { success, url, key }

uploadCustomerPhoto(fileBuffer, fileName)
  └─> uploadImageToS3(..., 'customers', { resize: { width: 1024 } })

uploadClothingImage(fileBuffer, fileName)
  └─> uploadImageToS3(..., 'clothing', { resize: { width: 1024 } })

uploadFittingResult(imageBuffer, fileName, customerId)
  └─> uploadImageToS3(..., `fitting-results/${customerId}`)

deleteImageFromS3(s3Key)
  └─> S3Client.send(DeleteObjectCommand)
```

**사용 변수:**
- `process.env.AWS_ACCESS_KEY_ID`
- `process.env.AWS_SECRET_ACCESS_KEY`
- `process.env.AWS_REGION`
- `process.env.AWS_S3_BUCKET`

---

### `services/fittingService.js` 🔴 **핵심 합성 서비스**
**역할:** AI 가상 피팅 및 이미지 합성

**사용 라이브러리:**
- `replicate` (Replicate AI API)
- `axios` (HTTP 요청)
- `sharp` (이미지 처리)

**주요 함수:**
```javascript
createVirtualFitting(personImageUrl, clothingImageUrl, options)
  ├─ 파라미터:
  │   - personImageUrl: String (고객 사진 S3 URL)
  │   - clothingImageUrl: String (의류 이미지 S3 URL)
  │   - options: Object { description, denoiseSteps, seed }
  ├─ 처리:
  │   - Replicate IDM-VTON 모델 실행
  │   - 모델 ID: "cuuupid/idm-vton:c871bb..."
  │   - 입력: human_img, garm_img, garment_des, denoise_steps, seed
  └─ 반환: String (Replicate 임시 URL)

createSimpleOverlay(personImageBuffer, clothingImageBuffer)
  ├─ 역할: Fallback 합성 (AI 없이)
  ├─ 처리:
  │   - Sharp로 이미지 크기 조정
  │   - composite() 함수로 오버레이
  └─ 반환: Buffer (합성 이미지)

downloadImageFromUrl(url)
  ├─ 역할: URL에서 이미지 다운로드
  ├─ 처리: axios.get(url, { responseType: 'arraybuffer' })
  └─ 반환: Buffer

processFitting(personImageUrl, clothingImageUrl, customerId, options)
  ├─ 역할: 전체 합성 프로세스 관리
  ├─ 로직:
  │   1. Replicate API 토큰 확인
  │   2-A. 토큰 있음 → createVirtualFitting() 실행
  │       → downloadImageFromUrl(aiResultUrl)
  │       → s3Service.uploadFittingResult()
  │   2-B. 토큰 없음 or AI 실패 → createSimpleOverlay()
  │       → s3Service.uploadFittingResult()
  │   3. 처리 시간 측정
  └─ 반환: { success, resultImageUrl, method, processingTime }
```

**사용 변수:**
- `process.env.REPLICATE_API_TOKEN`

**AI 모델 파라미터:**
```javascript
{
  human_img: "고객 사진 URL",
  garm_img: "의류 이미지 URL",
  garment_des: "의류 설명",
  is_checked: true,          // 자동 크롭 활성화
  is_checked_crop: false,
  denoise_steps: 30,         // 품질 (10~50)
  seed: 42                   // 재현 가능성
}
```

---

## 📦 Model Layer (models/)

### `models/Customer.js`
**역할:** 고객 정보 MongoDB 스키마

**스키마 구조:**
```javascript
{
  name: String,
  email: String,
  phone: String,
  photo: {
    url: String,           // S3 URL
    s3Key: String,         // S3 키
    thumbnailUrl: String
  },
  fittingHistory: [ObjectId],  // FittingRecord 참조
  createdAt: Date,
  updatedAt: Date
}
```

**주요 메서드:**
```javascript
Customer.create(data)
Customer.findById(id)
Customer.findByEmail(email)
customer.addFittingRecord(fittingRecordId)
```

---

### `models/ClothingItem.js`
**역할:** 의류 정보 MongoDB 스키마

**스키마 구조:**
```javascript
{
  name: String,
  image: {
    url: String,           // S3 URL
    s3Key: String,
    thumbnailUrl: String
  },
  category: String,        // top, bottom, dress, outer, accessory, shoes
  color: String,
  gender: String,          // male, female, unisex
  season: String,          // spring, summer, fall, winter, all
  brand: String,
  price: Number,
  viewCount: Number,
  fittingCount: Number,
  createdAt: Date
}
```

**주요 메서드:**
```javascript
ClothingItem.create(data)
ClothingItem.findById(id)
ClothingItem.find({ category, gender })
clothingItem.incrementViewCount()
clothingItem.incrementFittingCount()
```

---

### `models/FittingRecord.js` 🔴 **핵심 피팅 기록**
**역할:** 가상 피팅 기록 MongoDB 스키마

**스키마 구조:**
```javascript
{
  customer: ObjectId,           // Customer 참조
  customerPhoto: {
    url: String,                // 고객 사진 S3 URL
    s3Key: String
  },
  clothingItem: ObjectId,       // ClothingItem 참조
  resultImage: {
    url: String,                // 🔴 합성 결과 S3 URL
    s3Key: String
  },
  status: String,               // pending, processing, completed, failed
  errorMessage: String,
  errorCode: String,
  settings: {
    aiModel: String,            // 'replicate-idm-vton' or 'simple-overlay'
    processingTime: Number,     // 밀리초
    denoiseSteps: Number,
    seed: Number
  },
  createdAt: Date,
  updatedAt: Date
}
```

**주요 메서드:**
```javascript
FittingRecord.create(data)
FittingRecord.findById(id).populate('customer').populate('clothingItem')
FittingRecord.find({ customer })

// 인스턴스 메서드
fittingRecord.complete(resultImageUrl, s3Key)
  ├─ status = 'completed'
  ├─ resultImage = { url, s3Key }
  └─ save()

fittingRecord.fail(errorMessage, errorCode)
  ├─ status = 'failed'
  ├─ errorMessage, errorCode 저장
  └─ save()
```

---

## 🔄 데이터 흐름 (합성 프로세스)

### 1. 고객 사진 업로드
```
프론트엔드
  → POST /api/images/upload-customer (FormData)
    → imageRoutes.js
      → multer (파일 파싱)
      → s3Service.uploadCustomerPhoto(buffer, filename)
        → Sharp (리사이징/압축)
        → S3 업로드
        → 반환: { url, s3Key }
      → Customer.create({ photo: { url, s3Key } })
        → MongoDB 저장
      → 응답: { customerId, photoUrl }
```

### 2. 의류 이미지 업로드
```
프론트엔드
  → POST /api/images/upload-clothing (FormData)
    → imageRoutes.js
      → multer
      → s3Service.uploadClothingImage(buffer, filename)
        → S3 업로드
      → ClothingItem.create({ image: { url, s3Key }, ... })
        → MongoDB 저장
      → 응답: { clothingItemId, imageUrl }
```

### 3. 가상 피팅 생성 🔴 **핵심**
```
프론트엔드
  → POST /api/fitting/create
    → fittingRoutes.js
      ├─ Customer.findById(customerId)
      ├─ ClothingItem.findById(clothingItemId)
      ├─ FittingRecord.create({ status: 'processing' })
      │   → MongoDB 저장 (초기 상태)
      ├─ fittingService.processFitting() [비동기 실행]
      │   ├─ createVirtualFitting(customerUrl, clothingUrl)
      │   │   → Replicate API 호출
      │   │   → AI 모델 실행 (10~30초)
      │   │   → 반환: Replicate 임시 URL
      │   ├─ downloadImageFromUrl(replicateUrl)
      │   │   → axios로 이미지 다운로드
      │   ├─ s3Service.uploadFittingResult(buffer, filename)
      │   │   → S3에 영구 저장
      │   └─ fittingRecord.complete(s3Url, s3Key)
      │       → MongoDB 업데이트 (status: 'completed')
      └─ 즉시 응답: { fittingRecordId, status: 'processing' }
```

### 4. 결과 조회 (폴링)
```
프론트엔드 (2초마다)
  → GET /api/fitting/result/:id
    → fittingRoutes.js
      → FittingRecord.findById(id).populate(...)
        → MongoDB 조회
      → 응답:
        - status: 'processing' → 계속 폴링
        - status: 'completed' → resultImage.url 반환
        - status: 'failed' → 에러 메시지
```

---

## 🧠 함수/변수 재사용 가이드

### 이미지 업로드가 필요할 때
```javascript
// ✅ 재사용
const s3Service = require('./services/s3Service');
const result = await s3Service.uploadImageToS3(buffer, filename, folder);

// ❌ 중복 생성 금지
// 새로운 S3 업로드 함수를 만들지 말 것
```

### 고객 조회/생성이 필요할 때
```javascript
// ✅ 재사용
const Customer = require('./models/Customer');
let customer = await Customer.findById(customerId);
if (!customer) {
  customer = await Customer.create({ ... });
}

// ❌ 중복 쿼리 금지
```

### AI 합성이 필요할 때
```javascript
// ✅ 재사용
const fittingService = require('./services/fittingService');
const result = await fittingService.processFitting(personUrl, clothingUrl, customerId);

// ❌ Replicate API를 직접 호출하지 말 것
// 항상 fittingService를 통해 호출
```

---

## 📌 핵심 의존성

### 외부 라이브러리
- `express` - 웹 서버
- `mongoose` - MongoDB ORM
- `@aws-sdk/client-s3` - S3 업로드
- `replicate` - AI 모델 실행
- `multer` - 파일 업로드 처리
- `sharp` - 이미지 리사이징
- `axios` - HTTP 요청

### 환경변수
- `MONGODB_URI` - MongoDB 연결
- `AWS_ACCESS_KEY_ID` - S3 인증
- `AWS_SECRET_ACCESS_KEY` - S3 인증
- `AWS_REGION` - S3 리전
- `AWS_S3_BUCKET` - S3 버킷명
- `REPLICATE_API_TOKEN` - AI API 인증
- `PORT` - 서버 포트

---

## 🔍 코드 추적 참고

### 새로운 기능 추가 시 확인할 위치
1. **API 엔드포인트 추가** → `routes/`
2. **비즈니스 로직 추가** → `services/`
3. **DB 모델 수정** → `models/`
4. **환경변수 추가** → `.env` + 해당 서비스 파일

### 버그 수정 시 확인 순서
1. API 레이어 (`routes/`) - 입력 검증
2. Service 레이어 (`services/`) - 로직 오류
3. Model 레이어 (`models/`) - DB 스키마
4. 외부 서비스 (S3, Replicate) - 네트워크/인증 오류

---

**작성일:** 2025-10-25
**버전:** 1.0.0
**업데이트:** 초기 작성
