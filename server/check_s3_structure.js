// S3 버킷 폴더 구조 확인 스크립트
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

async function listS3Structure() {
    console.log(`\n📦 S3 버킷: ${process.env.AWS_S3_BUCKET}`);
    console.log('='.repeat(60));

    try {
        // 모든 객체 목록 가져오기
        const command = new ListObjectsV2Command({
            Bucket: process.env.AWS_S3_BUCKET
        });

        const response = await s3Client.send(command);

        if (!response.Contents || response.Contents.length === 0) {
            console.log('\n⚠️  버킷이 비어있습니다.');
            return;
        }

        console.log(`\n총 객체 수: ${response.Contents.length}\n`);

        // 폴더 구조 파싱
        const structure = {};

        response.Contents.forEach(obj => {
            const parts = obj.Key.split('/');

            if (parts.length === 1) {
                // 루트 레벨 파일
                if (!structure['[루트]']) structure['[루트]'] = [];
                structure['[루트]'].push({
                    name: parts[0],
                    size: obj.Size,
                    modified: obj.LastModified
                });
            } else {
                // 폴더 안의 파일
                const folder = parts[0];
                if (!structure[folder]) structure[folder] = [];

                const subPath = parts.slice(1).join('/');
                structure[folder].push({
                    name: subPath,
                    size: obj.Size,
                    modified: obj.LastModified
                });
            }
        });

        // 폴더별로 출력
        const folders = Object.keys(structure).sort();

        folders.forEach(folder => {
            console.log(`📁 ${folder}/`);

            const items = structure[folder];
            items.forEach(item => {
                const sizeKB = (item.size / 1024).toFixed(2);
                const date = item.modified.toLocaleDateString('ko-KR');
                const time = item.modified.toLocaleTimeString('ko-KR');

                console.log(`   📄 ${item.name}`);
                console.log(`      크기: ${sizeKB} KB | 수정일: ${date} ${time}`);
            });
            console.log('');
        });

        // 폴더 요약
        console.log('='.repeat(60));
        console.log(`\n📊 폴더 요약:`);
        folders.forEach(folder => {
            const count = structure[folder].length;
            const totalSize = structure[folder].reduce((sum, item) => sum + item.size, 0);
            const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);
            console.log(`   ${folder}: ${count}개 파일, 총 ${totalSizeMB} MB`);
        });

    } catch (error) {
        console.error('❌ S3 버킷 조회 실패:', error.message);
    }
}

listS3Structure();
