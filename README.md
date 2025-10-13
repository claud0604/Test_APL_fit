# APL Fit 🎽

AI 기반 가상 피팅 서비스 - 당신의 사진에 옷을 입혀보세요!

## 저장소 정보

### 🧪 테스트 환경 (개발/테스트용)
- **저장소**: https://github.com/claud0604/Test_APL_fit
- **용도**: 신규 기능 개발, 코드 수정 테스트, 버그 수정 검증
- **배포**: Cloudflare Pages (자동 배포)
- **워크플로우**:
  1. 모든 코드 변경사항은 먼저 이 저장소에 푸시
  2. 테스트 환경에서 기능 검증
  3. 문제 없음 확인 후 정식 서비스로 배포

```bash
# 테스트 저장소 클론
git clone https://github.com/claud0604/Test_APL_fit.git

# 또는 원격 저장소 추가
git remote add test https://github.com/claud0604/Test_APL_fit.git

# 테스트 저장소에 푸시
git push test main
```

### 🚀 정식 서비스 (프로덕션)
- **저장소**: https://github.com/claud0604/APL_fit
- **용도**: 실제 고객 및 서비스 제공용
- **배포**: Cloudflare Pages (프로덕션 환경)
- **워크플로우**:
  1. 테스트 환경에서 검증 완료된 코드만 배포
  2. 안정적이고 완성된 기능만 포함
  3. 고객이 실제로 사용하는 서비스

```bash
# 정식 저장소 클론
git clone https://github.com/claud0604/APL_fit.git

# 또는 원격 저장소 추가
git remote add production https://github.com/claud0604/APL_fit.git

# 정식 저장소에 푸시 (테스트 완료 후에만!)
git push production main
```

### 📋 배포 프로세스

1. **개발 단계**
   ```bash
   # 로컬에서 개발
   git add .
   git commit -m "Add new feature"

   # 테스트 저장소에 푸시
   git push test main
   ```

2. **테스트 단계**
   - Test_APL_fit 배포 URL에서 기능 확인
   - 다양한 브라우저/디바이스에서 테스트
   - 버그 발견 시 수정 후 다시 테스트 저장소에 푸시

3. **프로덕션 배포 단계** (개발자가 승인한 경우에만)
   ```bash
   # 테스트 완료 확인 후
   git push production main
   ```

4. **긴급 롤백** (문제 발생 시)
   ```bash
   # 이전 버전으로 되돌리기
   git revert HEAD
   git push production main
   ```

### ⚠️ 중요 사항
- **절대 테스트 없이 프로덕션에 직접 배포하지 않습니다**
- 모든 변경사항은 반드시 Test_APL_fit에서 먼저 검증
- 프로덕션 배포는 개발자의 명시적 승인 후에만 진행
- 고객 데이터가 있는 경우 더욱 신중하게 배포

## 개요

APL Fit은 고객의 전신 사진과 의류 이미지를 활용하여 실제로 옷을 입은 것처럼 보여주는 AI 기반 가상 피팅 서비스입니다. Nanobanana 프레임워크를 사용하여 빠르고 효율적인 서비스를 제공합니다.

## 주요 기능

### 1. 다각도 사진 업로드
- **정면 사진**: 기본 피팅 뷰
- **측면 사진**: 옆모습 확인 (선택사항)
- **대각선 사진**: 다양한 각도 확인 (선택사항)

### 2. 의류 이미지 업로드
- 원하는 의류 사진을 업로드
- 다양한 이미지 포맷 지원 (JPG, PNG, WEBP)

### 3. AI 가상 피팅
- 고객 체형에 맞춘 자연스러운 합성
- 포즈 감지 및 의류 매칭
- 실시간 결과 프리뷰

### 4. 결과 저장 및 공유
- 피팅 결과 이미지 다운로드
- 히스토리 관리

## 기술 스택

- **프레임워크**: Nanobanana
- **백엔드**: Python + Flask
- **AI/ML**:
  - OpenCV - 이미지 처리
  - MediaPipe - 포즈 감지
  - PIL/Pillow - 이미지 조작
- **프론트엔드**: HTML5, CSS3, JavaScript
- **데이터베이스**: SQLite (초기) / PostgreSQL (확장)

## 프로젝트 구조

```
apl_fit/
├── README.md                 # 프로젝트 설명서
├── HISTORY.md               # 개발 히스토리
├── requirements.txt         # Python 의존성
├── app.py                   # 메인 애플리케이션
├── config.py                # 설정 파일
├── static/                  # 정적 파일
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── app.js
│   └── uploads/             # 업로드된 이미지
│       ├── customers/       # 고객 사진
│       └── clothes/         # 의류 사진
├── templates/               # HTML 템플릿
│   ├── index.html
│   ├── upload.html
│   └── result.html
├── models/                  # AI 모델
│   └── fitting_engine.py
└── utils/                   # 유틸리티 함수
    ├── image_processing.py
    └── pose_detection.py
```

## 설치 방법

### 1. 저장소 클론 (또는 폴더 생성)

```bash
cd apl_fit
```

### 2. 가상 환경 생성 및 활성화

```bash
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

### 3. 의존성 설치

```bash
pip install -r requirements.txt
```

### 4. 환경 변수 설정

```bash
cp .env.example .env
# .env 파일을 편집하여 필요한 설정 입력
```

### 5. 애플리케이션 실행

```bash
python app.py
```

브라우저에서 `http://localhost:5000` 접속

## 사용 방법

### 1. 고객 사진 업로드
1. 메인 페이지에서 "고객 사진 업로드" 버튼 클릭
2. 정면 전신 사진 선택 (필수)
3. 측면/대각선 사진 추가 (선택사항)

### 2. 의류 선택
1. "의류 업로드" 버튼 클릭
2. 입혀보고 싶은 의류 이미지 선택

### 3. 피팅 실행
1. "가상 피팅 시작" 버튼 클릭
2. AI가 자동으로 피팅 수행
3. 결과 확인 및 다운로드

## 개발 로드맵

### Phase 1: MVP (현재)
- [x] 프로젝트 구조 설계
- [ ] 기본 이미지 업로드 기능
- [ ] 간단한 오버레이 피팅
- [ ] 정면 뷰 지원

### Phase 2: AI 통합
- [ ] 포즈 감지 알고리즘
- [ ] 실제 가상 피팅 엔진
- [ ] 다각도 뷰 지원
- [ ] 의류 자동 크기 조절

### Phase 3: 고도화
- [ ] 실시간 프리뷰
- [ ] 의류 카탈로그
- [ ] 사용자 프로필
- [ ] 피팅 히스토리

### Phase 4: 확장
- [ ] 모바일 최적화
- [ ] AR 기능
- [ ] 소셜 공유
- [ ] 쇼핑몰 연동 API

## 기여 방법

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.

## 연락처

프로젝트 관리자: APL Fit Team

## 감사의 말

- Nanobanana 프레임워크
- OpenCV 커뮤니티
- MediaPipe 팀
