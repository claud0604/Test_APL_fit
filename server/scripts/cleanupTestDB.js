/**
 * test 데이터베이스의 sample_clothes 컬렉션 삭제
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function cleanup() {
    try {
        // test 데이터베이스에 연결
        const testUri = process.env.MONGODB_URI.replace('/APL_FIT?', '/test?');
        await mongoose.connect(testUri);

        console.log('✅ MongoDB 연결 성공');
        console.log('📦 데이터베이스:', mongoose.connection.db.databaseName);

        const db = mongoose.connection.db;

        // sample_clothes 컬렉션 삭제
        const collections = await db.listCollections({ name: 'sample_clothes' }).toArray();

        if (collections.length > 0) {
            await db.collection('sample_clothes').drop();
            console.log('✅ test.sample_clothes 컬렉션 삭제 완료');
        } else {
            console.log('⚠️  test.sample_clothes 컬렉션이 존재하지 않습니다');
        }

        // sampleclothings 컬렉션도 삭제
        const collections2 = await db.listCollections({ name: 'sampleclothings' }).toArray();

        if (collections2.length > 0) {
            await db.collection('sampleclothings').drop();
            console.log('✅ test.sampleclothings 컬렉션 삭제 완료');
        } else {
            console.log('⚠️  test.sampleclothings 컬렉션이 존재하지 않습니다');
        }

        await mongoose.connection.close();
        console.log('\n✅ 정리 완료!');

    } catch (error) {
        console.error('❌ 오류:', error);
        process.exit(1);
    }
}

cleanup();
