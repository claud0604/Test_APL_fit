/**
 * 가상 피팅 API 라우터
 */

const express = require('express');
const router = express.Router();
const fittingService = require('../services/fittingService');
const FittingRecord = require('../models/FittingRecord');
const Customer = require('../models/Customer');
const ClothingItem = require('../models/ClothingItem');

/**
 * 가상 피팅 생성
 * POST /api/fitting/create
 */
router.post('/create', async (req, res) => {
    try {
        const {
            customerId,
            customerPhotoUrl,
            clothingItemId,
            options
        } = req.body;

        if (!customerPhotoUrl || !clothingItemId) {
            return res.status(400).json({
                success: false,
                message: '고객 사진 URL과 의류 ID가 필요합니다.'
            });
        }

        // 의류 정보 조회
        const clothingItem = await ClothingItem.findById(clothingItemId);
        if (!clothingItem) {
            return res.status(404).json({
                success: false,
                message: '의류를 찾을 수 없습니다.'
            });
        }

        // 고객 조회 또는 생성
        let customer;
        if (customerId && customerId !== 'temp' && !customerId.startsWith('temp_')) {
            customer = await Customer.findById(customerId);
        }

        if (!customer) {
            customer = new Customer({
                photo: {
                    url: customerPhotoUrl
                }
            });
            await customer.save();
        }

        console.log('🎨 가상 피팅 요청 시작');

        // 피팅 기록 생성
        const fittingRecord = new FittingRecord({
            customer: customer._id,
            customerPhoto: {
                url: customerPhotoUrl,
                s3Key: req.body.customerPhotoS3Key || ''
            },
            clothingItem: clothingItem._id,
            status: 'processing'
        });

        await fittingRecord.save();

        // 가상 피팅 처리 (비동기)
        fittingService.processFitting(
            customerPhotoUrl,
            clothingItem.image.url,
            customer._id.toString(),
            options || {}
        ).then(async (result) => {
            // 성공
            await fittingRecord.complete(result.resultImageUrl, result.s3Key || '');
            await clothingItem.incrementFittingCount();

        }).catch(async (error) => {
            // 실패
            await fittingRecord.fail(error.message, 'FITTING_ERROR');
        });

        res.json({
            success: true,
            message: '가상 피팅이 시작되었습니다.',
            data: {
                fittingRecordId: fittingRecord._id,
                status: 'processing'
            }
        });

    } catch (error) {
        console.error('❌ 가상 피팅 생성 실패:', error);
        res.status(500).json({
            success: false,
            message: '가상 피팅 생성 중 오류가 발생했습니다.',
            error: error.message
        });
    }
});

/**
 * 피팅 결과 조회
 * GET /api/fitting/result/:id
 */
router.get('/result/:id', async (req, res) => {
    try {
        const fittingRecord = await FittingRecord.findById(req.params.id)
            .populate('customer')
            .populate('clothingItem');

        if (!fittingRecord) {
            return res.status(404).json({
                success: false,
                message: '피팅 기록을 찾을 수 없습니다.'
            });
        }

        res.json({
            success: true,
            data: fittingRecord
        });

    } catch (error) {
        console.error('❌ 피팅 결과 조회 실패:', error);
        res.status(500).json({
            success: false,
            message: '피팅 결과 조회 중 오류가 발생했습니다.',
            error: error.message
        });
    }
});

/**
 * 고객의 피팅 기록 목록
 * GET /api/fitting/history/:customerId
 */
router.get('/history/:customerId', async (req, res) => {
    try {
        const records = await FittingRecord.find({
            customer: req.params.customerId
        })
            .populate('clothingItem')
            .sort({ createdAt: -1 })
            .limit(50);

        res.json({
            success: true,
            data: records
        });

    } catch (error) {
        console.error('❌ 피팅 기록 조회 실패:', error);
        res.status(500).json({
            success: false,
            message: '피팅 기록 조회 중 오류가 발생했습니다.',
            error: error.message
        });
    }
});

module.exports = router;
