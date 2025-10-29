/**
 * 가상 피팅 API 라우터
 */

const express = require('express');
const router = express.Router();
const fittingService = require('../services/fittingService');
const FittingRecord = require('../models/FittingRecord');
const Customer = require('../models/Customer');
const ClothingItem = require('../models/ClothingItem');
const SampleClothing = require('../models/SampleClothing');

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
            // 샘플 의류 - MongoDB에서 메타데이터 조회
            console.log('📁 샘플 의류 사용:', clothingItemId);
            console.log('🔍 MongoDB 조회 시도 - s3Key:', clothingItemId);

            const sampleClothing = await SampleClothing.findOne({ s3Key: clothingItemId });

            if (sampleClothing) {
                clothingItem = sampleClothing;
                clothingImageUrl = sampleClothing.s3Url;
                console.log('✅ 샘플 의류 메타데이터 조회 성공');
                console.log('   의류명:', sampleClothing.name);
                console.log('   카테고리:', sampleClothing.category);
                console.log('   프롬프트:', sampleClothing.clothingPrompt);
            } else {
                // 메타데이터 없으면 기본 객체 사용
                console.log('⚠️  샘플 의류 메타데이터 없음 - MongoDB 조회 실패');
                console.log('   조회 시도한 s3Key:', clothingItemId);

                // MongoDB에 있는 샘플 개수 확인
                const totalSamples = await SampleClothing.countDocuments();
                console.log('   MongoDB 총 샘플 개수:', totalSamples);

                // 비슷한 키 찾기
                const similarKeys = await SampleClothing.find({
                    s3Key: { $regex: '탑', $options: 'i' }
                }).limit(3).select('s3Key name');
                console.log('   유사한 키 샘플:', similarKeys.map(s => s.s3Key));

                clothingImageUrl = req.body.clothingImageUrl || `https://apl-fit.s3.ap-northeast-2.amazonaws.com/${clothingItemId}`;
                clothingItem = {
                    _id: null,
                    s3Key: clothingItemId,
                    imageUrl: clothingImageUrl,
                    category: '샘플의류',
                    name: 'clothing',
                    clothingPrompt: 'wearing clothing'
                };
            }
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

        // AI 프롬프트 구성: "사람이 옷을 입고 있다"
        const genderText = customer.gender === 'male' ? 'man' : 'woman';

        // 체형 정보 (height/weight는 범위값이므로 프롬프트에서 제외)
        let bodyInfo = '';
        if (customer.bodyShape) {
            const bodyShapeEng = {
                '내추럴': 'natural body shape',
                '스트레이트': 'straight body shape',
                '웨이브': 'wave body shape'
            };
            bodyInfo = `, with ${bodyShapeEng[customer.bodyShape] || customer.bodyShape}`;
        }

        // 의류 프롬프트 (샘플 의류는 clothingPrompt, 업로드 의류는 description/name 사용)
        let clothingPrompt = '';
        if (clothingItem.clothingPrompt) {
            // 샘플 의류: 이미 "wearing ..." 형태로 저장됨
            clothingPrompt = clothingItem.clothingPrompt;
        } else if (clothingItem.description) {
            clothingPrompt = `wearing ${clothingItem.description}`;
        } else if (clothingItem.name) {
            clothingPrompt = `wearing ${clothingItem.name}`;
        } else {
            clothingPrompt = `wearing ${clothingItem.category || 'clothing'}`;
        }

        // 최종 프롬프트: "a [성별] [체형정보], [옷을 입고 있음]"
        const aiPrompt = `a ${genderText}${bodyInfo}, ${clothingPrompt}`;

        console.log('🎯 AI 프롬프트 생성 완료:');
        console.log('   전체 프롬프트:', aiPrompt);
        console.log('   성별:', genderText);
        console.log('   체형 정보:', bodyInfo || '없음');
        console.log('   의류 프롬프트:', clothingPrompt);

        // 가상 피팅 처리 (비동기)
        fittingService.processFitting(
            customerPhotoUrl,
            clothingImageUrl,  // 샘플/업로드 의류 모두 지원
            customer._id.toString(),
            {
                ...options,
                description: aiPrompt
            }
        ).then(async (result) => {
            // 성공
            await fittingRecord.complete(result.resultImageUrl, result.s3Key || '');
            // 샘플 의류는 incrementFittingCount 메서드가 없을 수 있음
            if (clothingItem.incrementFittingCount) {
                await clothingItem.incrementFittingCount();
            }

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
