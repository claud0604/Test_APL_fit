/**
 * 고객 관리 API 라우터
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const Customer = require('../models/Customer');
const FittingRecord = require('../models/FittingRecord');
const s3Service = require('../services/s3Service');

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
 * 고객 생성 또는 업데이트 (파일 업로드 포함)
 * POST /api/customers
 * Body (multipart/form-data): { name, phone, email, gender, bodyShape, height, weight, customerPrompt, frontPhoto, sidePhoto, anglePhoto }
 */
router.post('/', upload.fields([
    { name: 'frontPhoto', maxCount: 1 },
    { name: 'sidePhoto', maxCount: 1 },
    { name: 'anglePhoto', maxCount: 1 }
]), async (req, res) => {
    try {
        const { name, phone, email, gender, bodyShape, height, weight, customerPrompt } = req.body;

        console.log('\n' + '='.repeat(60));
        console.log('📥 [MongoDB 저장 요청] 고객 정보 저장 시작');
        console.log('='.repeat(60));
        console.log('🔍 요청 데이터:');
        console.log('  - 고객명:', name);
        console.log('  - 연락처:', phone);
        console.log('  - 성별:', gender);
        console.log('  - 체형:', bodyShape || '미선택');
        console.log('  - 키:', height || '미선택');
        console.log('  - 몸무게:', weight || '미선택');

        // 고객 폴더명 생성 (YYMMDDHHmm_고객명)
        const now = new Date();
        const year = now.getFullYear().toString().slice(2);
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hour = String(now.getHours()).padStart(2, '0');
        const minute = String(now.getMinutes()).padStart(2, '0');
        const dateTimePrefix = `${year}${month}${day}${hour}${minute}`;
        const sanitizedName = name.replace(/[^a-zA-Z0-9가-힣]/g, '_');
        const customerFolder = `${dateTimePrefix}_${sanitizedName}`;

        // S3에 사진 업로드
        const photos = {};
        const uploadedFiles = [];

        if (req.files) {
            console.log('\n📸 S3 업로드 시작:');

            if (req.files.frontPhoto && req.files.frontPhoto[0]) {
                const file = req.files.frontPhoto[0];
                const s3Key = `customer_photos/${customerFolder}/${name}_front_${Date.now()}.jpg`;

                console.log('  - 정면 사진 업로드 중...');
                const uploadResult = await s3Service.uploadFile(file.buffer, s3Key, file.mimetype);

                photos.front = {
                    originalFileName: file.originalname,
                    fileName: `${name}_front_${Date.now()}.jpg`,
                    filePath: s3Key,
                    s3Key: uploadResult.key,
                    url: uploadResult.url
                };
                uploadedFiles.push('정면');
            }

            if (req.files.sidePhoto && req.files.sidePhoto[0]) {
                const file = req.files.sidePhoto[0];
                const s3Key = `customer_photos/${customerFolder}/${name}_side_${Date.now()}.jpg`;

                console.log('  - 측면 사진 업로드 중...');
                const uploadResult = await s3Service.uploadFile(file.buffer, s3Key, file.mimetype);

                photos.side = {
                    originalFileName: file.originalname,
                    fileName: `${name}_side_${Date.now()}.jpg`,
                    filePath: s3Key,
                    s3Key: uploadResult.key,
                    url: uploadResult.url
                };
                uploadedFiles.push('측면');
            }

            if (req.files.anglePhoto && req.files.anglePhoto[0]) {
                const file = req.files.anglePhoto[0];
                const s3Key = `customer_photos/${customerFolder}/${name}_angle_${Date.now()}.jpg`;

                console.log('  - 45도 사진 업로드 중...');
                const uploadResult = await s3Service.uploadFile(file.buffer, s3Key, file.mimetype);

                photos.angle = {
                    originalFileName: file.originalname,
                    fileName: `${name}_angle_${Date.now()}.jpg`,
                    filePath: s3Key,
                    s3Key: uploadResult.key,
                    url: uploadResult.url
                };
                uploadedFiles.push('45도');
            }

            console.log('  ✅ S3 업로드 완료:', uploadedFiles.join(', '));
        }

        // 프롬프트 정보
        const prompts = {
            customerPrompt: customerPrompt || '',
            clothingPrompt: '',
            finalPrompt: customerPrompt || ''
        };

        if (customerPrompt) {
            console.log('\n🤖 생성된 프롬프트:');
            console.log('  - 고객 프롬프트:', customerPrompt);
        }

        // 이름과 연락처로 기존 고객 찾기
        let customer = await Customer.findOne({ name, phone });
        let isNewCustomer = false;

        const customerData = {
            name,
            phone,
            email,
            gender,
            bodyShape,
            height,
            weight,
            photos,
            prompts
        };

        if (customer) {
            // 기존 고객 업데이트
            console.log('\n🔄 기존 고객 데이터 발견 - 업데이트 진행');
            console.log('  - 기존 고객 ID:', customer._id);

            Object.assign(customer, customerData);
            customer.updatedAt = new Date();
            await customer.save();

            console.log('✅ MongoDB 저장 완료 (업데이트)');
        } else {
            // 새 고객 생성
            console.log('\n🆕 새로운 고객 - 신규 생성');

            customer = new Customer(customerData);
            await customer.save();
            isNewCustomer = true;

            console.log('✅ MongoDB 저장 완료 (신규 생성)');
        }

        console.log('\n📊 저장된 데이터 정보:');
        console.log('  - Database:', 'APL_FIT');
        console.log('  - Collection:', 'Cust_info');
        console.log('  - Document ID:', customer._id);
        console.log('  - 생성일시:', customer.createdAt);
        console.log('  - 수정일시:', customer.updatedAt);
        console.log('='.repeat(60));
        console.log('✅ 고객 정보 저장 프로세스 완료\n');

        res.json({
            success: true,
            data: customer,
            isNew: isNewCustomer
        });

    } catch (error) {
        console.error('\n' + '='.repeat(60));
        console.error('❌ [MongoDB 저장 실패] 오류 발생');
        console.error('='.repeat(60));
        console.error('오류 메시지:', error.message);
        console.error('오류 스택:', error.stack);
        console.error('='.repeat(60) + '\n');

        res.status(500).json({
            success: false,
            message: '고객 정보 저장 중 오류가 발생했습니다.',
            error: error.message
        });
    }
});

