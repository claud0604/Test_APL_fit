# 🚀 APL Fit 빠른 시작 가이드

## 📋 현재 상태

✅ 폴더 구조 정리 완료
```
APL_fit/
├── public/          # Frontend (Cloudflare Pages)
└── server/          # Backend (Oracle Cloud)
```

---

## 🔑 1단계: 환경 변수 설정 (필수!)

### 파일 위치
```
/Users/kimvstiger/KimVsTiger_code/APL_fit/server/.env
```

### 입력할 정보

```env
# MongoDB (필수)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/aplfit

# AWS S3 (필수)
AWS_ACCESS_KEY_ID=여기에_입력
AWS_SECRET_ACCESS_KEY=여기에_입력
AWS_REGION=ap-northeast-2
AWS_S3_BUCKET=버킷이름

# Replicate AI (선택, AI 피팅용)
REPLICATE_API_TOKEN=여기에_입력

# Server
PORT=3000
```

**Replicate 없이도 작동 가능** (간단한 오버레이 방식으로 자동 전환)

---

## 🖥️ 2단계: 로컬 테스트 (선택)

```bash
cd /Users/kimvstiger/KimVsTiger_code/APL_fit/server
npm start
```

접속: http://localhost:3000/api/health

**테스트 API:**
```bash
# Health Check
curl http://localhost:3000/api/health

# 의류 목록 조회
curl http://localhost:3000/api/images/clothing
```

---

## ☁️ 3단계: Oracle Cloud 배포

### Option A: Git 사용 (추천)

```bash
# 1. server 폴더를 Git 저장소로 만들기
cd /Users/kimvstiger/KimVsTiger_code/APL_fit/server
git init
git add .
git commit -m "Backend setup"

# 2. GitHub에 업로드 (새 저장소 생성)
git remote add origin https://github.com/claud0604/APL_fit_backend.git
git push -u origin main

# 3. Oracle Cloud에서 클론
ssh ubuntu@오라클서버IP
cd ~
git clone https://github.com/claud0604/APL_fit_backend.git server
cd server
npm install
```

### Option B: SCP 직접 업로드

```bash
# 1. server 폴더 압축
cd /Users/kimvstiger/KimVsTiger_code/APL_fit
tar -czf server.tar.gz server/

# 2. Oracle Cloud에 업로드
scp server.tar.gz ubuntu@오라클서버IP:/home/ubuntu/

# 3. Oracle Cloud에서 압축 해제
ssh ubuntu@오라클서버IP
tar -xzf server.tar.gz
cd server
npm install
```

---

## 🔧 4단계: Oracle Cloud 서버 설정

### Node.js 설치 (필요시)

```bash
# Node.js 18.x 설치
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 확인
node --version  # v18.x.x 이상
npm --version
```

### PM2 설치 및 서버 실행

```bash
# PM2 설치
sudo npm install -g pm2

# 서버 실행
cd server
pm2 start server.js --name apl-fit

# 자동 시작 설정
pm2 save
pm2 startup

# 상태 확인
pm2 status
pm2 logs apl-fit
```

### 방화벽 설정

```bash
# Oracle Cloud 방화벽에서 포트 3000 열기
sudo iptables -I INPUT -p tcp --dport 3000 -j ACCEPT
sudo netfilter-persistent save

# 또는
sudo ufw allow 3000
```

---

## 🌐 5단계: 접속 확인

### Backend API 테스트

```
http://오라클서버IP:3000/api/health
```

응답 예시:
```json
{
  "success": true,
  "message": "APL Fit 서버가 정상 작동 중입니다",
  "mongodb": "connected",
  "timestamp": "2024-10-24T..."
}
```

---

## 🔗 6단계: Frontend 연동

### public/js/app.js 파일에 추가

