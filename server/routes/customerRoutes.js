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
        const { name, phone } = req.body;

        // 이름과 연락처로 기존 고객 찾기
        let customer = await Customer.findOne({ name, phone });

        if (customer) {
            // 기존 고객 업데이트
            Object.assign(customer, req.body);
            customer.updatedAt = new Date();
            await customer.save();

            console.log('✅ 고객 정보 업데이트:', name, phone);
        } else {
            // 새 고객 생성
            customer = new Customer(req.body);
            await customer.save();

            console.log('✅ 새 고객 생성:', name, phone);
        }

        res.json({
            success: true,
            data: customer,
            isNew: !customer
        });

    } catch (error) {
        console.error('❌ 고객 생성/업데이트 실패:', error);
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
