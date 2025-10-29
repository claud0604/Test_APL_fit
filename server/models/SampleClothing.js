/**
 * 샘플 의류 MongoDB 모델
 */

const mongoose = require('mongoose');

const sampleClothingSchema = new mongoose.Schema({
    // S3 경로 정보
    s3Key: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    s3Url: {
        type: String,
        required: true
    },

    // 기본 정보
    name: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true,
        enum: ['outerwear', 'top', 'tops', 'pants', 'bottoms', 'one-piece', 'skirt'],
        index: true
    },

    // 스타일 정보
    color: {
        type: String,
        required: true,
        trim: true
    },
    style: {
        type: String,
        required: true,
        trim: true
    },
    length: {
        type: String,
        required: true,
        enum: ['short', 'short-mid', 'mid', 'normal', 'long']
    },

    // 타겟 고객 정보
    gender: {
        type: String,
        required: true,
        enum: ['male', 'female'],
        index: true
    },
    bodyShape: {
        type: String,
        required: true,
        enum: ['natural', 'straight', 'wave'],
        index: true
    },

    // AI 프롬프트
    clothingPrompt: {
        type: String,
        required: true,
        trim: true
    },

    // 통계
    fittingCount: {
        type: Number,
        default: 0
    },

    // 활성화 상태
    isActive: {
        type: Boolean,
        default: true,
        index: true
    }
}, {
    timestamps: true,
    collection: 'sample_clothes'  // 컬렉션 이름 명시
});

// 복합 인덱스: 성별 + 체형 + 카테고리 조회 최적화
sampleClothingSchema.index({ gender: 1, bodyShape: 1, category: 1 });

// 피팅 횟수 증가
sampleClothingSchema.methods.incrementFittingCount = async function() {
    this.fittingCount += 1;
    return await this.save();
};

const SampleClothing = mongoose.model('SampleClothing', sampleClothingSchema);

module.exports = SampleClothing;
