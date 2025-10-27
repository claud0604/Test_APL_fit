/**
 * 고객 관리 API 라우터
 */

const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const FittingRecord = require('../models/FittingRecord');

/**
 * 고객 생성 또는 업데이트
 * POST /api/customers
 * Body: { name, phone, email, gender, bodyShape, height, weight, photos, prompts }
 */
router.post('/', async (req, res) => {
    try {
        const { name, phone, gender, bodyShape, height, weight, photos, prompts } = req.body;

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

        // 업로드된 사진 정보 로그
        const photoNames = [];
        if (photos?.front?.fileName) photoNames.push(photos.front.fileName);
        if (photos?.side?.fileName) photoNames.push(photos.side.fileName);
        if (photos?.angle?.fileName) photoNames.push(photos.angle.fileName);
        console.log('  - 업로드 사진:', photoNames.length > 0 ? photoNames.join(', ') : '없음');

        if (prompts?.customerPrompt || prompts?.clothingPrompt) {
            console.log('  - 프롬프트:', prompts.customerPrompt ? '고객 프롬프트 포함' : '', prompts.clothingPrompt ? '의류 프롬프트 포함' : '');
        }

        // 이름과 연락처로 기존 고객 찾기
        let customer = await Customer.findOne({ name, phone });
        let isNewCustomer = false;

        if (customer) {
            // 기존 고객 업데이트
            console.log('\n🔄 기존 고객 데이터 발견 - 업데이트 진행');
            console.log('  - 기존 고객 ID:', customer._id);

            Object.assign(customer, req.body);
            customer.updatedAt = new Date();
            await customer.save();

            console.log('✅ MongoDB 저장 완료 (업데이트)');
        } else {
            // 새 고객 생성
            console.log('\n🆕 새로운 고객 - 신규 생성');

            customer = new Customer(req.body);
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
