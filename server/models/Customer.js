/**
 * 고객 모델
 */

const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    // 고객 기본 정보 (최상단 배치)
    name: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    gender: {
        type: String,
        enum: ['male', 'female'],
        required: true,
        default: 'female'
    },

    // 고객 사진 정보 (S3) - 정면, 측면, 각도
    photos: {
        front: {
            url: String,           // S3 Signed URL
            s3Key: String,         // S3 객체 키
            fileName: String,      // 원본 파일명
            filePath: String       // S3 전체 경로
        },
        side: {
            url: String,
            s3Key: String,
            fileName: String,
            filePath: String
        },
        angle: {
            url: String,
            s3Key: String,
            fileName: String,
            filePath: String
        }
    },

    // 체형 정보 (고급 옵션)
    bodyShape: {
        type: String,
        enum: ['내추럴', '스트레이트', '웨이브', null],
        default: null
    },
    height: {
        type: String,
        enum: ['170미만', '170이상 180미만', '180이상', null],
        default: null
    },
    weight: {
        type: String,
        enum: ['60kg미만', '60~80', '80이상', null],
        default: null
    },

    // AI 프롬프트 정보
    prompts: {
        // 고객 사진에 대한 프롬프트
        customerPrompt: {
            type: String,
            default: ''
        },
        // 의류에 대한 프롬프트
        clothingPrompt: {
            type: String,
            default: ''
        },
        // 최종 합성 프롬프트 (고객 + 의류)
        finalPrompt: {
            type: String,
            default: ''
        }
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
customerSchema.index({ name: 1, phone: 1 }); // 이름+연락처 조합 인덱스
customerSchema.index({ createdAt: -1 });

// 컬렉션 이름을 명시적으로 'Cust_info'로 설정
const Customer = mongoose.model('Customer', customerSchema, 'Cust_info');

module.exports = Customer;
