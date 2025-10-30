/**
 * AI 가상 피팅 서비스
 * Replicate API 사용
 */

const Replicate = require('replicate');
const axios = require('axios');
const sharp = require('sharp');
const s3Service = require('./s3Service');

// 이미지 전처리 함수
async function preprocessImage(imageBuffer, stepName = 'preprocessImage') {
    try {
        // 🔍 [STEP 3] 전처리 전 이미지 확인
        const beforeMetadata = await sharp(imageBuffer).metadata();
        console.log(`\n🔍 [STEP 3: ${stepName}] 전처리 전 이미지`);
        console.log(`   Width: ${beforeMetadata.width}px, Height: ${beforeMetadata.height}px`);
        console.log(`   방향: ${beforeMetadata.width > beforeMetadata.height ? '🟦 가로 (Landscape)' : '🟩 세로 (Portrait)'}`);
        console.log(`   EXIF Orientation: ${beforeMetadata.orientation || 'None'}`);

        // 이미지를 512x512로 리사이즈하고 JPEG로 변환
        const processedBuffer = await sharp(imageBuffer)
            .rotate() // EXIF Orientation 태그에 따라 자동 회전 및 태그 제거
            .resize(512, 512, { fit: 'cover', position: 'center' })
            .jpeg({ quality: 90 })
            .toBuffer();

        // 🔍 [STEP 3-1] 전처리 후 이미지 확인
        const afterMetadata = await sharp(processedBuffer).metadata();
        console.log(`\n🔍 [STEP 3-1: ${stepName}] 전처리 후 이미지`);
        console.log(`   Width: ${afterMetadata.width}px, Height: ${afterMetadata.height}px`);
        console.log(`   방향: ${afterMetadata.width > afterMetadata.height ? '🟦 가로 (Landscape)' : '🟩 세로 (Portrait)'}`);
        console.log(`   ⚠️ 주의: 512x512 cover resize로 인해 1:1 비율로 변환됨`);

        return processedBuffer;
    } catch (error) {
        console.error('❌ 이미지 전처리 실패:', error);
        throw new Error(`이미지 전처리 실패: ${error.message}`);
    }
}

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
        console.log('🎨 AI 가상 피팅 시작 (nano-banana)...');
        console.log('   고객 사진:', personImageUrl);
        console.log('   의류 이미지:', clothingImageUrl);
        console.log('   전달할 프롬프트:', options.description || "a person wearing the clothing");

        // Google nano-banana 모델 사용 (Gemini 2.5 Flash Image)
        // 이미지 생성 및 편집에 특화된 모델
        const input = {
            prompt: options.description || "a person wearing the clothing",
            image_input: [personImageUrl, clothingImageUrl]
        };

        console.log('📤 Replicate API 전송 파라미터:', JSON.stringify(input, null, 2));

        const output = await replicate.run("google/nano-banana", { input });

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

        // 이미지 다운로드
        const personBuffer = await downloadImageFromUrl(personImageUrl);
        const clothingBuffer = await downloadImageFromUrl(clothingImageUrl);

        // 이미지 전처리
        const processedPersonBuffer = await preprocessImage(personBuffer, 'Person Image');
        const processedClothingBuffer = await preprocessImage(clothingBuffer, 'Clothing Image');

        // 전처리된 이미지 S3에 업로드
        const personUploadResult = await s3Service.uploadFittingResult(
            processedPersonBuffer,
            `preprocessed-person-${Date.now()}.jpg`,
            customerId
        );
        const clothingUploadResult = await s3Service.uploadFittingResult(
            processedClothingBuffer,
            `preprocessed-clothing-${Date.now()}.jpg`,
            customerId
        );

        const processedPersonImageUrl = personUploadResult.url;
        const processedClothingImageUrl = clothingUploadResult.url;

        // 🔍 [STEP 4] Replicate에 전송하기 직전 최종 이미지 확인
        console.log(`\n🔍 [STEP 4: Replicate 전송 직전] 최종 전처리된 이미지 URL`);
        console.log(`   Person Image URL: ${processedPersonImageUrl}`);
        console.log(`   Clothing Image URL: ${processedClothingImageUrl}`);

        // S3에서 다시 다운로드하여 실제로 어떻게 저장되었는지 확인
        const verifyPersonBuffer = await downloadImageFromUrl(processedPersonImageUrl);
        const verifyClothingBuffer = await downloadImageFromUrl(processedClothingImageUrl);

        const verifyPersonMetadata = await sharp(verifyPersonBuffer).metadata();
        const verifyClothingMetadata = await sharp(verifyClothingBuffer).metadata();

        console.log(`\n   📌 Person Image (S3에서 재확인):`);
        console.log(`      Width: ${verifyPersonMetadata.width}px, Height: ${verifyPersonMetadata.height}px`);
        console.log(`      방향: ${verifyPersonMetadata.width > verifyPersonMetadata.height ? '🟦 가로 (Landscape)' : '🟩 세로 (Portrait)'}`);

        console.log(`\n   📌 Clothing Image (S3에서 재확인):`);
        console.log(`      Width: ${verifyClothingMetadata.width}px, Height: ${verifyClothingMetadata.height}px`);
        console.log(`      방향: ${verifyClothingMetadata.width > verifyClothingMetadata.height ? '🟦 가로 (Landscape)' : '🟩 세로 (Portrait)'}`);

        // AI 가상 피팅 시도
        if (process.env.REPLICATE_API_TOKEN && process.env.REPLICATE_API_TOKEN !== 'your_replicate_token_here') {
            try {
                const aiResultUrl = await createVirtualFitting(processedPersonImageUrl, processedClothingImageUrl, options);

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
    preprocessImage,
    createVirtualFitting,
    createSimpleOverlay,
    processFitting,
    downloadImageFromUrl
};
