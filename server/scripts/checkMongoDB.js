/**
 * MongoDB 데이터 확인 스크립트
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function checkMongoDB() {
    try {
        console.log('🔍 MongoDB 연결 중...');

        // MongoDB URI에서 데이터베이스 이름 확인 및 수정
        let mongoUri = process.env.MONGODB_URI;
        if (!mongoUri.includes('/APL_FIT?')) {
            mongoUri = mongoUri.replace(/\/[^/?]*\?/, '/APL_FIT?');
        }

        await mongoose.connect(mongoUri);
        console.log('✅ MongoDB 연결 성공\n');

        const db = mongoose.connection.db;

        // 데이터베이스 이름 확인
        console.log('📦 데이터베이스:', db.databaseName);

        // 모든 컬렉션 목록
        const collections = await db.listCollections().toArray();
        console.log('\n📁 컬렉션 목록:');
        for (const col of collections) {
            const count = await db.collection(col.name).countDocuments();
            console.log(`  - ${col.name}: ${count}개 문서`);
        }

        // sample_clothes 컬렉션 확인
        console.log('\n🔍 sample_clothes 컬렉션 상세:');
        const sampleClothesExists = collections.find(c => c.name === 'sample_clothes');

        if (sampleClothesExists) {
            const sampleClothes = db.collection('sample_clothes');
            const count = await sampleClothes.countDocuments();
            console.log(`  총 문서 수: ${count}개`);

            if (count > 0) {
                // 첫 번째 문서 샘플
                const sample = await sampleClothes.findOne();
                console.log('\n  📄 샘플 문서:');
                console.log(JSON.stringify(sample, null, 2));

                // 성별/체형별 통계
                console.log('\n  📊 통계:');

                const maleCount = await sampleClothes.countDocuments({ gender: 'male' });
                const femaleCount = await sampleClothes.countDocuments({ gender: 'female' });
                console.log(`    남성: ${maleCount}개`);
                console.log(`    여성: ${femaleCount}개`);

                const naturalCount = await sampleClothes.countDocuments({ bodyShape: 'natural' });
                const straightCount = await sampleClothes.countDocuments({ bodyShape: 'straight' });
                const waveCount = await sampleClothes.countDocuments({ bodyShape: 'wave' });
                console.log(`    내추럴: ${naturalCount}개`);
                console.log(`    스트레이트: ${straightCount}개`);
                console.log(`    웨이브: ${waveCount}개`);
            }
        } else {
            console.log('  ❌ sample_clothes 컬렉션이 존재하지 않습니다!');
        }

        await mongoose.connection.close();
        console.log('\n✅ 확인 완료');

    } catch (error) {
        console.error('❌ 오류:', error);
        process.exit(1);
    }
}

checkMongoDB();
