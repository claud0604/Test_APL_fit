/**
 * 가상 피팅 기록 모델
 */

const mongoose = require('mongoose');

const fittingRecordSchema = new mongoose.Schema({
    // 고객 정보
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },

    // 고객 사진 (S3)
    customerPhoto: {
        url: {
            type: String,
            required: true
        },
        s3Key: {
            type: String,
            required: true
        }
    },

    // 의류 정보
    clothingItem: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ClothingItem'
        // required 제거 - 샘플 의류는 ObjectId 없음
    },

    // 의류 이미지 URL (샘플 의류용)
    clothingImageUrl: {
        type: String
    },

    // 합성 결과 (S3)
    resultImage: {
        url: String,
        s3Key: String
    },

    // 피팅 설정
    settings: {
        angle: {
            type: String,
            enum: ['front', 'side', 'diagonal'],
            default: 'front'
        },
        aiModel: {
            type: String,
            default: 'replicate-idm-vton'
        },
        processingTime: Number  // milliseconds
    },

    // 상태
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    },

    // 에러 정보 (실패 시)
    error: {
        message: String,
        code: String
    },

    // 피드백
    rating: {
        type: Number,
        min: 1,
        max: 5
    },
    feedback: String,

    // 메타데이터
    createdAt: {
        type: Date,
        default: Date.now
    },
    completedAt: Date
}, {
    timestamps: true
});

// 인덱스
fittingRecordSchema.index({ customer: 1, createdAt: -1 });
fittingRecordSchema.index({ status: 1 });
fittingRecordSchema.index({ createdAt: -1 });

// 피팅 완료 메서드
fittingRecordSchema.methods.complete = function(resultImageUrl, resultImageS3Key) {
    this.status = 'completed';
    this.resultImage = {
        url: resultImageUrl,
        s3Key: resultImageS3Key
    };
    this.completedAt = new Date();
    return this.save();
};

// 피팅 실패 메서드
fittingRecordSchema.methods.fail = function(errorMessage, errorCode) {
    this.status = 'failed';
    this.error = {
        message: errorMessage,
        code: errorCode
    };
    return this.save();
};

const FittingRecord = mongoose.model('FittingRecord', fittingRecordSchema);

module.exports = FittingRecord;
