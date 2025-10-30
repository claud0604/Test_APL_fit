/**
 * AWS S3 이미지 업로드 서비스
 */

const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
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
        console.log(`\n🔍 [S3 업로드 디버그] ${originalName}`);
        console.log(`   폴더: ${folder}`);
        console.log(`   resize 옵션: ${options.resize ? 'Yes' : 'No'}`);
        if (options.resize) {
            console.log(`   resize 설정: ${options.resize.width}x${options.resize.height}`);
        }

        // 원본 이미지 메타데이터 확인 (항상 실행)
        const metadata = await sharp(fileBuffer).metadata();
        console.log(`📸 원본 이미지 메타데이터:`);
        console.log(`   Width: ${metadata.width}, Height: ${metadata.height}`);
        console.log(`   Format: ${metadata.format}, Orientation: ${metadata.orientation}`);
        console.log(`   EXIF: ${metadata.exif ? 'Yes' : 'No'}`);

        // 이미지 최적화
        let processedBuffer = fileBuffer;

        if (options.resize) {
            console.log(`\n🔧 [RESIZE 블록 진입] Orientation: ${metadata.orientation}`);

            // CRITICAL FIX: EXIF orientation을 완전히 무시
            // Sharp는 기본적으로 EXIF orientation을 자동 적용하므로
            // rotate() 함수를 사용할 때 명시적으로 비활성화해야 함

            let sharpInstance = sharp(fileBuffer, {
                failOnError: false
            });

            // Orientation에 따라 역회전 적용
            console.log(`🔍 Orientation 체크: ${metadata.orientation} (타입: ${typeof metadata.orientation})`);

            if (metadata.orientation === 6) {
                console.log('⚠️ Orientation 6 감지 - 역회전 적용 (-90도)');
                sharpInstance = sharpInstance.rotate(-90);
            } else if (metadata.orientation === 8) {
                console.log('⚠️ Orientation 8 감지 - 역회전 적용 (+90도)');
                sharpInstance = sharpInstance.rotate(90);
            } else if (metadata.orientation === 3) {
                console.log('⚠️ Orientation 3 감지 - 역회전 적용 (180도)');
                sharpInstance = sharpInstance.rotate(180);
            } else {
                console.log(`ℹ️ Orientation ${metadata.orientation} - 회전 없음`);
            }

            processedBuffer = await sharpInstance
                .resize(options.resize.width, options.resize.height, {
                    fit: options.resize.fit || 'inside',
                    withoutEnlargement: true
                })
                .withMetadata({})  // 모든 EXIF 메타데이터 제거
                .jpeg({ quality: options.quality || 85 })
                .toBuffer();

            // 처리 후 이미지 확인
            const processedMetadata = await sharp(processedBuffer).metadata();
            console.log(`✅ 처리 후 이미지:`);
            console.log(`   Width: ${processedMetadata.width}, Height: ${processedMetadata.height}`);
        } else {
            console.log(`⚠️  resize 옵션 없음 - 원본 그대로 업로드`);
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

        // Signed URL 생성 (24시간 유효)
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: fileName
        });

        const signedUrl = await getSignedUrl(s3Client, command, {
            expiresIn: 86400 // 24시간 (초 단위)
        });

        console.log(`✅ S3 업로드 성공: ${signedUrl.split('?')[0]}`);

        return {
            success: true,
            url: signedUrl,
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
    console.log(`\n🚨 [s3Service.uploadCustomerPhoto] 함수 진입!`);
    console.log(`   파일명: ${originalName}`);
    console.log(`   customerId: ${customerId}`);
    console.log(`   버퍼 크기: ${fileBuffer.length} bytes`);
    console.log(`   resize 옵션 전달 예정: 1200x1600`);

    const result = await uploadImageToS3(fileBuffer, originalName, `customer-photos/${customerId}`, {
        resize: { width: 1200, height: 1600, fit: 'inside' },
        quality: 90
    });

    console.log(`🚨 [s3Service.uploadCustomerPhoto] 함수 종료!`);
    return result;
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
        // EXIF orientation 확인
        const metadata = await sharp(fileBuffer).metadata();

        let sharpInstance = sharp(fileBuffer, {
            failOnError: false
        });

        // Orientation에 따라 역회전 적용
        if (metadata.orientation === 6) {
            sharpInstance = sharpInstance.rotate(-90);
        } else if (metadata.orientation === 8) {
            sharpInstance = sharpInstance.rotate(90);
        } else if (metadata.orientation === 3) {
            sharpInstance = sharpInstance.rotate(180);
        }

        const thumbnailBuffer = await sharpInstance
            .resize(200, 200, { fit: 'cover' })
            .withMetadata({})  // 모든 EXIF 메타데이터 제거
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

/**
 * 파일을 S3에 업로드 (간단한 버전)
 */
async function uploadFile(fileBuffer, s3Key, contentType = 'image/jpeg') {
    try {
        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: s3Key,
            Body: fileBuffer,
            ContentType: contentType
        });

        await s3Client.send(command);

        // S3 URL 생성
        const url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-northeast-2'}.amazonaws.com/${s3Key}`;

        return {
            key: s3Key,
            url: url,
            size: fileBuffer.length
        };
    } catch (error) {
        console.error('❌ S3 업로드 실패:', error);
        throw new Error(`S3 업로드 실패: ${error.message}`);
    }
}

module.exports = {
    uploadImageToS3,
    uploadCustomerPhoto,
    uploadClothingImage,
    uploadFittingResult,
    createAndUploadThumbnail,
    deleteImageFromS3,
    uploadFile,
    s3Client,
    BUCKET_NAME
};
