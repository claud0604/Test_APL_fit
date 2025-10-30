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
 * - 파일 업로드 또는 URL에서 이미지 가져오기 지원
 */
router.post('/upload-customer', upload.single('customerPhoto'), async (req, res) => {
    try {
        const { name, gender, bodyShape, height, weight, imageUrl } = req.body;
        const customerId = req.body.customerId || `temp_${Date.now()}`;

        let imageBuffer;
        let originalName;

        // URL에서 이미지 가져오기 (추가 피팅용)
        if (imageUrl && !req.file) {
            console.log(`📸 URL에서 고객 사진 가져오기: ${imageUrl}`);
            const axios = require('axios');
            const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            imageBuffer = Buffer.from(response.data);
            originalName = `fitting_result_${Date.now()}.jpg`;
        } else if (req.file) {
            console.log(`📸 고객 사진 업로드 시작: ${req.file.originalname}`);
            imageBuffer = req.file.buffer;
            originalName = req.file.originalname;
        } else {
            return res.status(400).json({
                success: false,
                message: '파일 또는 이미지 URL이 필요합니다.'
            });
        }

        console.log(`   성별: ${gender || 'female'}`);
        console.log(`   체형: ${bodyShape || '미선택'}, 키: ${height || '미선택'}, 몸무게: ${weight || '미선택'}`);

        // 🔍 [STEP 1] 초기 업로드된 이미지 방향 확인
        const sharp = require('sharp');
        const initialMetadata = await sharp(imageBuffer).metadata();
        console.log(`\n🔍 [STEP 1: imageRoutes.js] 초기 업로드된 이미지 분석`);
        console.log(`   Width: ${initialMetadata.width}px, Height: ${initialMetadata.height}px`);
        console.log(`   방향: ${initialMetadata.width > initialMetadata.height ? '🟦 가로 (Landscape)' : '🟩 세로 (Portrait)'}`);
        console.log(`   EXIF Orientation: ${initialMetadata.orientation || 'None'}`);
        console.log(`   Format: ${initialMetadata.format}`);

        console.log(`\n⚠️ [imageRoutes.js] s3Service.uploadCustomerPhoto 호출 직전!`);
        console.log(`   파일명: ${originalName}`);
        console.log(`   customerId: ${customerId}`);
        console.log(`   버퍼 크기: ${imageBuffer.length} bytes`);

        // S3에 업로드
        const uploadResult = await s3Service.uploadCustomerPhoto(
            imageBuffer,
            originalName,
            customerId
        );

        console.log(`⚠️ [imageRoutes.js] s3Service.uploadCustomerPhoto 호출 완료!`);

        // 썸네일 생성
        const thumbnailResult = await s3Service.createAndUploadThumbnail(
            imageBuffer,
            originalName,
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

/**
 * S3 이미지 프록시 (CORS 우회)
 * GET /api/images/proxy?url=<S3_URL>
 */
router.get('/proxy', async (req, res) => {
    try {
        const { url } = req.query;

        if (!url) {
            console.log('❌ 프록시 요청: URL 파라미터 없음');
            return res.status(400).json({
                success: false,
                message: 'URL 파라미터가 필요합니다.'
            });
        }

        console.log(`🔄 이미지 프록시 요청: ${url.substring(0, 100)}...`);

        const axios = require('axios');
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 30000,
            validateStatus: function (status) {
                return status >= 200 && status < 500; // 모든 응답을 받아서 처리
            }
        });

        // S3 오류 응답 처리
        if (response.status !== 200) {
            console.error(`❌ 이미지 프록시 실패: S3 응답 코드 ${response.status}`);
            return res.status(response.status).json({
                success: false,
                message: `원본 이미지 서버 오류 (${response.status})`,
                error: `S3 returned status ${response.status}`
            });
        }

        // Content-Type 헤더 설정
        const contentType = response.headers['content-type'] || 'image/jpeg';
        res.set('Content-Type', contentType);
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Cache-Control', 'public, max-age=3600'); // 1시간 캐시
        res.send(Buffer.from(response.data));

        console.log(`✅ 이미지 프록시 성공 (크기: ${response.data.length} bytes)`);

    } catch (error) {
        console.error('❌ 이미지 프록시 실패:', error.message);
        if (error.code === 'ECONNABORTED') {
            return res.status(504).json({
                success: false,
                message: '이미지 다운로드 시간 초과',
                error: 'Timeout'
            });
        }
        res.status(500).json({
            success: false,
            message: '이미지 프록시 중 오류가 발생했습니다.',
            error: error.message
        });
    }
});

module.exports = router;
