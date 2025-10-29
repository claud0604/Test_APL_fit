/**
 * 샘플 의류 메타데이터를 MongoDB에 저장하는 스크립트
 * 사용법: node server/scripts/importSampleClothing.js
 */

const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const SampleClothing = require('../models/SampleClothing');

// MongoDB 연결
async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB 연결 성공');
    } catch (error) {
        console.error('❌ MongoDB 연결 실패:', error);
        process.exit(1);
    }
}

// JSON 파일에서 메타데이터 읽기
async function readMetadataFiles(baseDir) {
    const allMetadata = [];
    const genders = ['남성', '여성'];
    const bodyShapes = ['내추럴', '스트레이트', '웨이브'];

    for (const gender of genders) {
        for (const bodyShape of bodyShapes) {
            const dirPath = path.join(baseDir, 'sample_clothes', gender, bodyShape);

            try {
                const categories = await fs.readdir(dirPath);

                for (const category of categories) {
                    const categoryPath = path.join(dirPath, category);
                    const stat = await fs.stat(categoryPath);

                    if (stat.isDirectory()) {
                        // 메타데이터 JSON 파일 찾기
                        const files = await fs.readdir(categoryPath);
                        const metadataFile = files.find(f => f.endsWith('_metadata.json'));

                        if (metadataFile) {
                            const metadataPath = path.join(categoryPath, metadataFile);
                            const content = await fs.readFile(metadataPath, 'utf-8');
                            const metadata = JSON.parse(content);

                            // 각 항목에 성별 폴더 정보 추가
                            const genderEng = gender === '남성' ? 'male' : 'female';
                            metadata.forEach(item => {
                                item.genderFolder = gender;
                                item.genderValue = genderEng;
                            });

                            allMetadata.push(...metadata);
                            console.log(`📁 읽음: ${gender}/${bodyShape}/${category} - ${metadata.length}개 항목`);
                        }
                    }
                }
            } catch (error) {
                console.warn(`⚠️  폴더 읽기 실패: ${dirPath} - ${error.message}`);
            }
        }
    }

    return allMetadata;
}

// 메타데이터를 MongoDB에 저장
async function importToMongoDB(metadataList) {
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    console.log(`\n📦 총 ${metadataList.length}개 항목 처리 시작...\n`);

    for (const item of metadataList) {
        try {
            // S3 키 생성 (sample_clothes/남성/내추럴/아우터/1.jpg)
            const s3Key = `sample_clothes/${item.genderFolder}/${item.path}`;

            // S3 URL 생성
            const s3Url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'ap-northeast-2'}.amazonaws.com/${s3Key}`;

            // 이미 존재하는지 확인
            const existing = await SampleClothing.findOne({ s3Key });

            if (existing) {
                console.log(`⏭️  건너뜀 (이미 존재): ${s3Key}`);
                skipCount++;
                continue;
            }

            // 새 문서 생성
            const sampleClothing = new SampleClothing({
                s3Key: s3Key,
                s3Url: s3Url,
                name: item.name,
                category: item.category,
                color: item.color,
                style: item.style,
                length: item.length,
                gender: item.gender,
                bodyShape: item.bodyShape,
                clothingPrompt: item.clothingPrompt,
                isActive: true
            });

            await sampleClothing.save();
            console.log(`✅ 저장: ${s3Key}`);
            successCount++;

        } catch (error) {
            console.error(`❌ 오류 (${item.path}):`, error.message);
            errorCount++;
        }
    }

    console.log('\n📊 처리 결과:');
    console.log(`  ✅ 성공: ${successCount}개`);
    console.log(`  ⏭️  건너뜀: ${skipCount}개`);
    console.log(`  ❌ 오류: ${errorCount}개`);
    console.log(`  📦 총계: ${metadataList.length}개`);
}

// 메인 실행
async function main() {
    try {
        console.log('🚀 샘플 의류 메타데이터 가져오기 시작\n');

        // MongoDB 연결
        await connectDB();

        // 프로젝트 루트 디렉토리
        const projectRoot = path.join(__dirname, '..', '..');

        // 메타데이터 파일 읽기
        const metadataList = await readMetadataFiles(projectRoot);

        if (metadataList.length === 0) {
            console.log('⚠️  메타데이터 파일을 찾을 수 없습니다.');
            process.exit(0);
        }

        // MongoDB에 저장
        await importToMongoDB(metadataList);

        console.log('\n✅ 모든 작업 완료!');
        process.exit(0);

    } catch (error) {
        console.error('❌ 처리 중 오류 발생:', error);
        process.exit(1);
    }
}

// 스크립트 실행
main();
