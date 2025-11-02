# Cloudflare Pages - Oracle Cloud 연결 가이드

## ⚠️ 가장 중요한 3가지 (반드시 확인!)

### 1. 🔐 SSL 인증서 발급 순서
```
❌ 틀린 순서: Cloudflare Proxy ON 상태에서 certbot 실행 → 실패!
✅ 올바른 순서:
   1. Cloudflare DNS Proxy OFF (회색 구름)
   2. sudo certbot --nginx -d 도메인
   3. Cloudflare DNS Proxy ON (주황색 구름)
```

### 2. ☁️ Cloudflare Proxy 상태
- **반드시 Proxied (주황색 구름) ON**
- DNS only (회색)로 두면 Cloudflare 보안 기능 사용 불가

### 3. 🔒 SSL/TLS 모드
- **Full (strict)** 사용 (권장)
- Flexible은 임시 테스트용으로만 사용

---

## 📋 목차
1. [전체 연결 구조 개요](#전체-연결-구조-개요)
2. [Cloudflare Pages 설정](#cloudflare-pages-설정)
3. [Cloudflare DNS 설정](#cloudflare-dns-설정)
4. [Oracle Cloud 서버 설정](#oracle-cloud-서버-설정)
5. [Nginx 프록시 설정](#nginx-프록시-설정)
6. [프론트엔드-백엔드 연결](#프론트엔드-백엔드-연결)
7. [체크리스트](#체크리스트)
8. [⭐ 문제 해결 (526 에러 등)](#-문제-해결)

---

## 전체 연결 구조 개요

```
┌─────────────────────────────────────────────────────────────────────┐
│                         사용자 브라우저                              │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               │ HTTPS
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Cloudflare Pages                                  │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  도메인: apl-fit-test-connect.apls.kr                       │    │
│  │  파일: public/index.html, public/js/app.js                 │    │
│  │  API_URL: https://apl-fit-test-connect.apls.kr/api         │    │
│  └────────────────────────────────────────────────────────────┘    │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               │ HTTPS (Cloudflare Proxy)
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  Cloudflare DNS + Proxy                              │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  A 레코드: apl-fit-test-connect.apls.kr → 152.70.248.31   │    │
│  │  Proxy: ON (주황색 구름)                                    │    │
│  │  SSL/TLS: Full (Strict)                                    │    │
│  └────────────────────────────────────────────────────────────┘    │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               │ HTTPS
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Oracle Cloud Server (152.70.248.31)                     │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Nginx (Port 443)                                           │    │
│  │  server_name: apl-fit-test-connect.apls.kr                 │    │
│  │  SSL Certificate: Let's Encrypt                            │    │
│  │                                                             │    │
│  │  location /api {                                            │    │
│  │    proxy_pass http://localhost:3004/api;                   │    │
│  │  }                                                          │    │
│  └──────────────────────────┬──────────────────────────────────┘    │
│                             │                                        │
│                             │ HTTP                                   │
│                             ▼                                        │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Node.js + Express (Port 3004)                             │    │
│  │  Process: apl-fit-test (PM2)                               │    │
│  │  File: ~/Test_APL_fit/server/server.js                     │    │
│  │  MongoDB: apl.ydnkubt.mongodb.net/APL_FIT                  │    │
│  │  S3: apl-fit bucket                                        │    │
│  └────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Cloudflare Pages 설정

### 1. 프로젝트 생성
- **이름**: `apl-fit-test` (또는 원하는 이름)
- **프레임워크**: None (정적 사이트)
- **빌드 명령어**: 없음
- **빌드 출력 디렉토리**: `public`

### 2. Git 연결
```bash
# GitHub 저장소 연결
Repository: claud0604/APL_fit
Branch: main
```

### 3. 빌드 설정
```yaml
Build command: (비워둠)
Build output directory: public
Root directory: /
```

### 4. 환경 변수 (선택사항)
Cloudflare Pages 설정에서는 환경 변수가 필요 없습니다.
API_URL은 `public/js/app.js`에 하드코딩되어 있습니다.

### 5. Custom Domain 추가
- **도메인**: `apl-fit-test-connect.apls.kr`
- Cloudflare Pages → Settings → Custom domains → Add custom domain
- DNS 레코드가 자동으로 생성됩니다 (CNAME)

---

## Cloudflare DNS 설정

### 필수 DNS 레코드

#### 1. A 레코드 (백엔드 API 서버용)
```
Type: A
Name: apl-fit-test-connect
IPv4 address: 152.70.248.31
Proxy status: Proxied (주황색 구름 ☁️)
TTL: Auto
```

**중요**: Proxy를 **반드시 ON (Proxied)**으로 설정해야 합니다!
- Proxied (주황색 구름): Cloudflare가 SSL/TLS 처리 및 보안 기능 제공
- DNS only (회색 구름): 직접 연결, SSL 인증서 필요

#### 2. CNAME 레코드 (Cloudflare Pages용 - 자동 생성됨)
```
Type: CNAME
Name: apl-fit-test-connect
Target: apl-fit-test.pages.dev
Proxy status: Proxied (주황색 구름 ☁️)
TTL: Auto
```

### SSL/TLS 설정
Cloudflare Dashboard → SSL/TLS → Overview
```
SSL/TLS encryption mode: Full (strict)
```

**설명**:
- **Off**: SSL 없음 (사용 금지)
- **Flexible**: Cloudflare ↔ 사용자만 HTTPS (권장하지 않음)
- **Full**: Cloudflare ↔ 오라클 서버도 HTTPS (자체 서명 인증서 허용)
- **Full (strict)**: Cloudflare ↔ 오라클 서버 HTTPS + 유효한 인증서 필요 ⭐ **권장**

---

## Oracle Cloud 서버 설정

### 1. 방화벽 포트 개방 (OS 레벨)

```bash
# SSH로 Oracle Cloud VM 접속
ssh ubuntu@152.70.248.31

# firewalld로 포트 개방
sudo firewall-cmd --permanent --add-port=3004/tcp
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload

# 확인
sudo firewall-cmd --list-ports
```

**결과 예시**:
```
22/tcp 80/tcp 111/tcp 443/tcp 3001/tcp 3002/tcp 3003/tcp 3004/tcp 3005/tcp 8000/tcp
```

### 2. Oracle Cloud 인바운드 규칙 (OCI 콘솔)

Oracle Cloud Console 접속:
1. **Compute** → **Instances** → 인스턴스 선택
2. **Virtual Cloud Network** → VNIC 클릭
3. **Security Lists** → 보안 목록 선택
4. **Ingress Rules** (인바운드 규칙) 추가

#### 필수 인바운드 규칙:

| Source CIDR | Protocol | Source Port | Destination Port | Description |
|------------|----------|-------------|------------------|-------------|
| 0.0.0.0/0  | TCP      | All         | 22               | SSH         |
| 0.0.0.0/0  | TCP      | All         | 80               | HTTP        |
| 0.0.0.0/0  | TCP      | All         | 443              | HTTPS       |
| 0.0.0.0/0  | TCP      | All         | 3004             | APL Fit Test|
| 0.0.0.0/0  | TCP      | All         | 3005             | APL Fit Prod|

**주의**: Cloudflare Proxy를 사용하는 경우, 실제로는 Cloudflare IP만 허용해도 되지만, 간단하게 `0.0.0.0/0` 사용.

### 3. Node.js 서버 설정

#### 디렉토리 구조
```bash
/home/ubuntu/Test_APL_fit/
├── .env                     # 환경 변수
├── public/                  # 프론트엔드 (Cloudflare에서 호스팅)
└── server/                  # 백엔드
    ├── server.js
    ├── ecosystem.config.js  # PM2 설정
    └── ...
```

#### .env 파일 설정
```bash
# 포트
PORT=3004

# MongoDB
MONGODB_URI=mongodb+srv://mychicke:...@apl.ydnkubt.mongodb.net/APL_FIT
DB_NAME=APL_FIT

# AWS S3
AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY
AWS_REGION=ap-northeast-2
AWS_S3_BUCKET=apl-fit

# Replicate AI
REPLICATE_API_TOKEN=YOUR_REPLICATE_API_TOKEN
```

#### PM2로 서버 실행
```bash
cd /home/ubuntu/Test_APL_fit/server
npm install

# PM2로 시작
pm2 start ecosystem.config.js --only apl-fit-test

# 부팅 시 자동 시작
pm2 startup
pm2 save

# 상태 확인
pm2 list
pm2 logs apl-fit-test
```

---

## Nginx 프록시 설정

### 1. Nginx 설치
```bash
sudo apt update
sudo apt install nginx -y
```

### 2. Nginx 설정 파일 생성

파일: `/etc/nginx/sites-available/apl-fit-test-connect`

```nginx
server {
    listen 80;
    server_name apl-fit-test-connect.apls.kr;

    # HTTP → HTTPS 리다이렉트
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name apl-fit-test-connect.apls.kr;

    # SSL 인증서 (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/apl-fit-test-connect.apls.kr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/apl-fit-test-connect.apls.kr/privkey.pem;

    # SSL 설정
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # 로그
    access_log /var/log/nginx/apl-fit-test-access.log;
    error_log /var/log/nginx/apl-fit-test-error.log;

    # API 요청 프록시 (백엔드로 전달)
    location /api {
        proxy_pass http://localhost:3004/api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # CORS 헤더 (필요시)
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;

        # Timeout 설정 (AI 처리 시간 고려)
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    # 정적 파일 (프론트엔드는 Cloudflare Pages에서 제공)
    # 이 부분은 사용하지 않지만, 백업용으로 남겨둠
    location / {
        root /home/ubuntu/Test_APL_fit/public;
        try_files $uri $uri/ /index.html;
    }
}
```

### 3. Nginx 설정 활성화
```bash
# 심볼릭 링크 생성
sudo ln -s /etc/nginx/sites-available/apl-fit-test-connect /etc/nginx/sites-enabled/

# 설정 테스트
sudo nginx -t

# Nginx 재시작
sudo systemctl restart nginx
```

### 4. Let's Encrypt SSL 인증서 발급
```bash
# Certbot 설치
sudo apt install certbot python3-certbot-nginx -y

# SSL 인증서 발급 (Nginx 자동 설정)
sudo certbot --nginx -d apl-fit-test-connect.apls.kr

# 인증서 자동 갱신 설정 (cron)
sudo certbot renew --dry-run
```

**중요**: Certbot 실행 전에 Cloudflare DNS의 Proxy를 잠시 **OFF (DNS only)**로 변경해야 합니다!
- 이유: Let's Encrypt가 직접 오라클 서버에 접속해서 도메인 소유권을 확인해야 하기 때문
- 인증서 발급 후 다시 **ON (Proxied)**로 변경

---

## 프론트엔드-백엔드 연결

### 프론트엔드 설정 (public/js/app.js)

```javascript
// Line 5
const API_URL = 'https://apl-fit-test-connect.apls.kr/api';
console.log('🌐 API URL:', API_URL);
```

**중요**:
- ✅ `https://` 사용 (Cloudflare Proxy 덕분에 HTTPS 자동 지원)
- ✅ `/api` 경로 포함
- ❌ 포트 번호 사용 안 함 (Nginx가 내부적으로 3004 포트로 전달)

### API 호출 예시 (프론트엔드)

```javascript
// 예시: 고객 사진 업로드
const formData = new FormData();
formData.append('frontPhoto', frontPhotoFile);
formData.append('sidePhoto', sidePhotoFile);

const response = await fetch(`${API_URL}/images/upload-customer`, {
    method: 'POST',
    body: formData
});

const result = await response.json();
console.log('업로드 결과:', result);
```

### 백엔드 응답 (server.js)

```javascript
// Line 18-24: CORS 설정
app.use(cors({
    origin: '*',  // Cloudflare Pages에서 접근 허용
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
```

---

## 체크리스트

### ✅ Cloudflare 설정
- [ ] Cloudflare Pages 프로젝트 생성
- [ ] Custom Domain 추가: `apl-fit-test-connect.apls.kr`
- [ ] Git 저장소 연결
- [ ] 빌드 설정: `public` 폴더

### ✅ Cloudflare DNS 설정
- [ ] A 레코드: `apl-fit-test-connect.apls.kr` → `152.70.248.31`
- [ ] Proxy 상태: **Proxied (주황색 구름)** ⭐
- [ ] SSL/TLS 모드: **Full (strict)** ⭐

### ✅ Oracle Cloud 방화벽
- [ ] OS 방화벽 (firewalld): 포트 80, 443, 3004 개방
- [ ] OCI 인바운드 규칙: 포트 80, 443, 3004 추가

### ✅ Nginx 설정
- [ ] Nginx 설치
- [ ] 설정 파일 생성: `/etc/nginx/sites-available/apl-fit-test-connect`
- [ ] 심볼릭 링크 생성: `/etc/nginx/sites-enabled/`
- [ ] **Cloudflare DNS Proxy를 OFF로 변경** (회색 구름)
- [ ] Let's Encrypt SSL 인증서 발급 (`sudo certbot --nginx -d 도메인`)
- [ ] **Cloudflare DNS Proxy를 다시 ON으로 변경** (주황색 구름)
- [ ] Nginx 재시작

### ✅ Node.js 백엔드
- [ ] `.env` 파일 설정 (PORT=3004)
- [ ] npm install 실행
- [ ] PM2로 서버 시작: `pm2 start ecosystem.config.js --only apl-fit-test`
- [ ] PM2 자동 시작 설정: `pm2 startup && pm2 save`

### ✅ 프론트엔드 코드
- [ ] `public/js/app.js`의 API_URL 확인: `https://apl-fit-test-connect.apls.kr/api`
- [ ] CORS 설정 확인

### ✅ 연결 테스트
- [ ] 브라우저에서 프론트엔드 접속: `https://apl-fit-test-connect.apls.kr`
- [ ] Health Check API 호출: `https://apl-fit-test-connect.apls.kr/api/health`
- [ ] 개발자 도구에서 네트워크 탭 확인 (API 호출 성공 여부)

---

## 🐛 문제 해결

### 0. "526 Invalid SSL Certificate" 에러 ⭐⭐⭐ (가장 흔한 에러)

**증상**:
- Cloudflare에서 526 에러 발생
- 또는 프론트엔드에서 API 호출 시 CORS 에러 발생
- 브라우저 콘솔에 `Access-Control-Allow-Origin: *` 등장

**원인**:
Cloudflare SSL/TLS 모드가 **Full (strict)**인데, 백엔드 서버에 **유효한 SSL 인증서가 없음**

**연결 흐름**:
```
Cloudflare (HTTPS) → 백엔드 서버 (HTTP만 열려있음)
                   ❌ SSL 인증서 없음
```

---

#### ✅ 해결 방법 1: Let's Encrypt SSL 인증서 설치 (권장)

**Step 1: Cloudflare DNS Proxy를 잠시 OFF로 변경**

이유: Let's Encrypt가 직접 오라클 서버에 접속해서 도메인 소유권을 확인해야 하기 때문

1. Cloudflare Dashboard 로그인
2. **DNS** 메뉴 이동
3. A 레코드 찾기 (예: `apl-fit-test-connect.apls.kr`)
4. **주황색 구름 ☁️ 클릭** → **회색 구름으로 변경** (DNS only)
5. 1-2분 대기 (DNS 전파)

**Step 2: SSL 인증서 발급**

```bash
# Oracle Cloud VM에 SSH 접속
ssh ubuntu@152.70.248.31

# Certbot 설치 (아직 안 했다면)
sudo apt update
sudo apt install certbot python3-certbot-nginx -y

# SSL 인증서 발급 (Nginx 자동 설정)
sudo certbot --nginx -d apl-fit-test-connect.apls.kr

# 이메일 입력 (선택)
# 약관 동의 (Y)
# Nginx 자동 재시작 (선택)
```

**Step 3: Cloudflare DNS Proxy를 다시 ON으로 변경**

1. Cloudflare Dashboard → DNS
2. A 레코드의 **회색 구름 클릭** → **주황색 구름으로 변경** (Proxied)
3. 완료!

**Step 4: 확인**

```bash
# SSL 인증서 확인
sudo certbot certificates

# Nginx 설정 확인
sudo nginx -t

# Nginx 재시작
sudo systemctl restart nginx

# 브라우저에서 테스트
https://apl-fit-test-connect.apls.kr/api/health
```

**결과**:
```
✅ Cloudflare (HTTPS) → Nginx (HTTPS 443) → Node.js (HTTP 3004)
```

---

#### 🟡 해결 방법 2: Cloudflare SSL 모드를 Flexible로 변경 (빠른 임시 해결)

**장점**: 빠르게 해결 가능
**단점**: 보안 취약 (Cloudflare ↔ 백엔드 간 HTTP 사용)

1. Cloudflare Dashboard → **SSL/TLS** 메뉴
2. **Overview** 탭
3. SSL/TLS 암호화 모드를 **Flexible**로 변경

**결과**:
```
Cloudflare (HTTPS) → 백엔드 (HTTP 80)
⚠️ 중간 구간이 암호화되지 않음
```

**주의**:
- 프로덕션 환경에서는 **권장하지 않음**
- 빠른 테스트용으로만 사용
- 반드시 나중에 방법 1로 변경할 것

---

#### 📋 SSL 모드 비교

| 모드 | Cloudflare → 백엔드 | 백엔드 SSL 필요 | 보안 | 권장 |
|------|-------------------|---------------|------|------|
| **Off** | HTTP | ❌ | ❌ | ❌ |
| **Flexible** | HTTP | ❌ | 🟡 | ⚠️ 임시만 |
| **Full** | HTTPS | ✅ (자체 서명 OK) | 🟢 | 🟢 |
| **Full (strict)** | HTTPS | ✅ (유효한 인증서) | 🟢🟢 | ⭐ 권장 |

---

#### 🔍 526 에러 디버깅 체크리스트

- [ ] Cloudflare SSL/TLS 모드가 **Full (strict)**인가?
- [ ] 백엔드 Nginx가 **443 포트**를 열고 있나?
- [ ] Nginx 설정에 **ssl_certificate**가 있나?
- [ ] Let's Encrypt 인증서가 **만료되지 않았나**?
- [ ] 방화벽에서 **443 포트**가 열려있나?

```bash
# 인증서 만료일 확인
sudo certbot certificates

# Nginx SSL 설정 확인
sudo nginx -T | grep ssl_certificate

# 443 포트 확인
sudo lsof -i :443

# 방화벽 확인
sudo firewall-cmd --list-ports
```

---

### 1. "502 Bad Gateway" 에러
**원인**: Nginx가 백엔드 서버(3004 포트)에 연결할 수 없음

**해결**:
```bash
# PM2 서버 상태 확인
pm2 list
pm2 logs apl-fit-test

# 서버가 3004 포트에서 실행 중인지 확인
sudo lsof -i :3004

# 서버 재시작
pm2 restart apl-fit-test
```

### 2. "CORS 에러"
**원인**: 백엔드에서 Cloudflare Pages 도메인을 허용하지 않음

**해결**:
```javascript
// server/server.js
app.use(cors({
    origin: '*',  // 모든 도메인 허용 (또는 특정 도메인만 허용)
}));
```

### 3. SSL 인증서 오류
**원인**: Let's Encrypt 인증서가 제대로 발급되지 않음

**해결**:
```bash
# Cloudflare DNS Proxy를 OFF로 변경
# Cloudflare Dashboard → DNS → Proxy status를 "DNS only"로 변경

# 인증서 재발급
sudo certbot --nginx -d apl-fit-test-connect.apls.kr

# 발급 후 Cloudflare Proxy를 다시 ON으로 변경
```

### 4. API 호출이 안 됨 (네트워크 에러)
**원인**: Nginx 설정에서 `/api` 경로가 프록시되지 않음

**해결**:
```bash
# Nginx 설정 확인
sudo nginx -t

# Nginx 재시작
sudo systemctl restart nginx

# Nginx 로그 확인
sudo tail -f /var/log/nginx/apl-fit-test-error.log
```

### 5. 방화벽 문제
**원인**: OCI 인바운드 규칙이 제대로 설정되지 않음

**해결**:
```bash
# Oracle Cloud Console에서 인바운드 규칙 재확인
# 포트 80, 443, 3004가 0.0.0.0/0에서 접근 가능한지 확인

# OS 방화벽 확인
sudo firewall-cmd --list-all
```

---

## 📝 요약

### 핵심 포인트

1. **Cloudflare Pages**: 프론트엔드 호스팅 (정적 파일)
2. **Cloudflare DNS**: A 레코드로 오라클 서버 IP 연결, **Proxy ON** ⭐
3. **Cloudflare SSL**: Full (strict) 모드 사용 ⭐
4. **Let's Encrypt 인증서**: 백엔드에 SSL 인증서 설치 필수 ⭐⭐⭐
   - **중요**: Proxy OFF → 인증서 발급 → Proxy ON 순서로!
5. **Nginx**: HTTPS 리버스 프록시 (443 포트), `/api` → `localhost:3004`로 전달
6. **Node.js**: PM2로 포트 3004에서 실행 (HTTP)
7. **프론트엔드 API URL**: `https://apl-fit-test-connect.apls.kr/api` (포트 번호 없음)

### 연결 흐름

```
사용자 → Cloudflare Pages (HTML/JS)
      → Cloudflare Proxy (HTTPS)
      → Oracle Cloud Nginx (443)
      → Node.js Express (3004)
      → MongoDB / S3
```

이 문서를 참고하여 **앞으로 새로운 프로젝트를 Cloudflare-Oracle 구조로 배포**할 때 한 번에 성공하실 수 있습니다!