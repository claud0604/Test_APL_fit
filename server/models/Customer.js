/**
 * 고객 모델
 */

const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    // 고객 기본 정보
    name: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    phone: {
        type: String,
        trim: true
    },

    // 고객 사진 정보 (S3)
    photo: {
        url: String,           // S3 URL
        s3Key: String,         // S3 객체 키
        thumbnailUrl: String   // 썸네일 URL
    },

    // 피팅 기록
    fittingHistory: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FittingRecord'
    }],

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
customerSchema.index({ email: 1 });
customerSchema.index({ phone: 1 });
customerSchema.index({ createdAt: -1 });

const Customer = mongoose.model('Customer', customerSchema);

module.exports = Customer;