/**
 * 프롬프트 생성 및 저장
 * POST /api/customers/:id/prompts
 * Body: { customerPrompt, clothingPrompt }
 */
router.post('/:id/prompts', async (req, res) => {
    try {
        const { customerPrompt, clothingPrompt } = req.body;

        const customer = await Customer.findById(req.params.id);

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: '고객을 찾을 수 없습니다.'
            });
        }

        // 프롬프트 저장
        customer.prompts = {
            customerPrompt: customerPrompt || '',
            clothingPrompt: clothingPrompt || '',
            finalPrompt: `${customerPrompt || ''}\n${clothingPrompt || ''}`.trim()
        };

        await customer.save();

        console.log('✅ 프롬프트 저장 완료:', customer.name);

        res.json({
            success: true,
            data: customer.prompts
        });

    } catch (error) {
        console.error('❌ 프롬프트 저장 실패:', error);
        res.status(500).json({
            success: false,
            message: '프롬프트 저장 중 오류가 발생했습니다.',
            error: error.message
        });
    }
});

/**
 * 고객 조회
 * GET /api/customers/:id
 */
router.get('/:id', async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id)
            .populate('fittingHistory');

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: '고객을 찾을 수 없습니다.'
            });
        }

        res.json({
            success: true,
            data: customer
        });

    } catch (error) {
        console.error('❌ 고객 조회 실패:', error);
        res.status(500).json({
            success: false,
            message: '고객 조회 중 오류가 발생했습니다.',
            error: error.message
        });
    }
});

/**
 * 고객 목록 조회
 * GET /api/customers
 */
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [customers, total] = await Promise.all([
            Customer.find()
                .skip(skip)
                .limit(parseInt(limit))
                .sort({ createdAt: -1 }),
            Customer.countDocuments()
        ]);

        res.json({
            success: true,
            data: customers,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit)),
                totalItems: total
            }
        });

    } catch (error) {
        console.error('❌ 고객 목록 조회 실패:', error);
        res.status(500).json({
            success: false,
            message: '고객 목록 조회 중 오류가 발생했습니다.',
            error: error.message
        });
    }
});

module.exports = router;
