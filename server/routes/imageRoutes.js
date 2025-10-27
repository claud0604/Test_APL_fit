/**
 * 이미지 업로드 API 라우터
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const s3Service = require('../services/s3Service');
const ClothingItem = require('../models/ClothingItem');
const Customer = require('../models/Customer');

// Multer 설정 (메모리 스토리지)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('이미지 파일만 업로드 가능합니다.'));
        }
    }
});

/**
 * 고객 사진 업로드
 * POST /api/images/upload-customer
 */
router.post('/upload-customer', upload.single('customerPhoto'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: '파일이 업로드되지 않았습니다.'
            });
        }

        const { name, gender, bodyShape, height, weight } = req.body;
        const customerId = req.body.customerId || `temp_${Date.now()}`;

        console.log(`📸 고객 사진 업로드 시작: ${req.file.originalname}`);
        console.log(`   성별: ${gender || 'female'}`);
        console.log(`   체형: ${bodyShape || '미선택'}, 키: ${height || '미선택'}, 몸무게: ${weight || '미선택'}`);

        // S3에 업로드
        const uploadResult = await s3Service.uploadCustomerPhoto(
            req.file.buffer,
            req.file.originalname,
            customerId
        );

        // 썸네일 생성
        const thumbnailResult = await s3Service.createAndUploadThumbnail(
            req.file.buffer,
            req.file.originalname,
            `customer-photos/${customerId}/thumbnails`
        );

        // Customer 문서 생성 또는 업데이트
        let customer;
        if (customerId.startsWith('temp_')) {
            // 임시 ID는 나중에 fitting route에서 실제 Customer로 변환됨
            customer = null;
        } else {
            // 기존 Customer 업데이트 또는 새로 생성
            const updateData = {
                name,
                gender: gender || 'female',
                photo: {
                    url: uploadResult.url,
                    s3Key: uploadResult.key,
                    thumbnailUrl: thumbnailResult.url
                }
            };

            // 체형 정보 추가 (선택 시에만)
            if (bodyShape) updateData.bodyShape = bodyShape;
            if (height) updateData.height = height;
            if (weight) updateData.weight = weight;

            customer = await Customer.findByIdAndUpdate(
                customerId,
                updateData,
                { new: true, upsert: true, setDefaultsOnInsert: true }
            );
        }

        res.json({
            success: true,
            message: '고객 사진이 업로드되었습니다.',
            data: {
                url: uploadResult.url,
                s3Key: uploadResult.key,
                thumbnailUrl: thumbnailResult.url,
                size: uploadResult.size,
                customerId,
                gender: gender || 'female',
                bodyShape,
                height,
                weight
            }
        });

    } catch (error) {
        console.error('❌ 고객 사진 업로드 실패:', error);
        res.status(500).json({
            success: false,
            message: '사진 업로드 중 오류가 발생했습니다.',
            error: error.message
        });
    }
});

/**
 * 의류 이미지 업로드
 * POST /api/images/upload-clothing
 */
router.post('/upload-clothing', upload.single('clothingImage'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: '파일이 업로드되지 않았습니다.'
            });
        }

        const {
            name,
            description,
            category,
            color,
            hexColor,
            style,
            season,
            gender,
            price,
            brand,
            tags
        } = req.body;

        if (!name || !category || !color) {
            return res.status(400).json({
                success: false,
                message: '필수 정보(이름, 카테고리, 색상)가 누락되었습니다.'
            });
        }

        console.log(`👔 의류 이미지 업로드 시작: ${req.file.originalname}`);

        // S3에 업로드
        const uploadResult = await s3Service.uploadClothingImage(
            req.file.buffer,
            req.file.originalname,
            category
        );

        // 썸네일 생성
        const thumbnailResult = await s3Service.createAndUploadThumbnail(
            req.file.buffer,
            req.file.originalname,
            `clothing-images/${category}/thumbnails`
        );

        // MongoDB에 저장
        const clothingItem = new ClothingItem({
            name,
            description,
            image: {
                url: uploadResult.url,
                s3Key: uploadResult.key,
                thumbnailUrl: thumbnailResult.url
            },
            category,
            color,
            hexColor,
            style: style ? JSON.parse(style) : [],
            season: season ? JSON.parse(season) : [],
            gender: gender || 'unisex',
            price: price ? parseFloat(price) : undefined,
            brand,
            tags: tags ? JSON.parse(tags) : []
        });

        await clothingItem.save();

        res.json({
            success: true,
            message: '의류 이미지가 업로드되었습니다.',
            data: clothingItem
        });

    } catch (error) {
        console.error('❌ 의류 이미지 업로드 실패:', error);
        res.status(500).json({
            success: false,
            message: '의류 이미지 업로드 중 오류가 발생했습니다.',
            error: error.message
        });
    }
});

/**
 * 의류 이미지 목록 조회
 * GET /api/images/clothing
 */
router.get('/clothing', async (req, res) => {
    try {
        const {
            category,
            gender,
            search,
            page = 1,
            limit = 20
        } = req.query;

        // 필터 구성
        const filter = { isActive: true };

        if (category) filter.category = category;
        if (gender) filter.gender = { $in: [gender, 'unisex'] };
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { tags: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [items, total] = await Promise.all([
            ClothingItem.find(filter)
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ createdAt: -1 }),
            ClothingItem.countDocuments(filter)
        ]);

        res.json({
            success: true,
            data: items,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit)),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('❌ 의류 이미지 조회 실패:', error);
        res.status(500).json({
            success: false,
            message: '의류 이미지 조회 중 오류가 발생했습니다.',
            error: error.message
        });
    }
});

/**
 * 특정 의류 이미지 조회
 * GET /api/images/clothing/:id
 */
router.get('/clothing/:id', async (req, res) => {
    try {
        const item = await ClothingItem.findById(req.params.id);

        if (!item) {
            return res.status(404).json({
                success: false,
                message: '의류 이미지를 찾을 수 없습니다.'
            });
        }

        // 조회수 증가
        await item.incrementViewCount();

        res.json({
            success: true,
            data: item
        });

    } catch (error) {
        console.error('❌ 의류 이미지 조회 실패:', error);
        res.status(500).json({
            success: false,
            message: '의류 이미지 조회 중 오류가 발생했습니다.',
            error: error.message
        });
    }
});

module.exports = router;
