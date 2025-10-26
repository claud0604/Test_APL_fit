/**
 * 고객 관리 API 라우터
 */

const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const FittingRecord = require('../models/FittingRecord');

/**
 * 고객 생성
 * POST /api/customers
 */
router.post('/', async (req, res) => {
    try {
        const customer = new Customer(req.body);
        await customer.save();

        res.json({
            success: true,
            data: customer
        });

    } catch (error) {
        console.error('❌ 고객 생성 실패:', error);
        res.status(500).json({
            success: false,
            message: '고객 생성 중 오류가 발생했습니다.',
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
