/**
 * AI 가상 피팅 서비스
 * Replicate API 사용
 */

const Replicate = require('replicate');
const axios = require('axios');
const sharp = require('sharp');
const s3Service = require('./s3Service');

// Replicate 클라이언트 초기화
const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN
});

/**
 * AI 가상 피팅 생성
 * @param {String} personImageUrl - 고객 사진 URL
 * @param {String} clothingImageUrl - 의류 이미지 URL
 * @param {Object} options - 추가 옵션
 * @returns {String} - 합성된 이미지 URL
 */
async function createVirtualFitting(personImageUrl, clothingImageUrl, options = {}) {
    try {
        console.log('🎨 AI 가상 피팅 시작...');
        console.log('고객 사진:', personImageUrl);
        console.log('의류 이미지:', clothingImageUrl);

        // Replicate IDM-VTON 모델 사용 (Yisol - ECCV 2024)
        // 가장 안정적이고 검증된 Virtual Try-On 모델
        const output = await replicate.run(
            "cuuupid/idm-vton:c871bb9b046607b680449ecbae55fd8c6d945e0a1948644bf2361b3d021d3ff4",
            {
                input: {
                    human_img: personImageUrl,
                    garm_img: clothingImageUrl,
                    garment_des: options.description || "a person wearing the clothing",
                    is_checked: true,
                    is_checked_crop: false,
                    denoise_steps: 30,
                    seed: 42
                }
            }
        );

        console.log('✅ AI 가상 피팅 완료');
        console.log('결과 URL:', output);

        // 결과가 배열인 경우 첫 번째 URL 반환
        if (Array.isArray(output)) {
            return output[0];
        }

        return output;

    } catch (error) {
        console.error('❌ AI 가상 피팅 실패:', error);
        throw new Error(`가상 피팅 실패: ${error.message}`);
    }
}

/**
 * 간단한 오버레이 방식 (Fallback)
 */
async function createSimpleOverlay(personImageBuffer, clothingImageBuffer) {
    try {
        console.log('🎨 간단한 오버레이 합성 시작...');

        const personImage = sharp(personImageBuffer);
        const metadata = await personImage.metadata();

        // 의류 이미지 리사이징
        const resizedClothing = await sharp(clothingImageBuffer)
            .resize(Math.floor(metadata.width * 0.6), null, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .toBuffer();

        // 합성 (중앙 하단에 배치)
        const composite = await personImage
            .composite([{
                input: resizedClothing,
                gravity: 'center',
                blend: 'over'
            }])
            .toBuffer();

        console.log('✅ 간단한 오버레이 합성 완료');

        return composite;

    } catch (error) {
        console.error('❌ 오버레이 합성 실패:', error);
        throw new Error(`오버레이 합성 실패: ${error.message}`);
    }
}

/**
 * URL에서 이미지 다운로드
 */
async function downloadImageFromUrl(url) {
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 30000
        });

        return Buffer.from(response.data);

    } catch (error) {
        console.error('❌ 이미지 다운로드 실패:', error);
        throw new Error(`이미지 다운로드 실패: ${error.message}`);
    }
}

/**
 * 전체 가상 피팅 프로세스 (하이브리드)
 * 1. AI 우선 시도
 * 2. 실패 시 간단한 오버레이 사용
 */
async function processFitting(personImageUrl, clothingImageUrl, customerId, options = {}) {
    const startTime = Date.now();

    try {
        let resultImageUrl;
        let method = 'ai';

        // AI 가상 피팅 시도
        if (process.env.REPLICATE_API_TOKEN && process.env.REPLICATE_API_TOKEN !== 'your_replicate_token_here') {
            try {
                const aiResultUrl = await createVirtualFitting(personImageUrl, clothingImageUrl, options);

                // AI 결과를 S3에 저장
                const aiResultBuffer = await downloadImageFromUrl(aiResultUrl);

                const uploadResult = await s3Service.uploadFittingResult(
                    aiResultBuffer,
                    `ai-fitting-${Date.now()}.jpg`,
                    customerId
                );

                resultImageUrl = uploadResult.url;

            } catch (aiError) {
                console.warn('⚠️ AI 가상 피팅 실패, 간단한 오버레이로 전환');
                method = 'overlay';
            }
        } else {
            console.log('⚠️ Replicate API 토큰 없음, 간단한 오버레이 사용');
            method = 'overlay';
        }

        // Fallback: 간단한 오버레이
        if (method === 'overlay') {
            const personBuffer = await downloadImageFromUrl(personImageUrl);
            const clothingBuffer = await downloadImageFromUrl(clothingImageUrl);

            const compositeBuffer = await createSimpleOverlay(personBuffer, clothingBuffer);

            // S3에 업로드
            const uploadResult = await s3Service.uploadFittingResult(
                compositeBuffer,
                `overlay-fitting-${Date.now()}.jpg`,
                customerId
            );

            resultImageUrl = uploadResult.url;
        }

        const processingTime = Date.now() - startTime;

        console.log('✅ 가상 피팅 프로세스 완료');
        console.log('방법:', method);
        console.log('처리 시간:', processingTime, 'ms');
        console.log('최종 URL:', resultImageUrl);

        return {
            success: true,
            resultImageUrl,
            method,
            processingTime,
            timestamp: new Date()
        };

    } catch (error) {
        console.error('❌ 가상 피팅 프로세스 실패:', error);
        throw error;
    }
}

module.exports = {
    createVirtualFitting,
    createSimpleOverlay,
    processFitting,
    downloadImageFromUrl
};
