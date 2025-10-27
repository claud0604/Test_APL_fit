/**
 * 체형 정보 모델
 * Database: APL_FIT
 * Collection: body_shape_info
 */

const mongoose = require('mongoose');

const bodyShapeSchema = new mongoose.Schema({
    // 체형 타입
    shapeType: {
        type: String,
        enum: ['내추럴', '스트레이트', '웨이브'],
        required: true,
        unique: true
    },

    // 체형 설명
    description: {
        type: String,
        default: ''
    },

    // 체형 특징 (AI 프롬프트용)
    characteristics: {
        type: [String],
        default: []
    },

    // 영문 표현 (AI 프롬프트용)
    englishName: {
        type: String,
        default: ''
    },

    // 추천 의류 스타일
    recommendedStyles: {
        type: [String],
        default: []
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
bodyShapeSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// APL_FIT 데이터베이스의 body_shape_info 컬렉션 사용
const conn = mongoose.createConnection(process.env.MONGODB_URI.replace('apl_fit_test', 'APL_FIT'));
const BodyShape = conn.model('BodyShape', bodyShapeSchema, 'body_shape_info');

module.exports = BodyShape;
