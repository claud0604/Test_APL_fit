/**
 * 샘플 의류 정보 모델
 * Database: APL_FIT
 * Collection: sample_clothes_info
 */

const mongoose = require('mongoose');

const sampleClothesSchema = new mongoose.Schema({
    // 파일명 (번호)
    fileName: {
        type: String,
        required: true,
        unique: true
    },

    // S3 경로
    s3Key: {
        type: String,
        required: true
    },

    // S3 URL (Signed URL)
    url: {
        type: String
    },

    // 성별 (남성/여성)
    gender: {
        type: String,
        enum: ['male', 'female'],
        required: true
    },

    // 체형 스타일 (여성만 해당)
    bodyStyle: {
        type: String,
        enum: ['내추럴', '스트레이트', '웨이브', null],
        default: null
    },

    // 의류 카테고리 (스커트, 아우터, 원피스, 탑, 팬츠, tshirt 등)
    category: {
        type: String,
        required: true
    },

    // 의류 설명 (AI 프롬프트용)
    description: {
        type: String,
        default: ''
    },

    // 색상
    color: {
        type: String,
        default: ''
    },

    // 활성화 여부
    isActive: {
        type: Boolean,
        default: true
    },

    // 생성/수정 시간
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// 수정 시간 자동 업데이트
sampleClothesSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// APL_FIT 데이터베이스의 sample_clothes_info 컬렉션 사용
const conn = mongoose.createConnection(process.env.MONGODB_URI.replace('apl_fit_test', 'APL_FIT'));
const SampleClothes = conn.model('SampleClothes', sampleClothesSchema, 'sample_clothes_info');

module.exports = SampleClothes;
