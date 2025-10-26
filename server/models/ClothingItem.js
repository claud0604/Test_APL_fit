/**
 * 의류 아이템 모델
 */

const mongoose = require('mongoose');

const clothingItemSchema = new mongoose.Schema({
    // 기본 정보
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },

    // 이미지 정보 (S3)
    image: {
        url: {
            type: String,
            required: true
        },
        s3Key: {
            type: String,
            required: true
        },
        thumbnailUrl: String
    },

    // 카테고리
    category: {
        type: String,
        required: true,
        enum: ['top', 'bottom', 'dress', 'outer', 'accessory', 'shoes'],
        default: 'top'
    },

    // 색상 정보
    color: {
        type: String,
        required: true
    },
    hexColor: {
        type: String,
        match: /^#[0-9A-Fa-f]{6}$/
    },

    // 스타일 및 시즌
    style: [{
        type: String,
        enum: ['casual', 'formal', 'business', 'sporty', 'chic', 'vintage']
    }],
    season: [{
        type: String,
        enum: ['spring', 'summer', 'autumn', 'winter']
    }],

    // 성별
    gender: {
        type: String,
        enum: ['male', 'female', 'unisex'],
        default: 'unisex'
    },

    // 가격 및 브랜드
    price: Number,
    brand: String,

    // 재고 및 상태
    isActive: {
        type: Boolean,
        default: true
    },
    stock: {
        type: Number,
        default: 0
    },

    // 외부 링크
    productUrl: String,

    // 통계
    viewCount: {
        type: Number,
        default: 0
    },
    fittingCount: {
        type: Number,
        default: 0
    },

    // 태그
    tags: [String],

    // 메타데이터
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// 인덱스
clothingItemSchema.index({ category: 1, isActive: 1 });
clothingItemSchema.index({ gender: 1 });
clothingItemSchema.index({ tags: 1 });
clothingItemSchema.index({ createdAt: -1 });

// 조회수 증가 메서드
clothingItemSchema.methods.incrementViewCount = function() {
    this.viewCount += 1;
    return this.save();
};

// 피팅 횟수 증가 메서드
clothingItemSchema.methods.incrementFittingCount = function() {
    this.fittingCount += 1;
    return this.save();
};

const ClothingItem = mongoose.model('ClothingItem', clothingItemSchema);

module.exports = ClothingItem;
