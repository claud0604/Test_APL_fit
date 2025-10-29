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
        // clothingItemId가 S3 키(sample_clothes/...)인지 ObjectId인지 판단
        let clothingItem;
        let clothingImageUrl;

        if (clothingItemId.startsWith('sample_clothes/')) {
            // 샘플 의류 - S3 키 사용 (MongoDB 조회 스킵)
            console.log('📁 샘플 의류 사용:', clothingItemId);
            clothingImageUrl = req.body.clothingImageUrl || `https://apl-fit.s3.ap-northeast-2.amazonaws.com/${clothingItemId}`;
            // 임시로 clothingItem 객체 생성 (나중에 SampleClothing 모델 사용)
            clothingItem = {
                _id: null,
                s3Key: clothingItemId,
                imageUrl: clothingImageUrl,
                category: '샘플의류'
            };
        } else {
            // 업로드 의류 - MongoDB에서 조회
            console.log('🔍 업로드 의류 조회:', clothingItemId);
            clothingItem = await ClothingItem.findById(clothingItemId);
            if (!clothingItem) {
                return res.status(404).json({
                    success: false,
                    message: '의류를 찾을 수 없습니다.'
                });
            }
            clothingImageUrl = clothingItem.image.url;
        }

        // 고객 조회 또는 생성
        let customer;
        if (customerId && customerId !== 'temp' && !customerId.startsWith('temp_')) {
            customer = await Customer.findById(customerId);
        }

        if (!customer) {
            // 새 고객 생성 - gender 및 체형 정보 포함
            const customerData = {
                name: req.body.name || `임시고객${Date.now()}`,
                gender: req.body.gender || 'female',
                photo: {
                    url: customerPhotoUrl,
                    s3Key: req.body.customerPhotoS3Key || ''
                }
            };

            // 체형 정보 추가 (있을 경우에만)
            if (req.body.bodyShape) customerData.bodyShape = req.body.bodyShape;
            if (req.body.height) customerData.height = req.body.height;
            if (req.body.weight) customerData.weight = req.body.weight;

            customer = new Customer(customerData);
            await customer.save();
        }

        console.log('🎨 가상 피팅 요청 시작');
        console.log('고객 성별:', customer.gender);
        console.log('고객 체형:', customer.bodyShape || '미선택');
        console.log('고객 키:', customer.height || '미선택');
        console.log('고객 몸무게:', customer.weight || '미선택');
        console.log('의류 정보:', clothingItem.s3Key || clothingItem._id);

        // 피팅 기록 생성
        const fittingRecord = new FittingRecord({
            customer: customer._id,
            customerPhoto: {
                url: customerPhotoUrl,
                s3Key: req.body.customerPhotoS3Key || ''
            },
            clothingItem: clothingItem._id || null,  // 샘플 의류는 null
            clothingImageUrl: clothingImageUrl,      // S3 URL 저장
            status: 'processing'
        });

        await fittingRecord.save();

        // AI 프롬프트 구성: 의류 설명 + 고객 성별 + 체형 정보
        const genderText = customer.gender === 'male' ? 'man' : 'woman';
        const clothingDescription = clothingItem.description || clothingItem.name || clothingItem.category || 'clothing';

        // 체형 정보를 프롬프트에 추가
        let bodyInfo = '';
        if (customer.bodyShape || customer.height || customer.weight) {
            const bodyParts = [];
            if (customer.bodyShape) {
                const bodyShapeEng = {
                    '내추럴': 'natural body shape',
                    '스트레이트': 'straight body shape',
                    '웨이브': 'wave body shape'
                };
                bodyParts.push(bodyShapeEng[customer.bodyShape] || customer.bodyShape);
            }
            if (customer.height) {
                bodyParts.push(`height ${customer.height}`);
            }
            if (customer.weight) {
                bodyParts.push(`weight ${customer.weight}`);
            }
            bodyInfo = `, ${bodyParts.join(', ')}`;
        }

        const aiPrompt = `${clothingDescription} for ${genderText}${bodyInfo}`;

        console.log('AI 프롬프트:', aiPrompt);

        // 가상 피팅 처리 (비동기)
        fittingService.processFitting(
            customerPhotoUrl,
            clothingItem.image.url,
            customer._id.toString(),
            {
                ...options,
                description: aiPrompt
            }
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
