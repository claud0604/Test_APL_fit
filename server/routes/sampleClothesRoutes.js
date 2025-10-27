/**
 * 샘플 의류 API 라우터
 */

const express = require('express');
const router = express.Router();
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { GetObjectCommand } = require('@aws-sdk/client-s3');

// S3 클라이언트 초기화
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

/**
 * S3에서 샘플 의류 목록 조회
 * GET /api/sample-clothes
 * Query params:
 *   - gender: male | female (optional)
 *   - bodyStyle: 내추럴 | 스트레이트 | 웨이브 (optional, female only)
 *   - category: 스커트 | 아우터 | 원피스 | 탑 | 팬츠 | tshirt (optional)
 */
router.get('/', async (req, res) => {
    try {
        const { gender, bodyStyle, category } = req.query;

        console.log('📁 S3 샘플 의류 조회 요청:', { gender, bodyStyle, category });

        let allImageFiles = [];

        // 남성/여성 모두 체형별 폴더 구조 사용
        if (gender) {
            // bodyStyle이 지정된 경우: 해당 체형만 검색
            if (bodyStyle) {
                const genderFolder = gender === 'male' ? '남성' : '여성';
                let prefix = `sample_clothes/${genderFolder}/${bodyStyle}/`;

                // 카테고리가 지정된 경우 해당 카테고리만
                if (category) {
                    prefix += `${category}/`;
                }

                console.log('📁 검색 경로:', prefix);

                const command = new ListObjectsV2Command({
                    Bucket: process.env.AWS_S3_BUCKET,
                    Prefix: prefix
                });

                const response = await s3Client.send(command);
                if (response.Contents) {
                    const images = response.Contents.filter(item => {
                        const key = item.Key;
                        return !key.endsWith('/') && /\.(jpg|jpeg|png|webp)$/i.test(key);
                    });
                    allImageFiles.push(...images);
                }
            } else {
                // bodyStyle 미지정: 모든 체형 폴더 검색 (초기 로드)
                const genderFolder = gender === 'male' ? '남성' : '여성';
                const bodyStyles = ['내추럴', '스트레이트', '웨이브'];

                for (const style of bodyStyles) {
                    let prefix = `sample_clothes/${genderFolder}/${style}/`;

                    if (category) {
                        prefix += `${category}/`;
                    }

                    const command = new ListObjectsV2Command({
                        Bucket: process.env.AWS_S3_BUCKET,
                        Prefix: prefix
                    });

                    const response = await s3Client.send(command);
                    if (response.Contents) {
                        const images = response.Contents.filter(item => {
                            const key = item.Key;
                            return !key.endsWith('/') && /\.(jpg|jpeg|png|webp)$/i.test(key);
                        });
                        allImageFiles.push(...images);
                    }
                }
            }
        }

        if (allImageFiles.length === 0) {
            return res.json({
                success: true,
                data: {
                    items: [],
                    groupedByCategory: {},
                    total: 0
                },
                message: '샘플 의류가 없습니다.'
            });
        }

        // Signed URL 생성 및 메타데이터 파싱
        const clothesPromises = allImageFiles.map(async (item) => {
            const key = item.Key;

            // S3 Key로부터 메타데이터 파싱
            // 남성/여성 모두: sample_clothes/{성별}/{체형}/{카테고리}/이미지.jpg
            // 예: sample_clothes/여성/내추럴/스커트/35.jpg
            // 예: sample_clothes/남성/내추럴/tshirt/티셔츠1.jpg
            const parts = key.split('/');
            const fileName = parts[parts.length - 1];
            const parsedGender = parts[1] === '남성' ? 'male' : 'female';
            const parsedBodyStyle = parts[2]; // 내추럴, 스트레이트, 웨이브
            const parsedCategory = parts[3];  // 스커트, 아우터, tshirt 등

            // Signed URL 생성 (24시간 유효)
            const getCommand = new GetObjectCommand({
                Bucket: process.env.AWS_S3_BUCKET,
                Key: key
            });

            const signedUrl = await getSignedUrl(s3Client, getCommand, {
                expiresIn: 86400 // 24시간
            });

            return {
                fileName,
                s3Key: key,
                url: signedUrl,
                gender: parsedGender,
                bodyStyle: parsedBodyStyle,
                category: parsedCategory,
                size: item.Size,
                lastModified: item.LastModified
            };
        });

        const clothesList = await Promise.all(clothesPromises);

        // 카테고리별로 그룹화
        const groupedByCategory = clothesList.reduce((acc, item) => {
            const cat = item.category || 'uncategorized';
            if (!acc[cat]) {
                acc[cat] = [];
            }
            acc[cat].push(item);
            return acc;
        }, {});

        res.json({
            success: true,
            data: {
                items: clothesList,
                groupedByCategory,
                total: clothesList.length
            }
        });

    } catch (error) {
        console.error('❌ 샘플 의류 조회 실패:', error);
        res.status(500).json({
            success: false,
            message: '샘플 의류 조회 중 오류가 발생했습니다.',
            error: error.message
        });
    }
});

/**
 * 샘플 의류 카테고리 목록 조회
 * GET /api/sample-clothes/categories
 */
router.get('/categories', async (req, res) => {
    try {
        const { gender } = req.query;

        let prefix = 'sample_clothes/';
        if (gender) {
            prefix += gender === 'male' ? '남성/' : '여성/';
        }

        const command = new ListObjectsV2Command({
            Bucket: process.env.AWS_S3_BUCKET,
            Prefix: prefix,
            Delimiter: '/'
        });

        const response = await s3Client.send(command);

        const categories = [];

        // CommonPrefixes에서 폴더 목록 추출
        if (response.CommonPrefixes) {
            response.CommonPrefixes.forEach(item => {
                const folder = item.Prefix.replace(prefix, '').replace('/', '');
                if (folder) {
                    categories.push(folder);
                }
            });
        }

        res.json({
            success: true,
            data: categories
        });

    } catch (error) {
        console.error('❌ 카테고리 조회 실패:', error);
        res.status(500).json({
            success: false,
            message: '카테고리 조회 중 오류가 발생했습니다.',
            error: error.message
        });
    }
});

module.exports = router;
