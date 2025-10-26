// MongoDB와 S3 연결 테스트 스크립트
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const { S3Client, ListBucketsCommand, PutObjectCommand } = require('@aws-sdk/client-s3');

console.log('=== APL_fit 연결 테스트 시작 ===\n');

// 1. MongoDB 연결 테스트
async function testMongoDB() {
    console.log('📦 MongoDB 연결 테스트 중...');
    console.log(`   URI: ${process.env.MONGODB_URI.replace(/:[^:]*@/, ':****@')}`);
    console.log(`   DB_NAME: ${process.env.DB_NAME}`);

    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            dbName: process.env.DB_NAME
        });

        console.log('✅ MongoDB 연결 성공!');
        console.log(`   연결된 데이터베이스: ${mongoose.connection.name}`);

        // 컬렉션 목록 확인
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log(`   기존 컬렉션 수: ${collections.length}`);
        if (collections.length > 0) {
            collections.forEach(col => console.log(`     - ${col.name}`));
        }

        await mongoose.disconnect();
        return true;
    } catch (error) {
        console.error('❌ MongoDB 연결 실패:');
        console.error(`   에러: ${error.message}`);
        return false;
    }
}

// 2. AWS S3 연결 테스트
async function testS3() {
    console.log('\n📦 AWS S3 연결 테스트 중...');
    console.log(`   Region: ${process.env.AWS_REGION}`);
    console.log(`   Bucket: ${process.env.AWS_S3_BUCKET}`);

    try {
        const s3Client = new S3Client({
            region: process.env.AWS_REGION,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            }
        });

        // 버킷 목록 조회
        const listCommand = new ListBucketsCommand({});
        const { Buckets } = await s3Client.send(listCommand);

        console.log('✅ AWS S3 연결 성공!');
        console.log(`   접근 가능한 버킷 수: ${Buckets.length}`);

        // 지정한 버킷이 존재하는지 확인
        const targetBucket = Buckets.find(b => b.Name === process.env.AWS_S3_BUCKET);
        if (targetBucket) {
            console.log(`   ✅ 타겟 버킷 '${process.env.AWS_S3_BUCKET}' 존재 확인`);
            console.log(`      생성일: ${targetBucket.CreationDate}`);
        } else {
            console.log(`   ⚠️  타겟 버킷 '${process.env.AWS_S3_BUCKET}'을 찾을 수 없습니다`);
            console.log(`   사용 가능한 버킷 목록:`);
            Buckets.forEach(b => console.log(`     - ${b.Name}`));
        }

        // 테스트 파일 업로드 시도
        console.log('\n   테스트 파일 업로드 시도...');
        const testContent = 'APL_fit 연결 테스트 - ' + new Date().toISOString();
        const putCommand = new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: 'test/connection-test.txt',
            Body: testContent,
            ContentType: 'text/plain'
        });

        await s3Client.send(putCommand);
        console.log('   ✅ 테스트 파일 업로드 성공!');
        console.log(`   파일 위치: s3://${process.env.AWS_S3_BUCKET}/test/connection-test.txt`);

        return true;
    } catch (error) {
        console.error('❌ AWS S3 연결 실패:');
        console.error(`   에러: ${error.message}`);
        if (error.Code === 'NoSuchBucket') {
            console.error(`   해결방법: AWS 콘솔에서 '${process.env.AWS_S3_BUCKET}' 버킷을 생성해주세요`);
        } else if (error.Code === 'InvalidAccessKeyId') {
            console.error('   해결방법: AWS_ACCESS_KEY_ID를 확인해주세요');
        } else if (error.Code === 'SignatureDoesNotMatch') {
            console.error('   해결방법: AWS_SECRET_ACCESS_KEY를 확인해주세요');
        }
        return false;
    }
}

// 3. 환경변수 확인
function checkEnvVariables() {
    console.log('\n📋 환경변수 확인:');
    const required = [
        'MONGODB_URI',
        'DB_NAME',
        'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY',
        'AWS_REGION',
        'AWS_S3_BUCKET'
    ];

    let allPresent = true;
    required.forEach(key => {
        const value = process.env[key];
        if (value && !value.includes('your_') && !value.includes('_here')) {
            console.log(`   ✅ ${key}: 설정됨`);
        } else {
            console.log(`   ❌ ${key}: 미설정 또는 기본값`);
            allPresent = false;
        }
    });

    return allPresent;
}

// 메인 실행
async function main() {
    const envOk = checkEnvVariables();

    if (!envOk) {
        console.log('\n⚠️  일부 환경변수가 설정되지 않았습니다. .env 파일을 확인해주세요.');
        process.exit(1);
    }

    const mongoOk = await testMongoDB();
    const s3Ok = await testS3();

    console.log('\n=== 테스트 결과 요약 ===');
    console.log(`MongoDB: ${mongoOk ? '✅ 성공' : '❌ 실패'}`);
    console.log(`AWS S3:  ${s3Ok ? '✅ 성공' : '❌ 실패'}`);

    if (mongoOk && s3Ok) {
        console.log('\n🎉 모든 연결이 정상입니다! 백엔드 서버를 시작할 수 있습니다.');
    } else {
        console.log('\n⚠️  일부 연결에 문제가 있습니다. 위의 에러 메시지를 확인해주세요.');
    }
}

main().catch(console.error);
