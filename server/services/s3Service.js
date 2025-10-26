/**
 * AWS S3 이미지 업로드 서비스
 */

const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const sharp = require('sharp');
const path = require('path');
const crypto = require('crypto');

// S3 클라이언트 초기화
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'ap-northeast-2',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET;

/**
 * 고유한 파일명 생성
 */
function generateUniqueFileName(originalName, prefix = '') {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(originalName);
    return `${prefix}${timestamp}-${randomString}${ext}`;
}

/**
 * 이미지를 S3에 업로드
 */
async function uploadImageToS3(fileBuffer, originalName, folder = 'images', options = {}) {
    try {
        // 이미지 최적화
        let processedBuffer = fileBuffer;

        if (options.resize) {
            processedBuffer = await sharp(fileBuffer)
                .resize(options.resize.width, options.resize.height, {
                    fit: options.resize.fit || 'inside',
                    withoutEnlargement: true
                })
                .jpeg({ quality: options.quality || 85 })
                .toBuffer();
        }

        // 고유한 파일명 생성
        const fileName = generateUniqueFileName(originalName, `${folder}/`);

        // S3에 업로드
        const uploadParams = {
            Bucket: BUCKET_NAME,
            Key: fileName,
            Body: processedBuffer,
            ContentType: options.contentType || 'image/jpeg'
        };

        const upload = new Upload({
            client: s3Client,
            params: uploadParams
        });

        await upload.done();

        // S3 URL 생성
        const s3Url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

        console.log(`✅ S3 업로드 성공: ${s3Url}`);

        return {
            success: true,
            url: s3Url,
            key: fileName,
            bucket: BUCKET_NAME,
            size: processedBuffer.length
        };

    } catch (error) {
        console.error('❌ S3 업로드 실패:', error);
        throw new Error(`S3 업로드 실패: ${error.message}`);
    }
}

/**
 * 고객 사진 업로드
 */
async function uploadCustomerPhoto(fileBuffer, originalName, customerId) {
    return await uploadImageToS3(fileBuffer, originalName, `customer-photos/${customerId}`, {
        resize: { width: 1200, height: 1600, fit: 'inside' },
        quality: 90
    });
}

/**
 * 의류 이미지 업로드
 */
async function uploadClothingImage(fileBuffer, originalName, category = 'general') {
    return await uploadImageToS3(fileBuffer, originalName, `clothing-images/${category}`, {
        resize: { width: 800, height: 1000, fit: 'inside' },
        quality: 85
    });
}

/**
 * 피팅 결과 이미지 업로드
 */
async function uploadFittingResult(fileBuffer, originalName, customerId) {
    return await uploadImageToS3(fileBuffer, originalName, `fitting-results/${customerId}`, {
        quality: 90
    });
}

/**
 * 썸네일 생성 및 업로드
 */
async function createAndUploadThumbnail(fileBuffer, originalName, folder = 'thumbnails') {
    try {
        const thumbnailBuffer = await sharp(fileBuffer)
            .resize(200, 200, { fit: 'cover' })
            .jpeg({ quality: 80 })
            .toBuffer();

        return await uploadImageToS3(thumbnailBuffer, originalName, folder, {
            contentType: 'image/jpeg'
        });

    } catch (error) {
        console.error('❌ 썸네일 생성 실패:', error);
        throw new Error(`썸네일 생성 실패: ${error.message}`);
    }
}

/**
 * S3에서 이미지 삭제
 */
async function deleteImageFromS3(fileKey) {
    try {
        const deleteParams = {
            Bucket: BUCKET_NAME,
            Key: fileKey
        };

        const command = new DeleteObjectCommand(deleteParams);
        await s3Client.send(command);

        console.log(`✅ S3 삭제 성공: ${fileKey}`);
        return { success: true };

    } catch (error) {
        console.error('❌ S3 삭제 실패:', error);
        throw new Error(`S3 삭제 실패: ${error.message}`);
    }
}

module.exports = {
    uploadImageToS3,
    uploadCustomerPhoto,
    uploadClothingImage,
    uploadFittingResult,
    createAndUploadThumbnail,
    deleteImageFromS3,
    s3Client,
    BUCKET_NAME
};
