/**
 * APL Fit - AI 가상 피팅 서비스 서버 (테스트 환경)
 * Oracle Cloud VM - 포트 3004
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// .env 파일 로드
require('dotenv').config({ path: path.join(__dirname, '../.env') });

console.log(`🌍 APL Fit 테스트 서버`);

const app = express();

// CORS 설정 - 모든 도메인 허용 (Cloudflare Pages, 로컬 테스트 등)
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// 미들웨어 설정 (로깅보다 먼저 설정해야 body를 파싱할 수 있음)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Body parser 작동 확인 미들웨어 (디버깅용)
app.use((req, res, next) => {
    if (req.method === 'POST' && req.path.includes('/api/')) {
        console.log('\n🔍 [디버깅] Body Parser 통과 후 상태:');
        console.log('   req.body 타입:', typeof req.body);
        console.log('   req.body 존재:', req.body ? 'Yes' : 'No');
        console.log('   req.body:', req.body ? JSON.stringify(req.body).substring(0, 200) : 'undefined');
    }
    next();
});

// 요청 로깅 미들웨어
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`\n📥 [${timestamp}] ${req.method} ${req.path}`);
    console.log(`   Origin: ${req.headers.origin || 'none'}`);
    console.log(`   Content-Type: ${req.headers['content-type'] || 'none'}`);
    console.log(`   Content-Length: ${req.headers['content-length'] || 'none'}`);
    if (req.method === 'POST' && req.path.includes('/api/')) {
        const bodyKeys = Object.keys(req.body || {});
        console.log(`   Body keys: ${bodyKeys.join(', ') || 'none'}`);
        if (bodyKeys.length === 0) {
            console.log('   ⚠️  경고: Body가 비어있습니다!');
            console.log('   Raw body:', req.body);
        }
    }
    next();
});

// 정적 파일 제공 (프론트엔드는 상위 폴더의 public)
app.use(express.static(path.join(__dirname, '../public')));

// MongoDB 연결
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI || MONGODB_URI === 'mongodb+srv://username:password@cluster.mongodb.net/aplfit') {
    console.warn('⚠️  MongoDB URI가 설정되지 않았습니다. .env 파일을 확인해주세요.');
    console.warn('⚠️  MongoDB 없이 서버를 시작합니다 (일부 기능 제한).');
} else {
    mongoose.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }).then(() => {
        console.log('✅ MongoDB 연결 성공');
        console.log('📦 데이터베이스:', mongoose.connection.db.databaseName);
    }).catch(err => {
        console.error('❌ MongoDB 연결 오류:', err.message);
        console.warn('⚠️  MongoDB 없이 서버를 계속 실행합니다.');
    });
}

// 라우터 등록
const imageRoutes = require('./routes/imageRoutes');
const fittingRoutes = require('./routes/fittingRoutes');
const customerRoutes = require('./routes/customerRoutes');
const sampleClothesRoutes = require('./routes/sampleClothesRoutes');

app.use('/api/images', imageRoutes);
app.use('/api/fitting', fittingRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/sample-clothes', sampleClothesRoutes);

// 루트 경로
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// 헬스 체크
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'APL Fit 서버가 정상 작동 중입니다',
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// 404 핸들러
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: '요청한 리소스를 찾을 수 없습니다.'
    });
});

// 에러 핸들러
app.use((err, req, res, next) => {
    console.error('서버 에러:', err);
    res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다.',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log('🚀 APL Fit 서버 시작!');
    console.log('📱 포트:', PORT);
    console.log('🌐 URL: http://localhost:' + PORT);
    console.log('📊 Health Check: http://localhost:' + PORT + '/api/health');
    console.log('='.repeat(60));
});

module.exports = app;