```javascript
// API 기본 URL (Oracle Cloud 서버)
const API_URL = 'http://오라클서버IP:3000/api';

// CORS 설정 (개발 시)
// 나중에 프로덕션에서는 HTTPS + 도메인 사용

// 고객 사진 업로드 함수
async function uploadPhoto(file) {
    const formData = new FormData();
    formData.append('photo', file);

    const response = await fetch(`${API_URL}/images/upload-customer`, {
        method: 'POST',
        body: formData
    });

    return await response.json();
}

// 의류 목록 불러오기
async function loadClothingItems() {
    const response = await fetch(`${API_URL}/images/clothing`);
    const data = await response.json();

    if (data.success) {
        displayClothingItems(data.data);
    }
}

// 가상 피팅 생성
async function createFitting(photoUrl, clothingId) {
    const response = await fetch(`${API_URL}/fitting/create`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            customerPhotoUrl: photoUrl,
            clothingItemId: clothingId
        })
    });

    const data = await response.json();

    if (data.success) {
        // 피팅 기록 ID로 결과 확인
        checkFittingResult(data.data.fittingRecordId);
    }
}

// 피팅 결과 확인 (폴링)
async function checkFittingResult(fittingId) {
    const interval = setInterval(async () => {
        const response = await fetch(`${API_URL}/fitting/result/${fittingId}`);
        const data = await response.json();

        if (data.data.status === 'completed') {
            clearInterval(interval);
            displayResult(data.data.resultImage.url);
        } else if (data.data.status === 'failed') {
            clearInterval(interval);
            alert('피팅 실패: ' + data.data.error.message);
        }
    }, 3000); // 3초마다 확인
}
```

---

## 📊 7단계: 의류 이미지 업로드

### 로컬 의류 이미지 → S3 업로드

`의류이미지` 폴더의 샘플 이미지들을 API로 업로드:

```bash
# 예시: curl로 업로드
curl -X POST http://오라클서버IP:3000/api/images/upload-clothing \
  -F "image=@의류이미지/남성/셔츠1.jpg" \
  -F "name=화이트 셔츠" \
  -F "category=top" \
  -F "color=white" \
  -F "gender=male"
```

또는 프론트엔드에 업로드 페이지 만들기

---

## 🐛 문제 해결

### MongoDB 연결 실패
```bash
# 로그 확인
pm2 logs apl-fit

# MongoDB Atlas IP 화이트리스트에 0.0.0.0/0 추가
```

### S3 업로드 실패
```bash
# AWS 키 확인
cat server/.env | grep AWS

# IAM 권한 확인 (s3:PutObject 필요)
```

### 포트 접속 안됨
```bash
# 방화벽 확인
sudo iptables -L | grep 3000
sudo ufw status

# Oracle Cloud 보안 목록에서 포트 3000 열기
```

---

## 📝 유용한 명령어

```bash
# PM2 명령어
pm2 status           # 상태 확인
pm2 logs apl-fit     # 로그 보기
pm2 restart apl-fit  # 재시작
pm2 stop apl-fit     # 중지
pm2 delete apl-fit   # 삭제

# 서버 업데이트 시
cd server
git pull           # Git 사용 시
npm install        # 새 패키지 있으면
pm2 restart apl-fit
```

---

## ✅ 체크리스트

- [ ] `server/.env` 파일 설정 완료
- [ ] AWS S3 버킷 생성 및 키 발급
- [ ] MongoDB Atlas 설정
- [ ] Oracle Cloud에 server 업로드
- [ ] Node.js, PM2 설치
- [ ] 서버 실행 및 접속 확인
- [ ] Frontend에서 API 연동
- [ ] 의류 이미지 업로드
- [ ] 테스트: 사진 업로드 → 의류 선택 → 피팅 생성

---

## 🎯 다음 단계

1. **로컬 테스트**: 먼저 로컬에서 작동 확인
2. **Oracle 배포**: 테스트 완료 후 배포
3. **Frontend 연동**: API 호출 코드 추가
4. **실전 테스트**: 실제 고객 사진으로 테스트

준비되셨으면 시작하겠습니다! 🚀

현재 어디까지 진행할까요?
1. 로컬 테스트 먼저
2. 바로 Oracle Cloud 배포
3. Frontend API 연동부터
