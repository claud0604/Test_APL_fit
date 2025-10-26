# Oracle Cloud 배포 가이드

## 🎯 환경 구성

### 포트 설정
- **테스트 서버**: 포트 3004 (`apl-fit-test`)
- **프로덕션 서버**: 포트 3005 (`apl-fit-prod`)

### 데이터베이스 분리
- **테스트**: `apl_fit_test` (MongoDB)
- **프로덕션**: `apl_fit` (MongoDB)

---

## 📋 사전 준비

### 1. Oracle VM 방화벽 포트 개방

```bash
# 테스트 서버 포트 (3004)
sudo firewall-cmd --permanent --add-port=3004/tcp
sudo firewall-cmd --reload

# 프로덕션 서버 포트 (3005)
sudo firewall-cmd --permanent --add-port=3005/tcp
sudo firewall-cmd --reload

# 확인
sudo firewall-cmd --list-ports
```

### 2. Oracle Cloud 인그레스 규칙 추가

Oracle Cloud Console에서:
1. 인스턴스 → VNIC → 보안 목록
2. 인그레스 규칙 추가:
   - 포트 3004 (TCP)
   - 포트 3005 (TCP)

---

## 🚀 배포 방법

### 방법 1: Git을 통한 배포 (권장)

#### Step 1: Git 저장소 설정 (로컬)
```bash
cd /Users/kimvstiger/KimVsTiger_code/APL_fit
git init
git add .
git commit -m "Initial commit: APL Fit backend and frontend"

# GitHub 등 원격 저장소에 푸시
git remote add origin <your-repo-url>
git push -u origin main
```

#### Step 2: Oracle VM에서 클론
```bash
# Oracle VM SSH 접속
ssh your-user@your-oracle-ip

# 프로젝트 디렉토리 생성
mkdir -p ~/projects
cd ~/projects

# Git 클론
git clone <your-repo-url> APL_fit
cd APL_fit
```

#### Step 3: 환경 설정 파일 업로드
```bash
# 로컬에서 Oracle VM으로 환경 파일 전송
scp .env.test your-user@your-oracle-ip:~/projects/APL_fit/
scp .env.production your-user@your-oracle-ip:~/projects/APL_fit/
```

#### Step 4: 의존성 설치
```bash
cd ~/projects/APL_fit/server
npm install
```

#### Step 5: PM2로 서버 시작
```bash
# PM2 설치 (전역)
npm install -g pm2

# 테스트 서버 시작
pm2 start ecosystem.config.js --only apl-fit-test

# 프로덕션 서버 시작
pm2 start ecosystem.config.js --only apl-fit-prod

# 또는 둘 다 시작
pm2 start ecosystem.config.js

# 부팅 시 자동 시작 설정
pm2 startup
pm2 save
```

---

### 방법 2: 직접 파일 전송

#### Step 1: 파일 압축 (로컬)
```bash
cd /Users/kimvstiger/KimVsTiger_code
tar -czf apl_fit.tar.gz APL_fit/ --exclude='node_modules' --exclude='.git'
```

#### Step 2: Oracle VM으로 전송
```bash
scp apl_fit.tar.gz your-user@your-oracle-ip:~/
```

#### Step 3: Oracle VM에서 압축 해제
```bash
ssh your-user@your-oracle-ip
cd ~
tar -xzf apl_fit.tar.gz
cd APL_fit
```

#### Step 4: 나머지는 방법 1의 Step 3-5와 동일

---

## 📊 PM2 관리 명령어

### 서버 상태 확인
```bash
pm2 list
pm2 status
```

### 로그 확인
```bash
# 전체 로그
pm2 logs

# 특정 서버 로그
pm2 logs apl-fit-test
pm2 logs apl-fit-prod

# 에러 로그만
pm2 logs --err
```

### 서버 재시작
```bash
# 테스트 서버
pm2 restart apl-fit-test

# 프로덕션 서버
pm2 restart apl-fit-prod

# 모두 재시작
pm2 restart all
```

### 서버 중지
```bash
pm2 stop apl-fit-test
pm2 stop apl-fit-prod
```

### 서버 삭제
```bash
pm2 delete apl-fit-test
pm2 delete apl-fit-prod
```

### 모니터링
```bash
pm2 monit
```

---

## 🔧 프론트엔드 설정

### Cloudflare Pages 환경변수 설정

프론트엔드가 올바른 백엔드 API를 호출하도록 설정:

#### 테스트 환경
- 변수명: `API_URL`
- 값: `http://YOUR_ORACLE_IP:3004/api`

#### 프로덕션 환경
- 변수명: `API_URL`
- 값: `http://YOUR_ORACLE_IP:3005/api`

또는 `public/js/app.js`에서 `YOUR_ORACLE_IP`를 실제 IP로 수정:

```javascript
// Line 16-20
if (hostname.includes('test') || window.location.port === '3004') {
    return 'http://123.456.789.012:3004/api';  // 실제 IP 입력
}

return 'http://123.456.789.012:3005/api';  // 실제 IP 입력
```

---

## ✅ 배포 확인

### 1. 서버 작동 확인
```bash
# 테스트 서버
curl http://localhost:3004/api/health

# 프로덕션 서버
curl http://localhost:3005/api/health
```

### 2. 외부 접근 확인
```bash
# 로컬에서
curl http://YOUR_ORACLE_IP:3004/api/health
curl http://YOUR_ORACLE_IP:3005/api/health
```

### 3. 프론트엔드 접근
- 브라우저에서 `http://YOUR_ORACLE_IP:3004` (테스트)
- 브라우저에서 `http://YOUR_ORACLE_IP:3005` (프로덕션)

---

## 🔒 보안 권장사항

### 1. Nginx 리버스 프록시 설정 (선택사항)

```nginx
# /etc/nginx/sites-available/apl-fit-test
server {
    listen 80;
    server_name test.yourdomain.com;

    location /api {
        proxy_pass http://localhost:3004/api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        proxy_pass http://localhost:3004;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 2. HTTPS 설정 (Let's Encrypt)
```bash
sudo certbot --nginx -d test.yourdomain.com
sudo certbot --nginx -d yourdomain.com
```

---

## 🐛 문제 해결

### 포트가 이미 사용 중
```bash
# 포트 사용 중인 프로세스 확인
sudo lsof -i :3004
sudo lsof -i :3005

# 프로세스 종료
sudo kill -9 <PID>
```

### MongoDB 연결 실패
- `.env.test` / `.env.production` 파일의 `MONGODB_URI` 확인
- MongoDB Atlas에서 Oracle VM IP를 화이트리스트에 추가

### S3 업로드 실패
- AWS 자격 증명 확인
- S3 버킷 권한 확인

---

## 📝 업데이트 방법

### Git 사용 시
```bash
cd ~/projects/APL_fit
git pull origin main
cd server
npm install  # 새로운 패키지가 추가된 경우
pm2 restart apl-fit-test
pm2 restart apl-fit-prod
```

### 수동 업데이트 시
1. 로컬에서 파일 압축
2. Oracle VM으로 전송
3. 압축 해제 및 덮어쓰기
4. PM2 재시작

---

## 📞 현재 포트 사용 현황

```
Oracle VM 포트:
- 22: SSH
- 80: HTTP (Nginx)
- 443: HTTPS (Nginx)
- 111: RPC
- 3001: Docker 컨테이너
- 3002: Docker 컨테이너
- 3003: Node.js 애플리케이션
- 3004: APL Fit 테스트 서버 ⭐ (새로 추가)
- 3005: APL Fit 프로덕션 서버 ⭐ (새로 추가)
- 8000: Docker 컨테이너
```
