/**
 * AI 가상 피팅 테스트 스크립트
 * Replicate API 작동 확인
 */

const axios = require('axios');

const API_URL = 'http://localhost:3004/api';

// 테스트용 공개 이미지 URL
const TEST_PERSON_URL = 'https://replicate.delivery/pbxt/JvWLlCPaGoSKpEUtgwdSCN4CJMpKCvbBvb3C1vixR3EbO5gIA/model.png';
const TEST_CLOTHING_URL = 'https://replicate.delivery/pbxt/JvWLlCPaGoSKpEUtgwdSCN4CJMpKCvbBvb3C1vixR3EbO5gIA/garment.png';

async function testAIFitting() {
    console.log('🧪 AI 가상 피팅 테스트 시작\n');

    try {
        // Step 1: 고객 생성 (임시)
        console.log('1️⃣ 고객 정보 생성...');
        const customer = {
            _id: 'test-customer-123',
            name: '테스트 고객'
        };
        console.log('✅ 완료\n');

        // Step 2: 의류 아이템 생성 (임시)
        console.log('2️⃣ 의류 아이템 생성...');
        const clothingItem = {
            _id: 'test-clothing-456',
            name: '테스트 의류',
            image: {
                url: TEST_CLOTHING_URL
            }
        };
        console.log('✅ 완료\n');

        // Step 3: 가상 피팅 요청
        console.log('3️⃣ AI 가상 피팅 요청 전송...');
        console.log(`   고객 사진: ${TEST_PERSON_URL}`);
        console.log(`   의류 이미지: ${TEST_CLOTHING_URL}\n`);

        const fittingResponse = await axios.post(`${API_URL}/fitting/create`, {
            customerId: customer._id,
            customerPhotoUrl: TEST_PERSON_URL,
            clothingItemId: clothingItem._id,
            options: {
                description: 'test clothing'
            }
        });

        if (fittingResponse.data.success) {
            const fittingRecordId = fittingResponse.data.data.fittingRecordId;
            console.log('✅ 피팅 요청 성공!');
            console.log(`   Fitting Record ID: ${fittingRecordId}`);
            console.log(`   상태: ${fittingResponse.data.data.status}\n`);

            // Step 4: 결과 폴링
            console.log('4️⃣ AI 처리 대기 중...');
            let attempts = 0;
            const maxAttempts = 60; // 최대 2분
            let completed = false;

            while (attempts < maxAttempts && !completed) {
                await new Promise(resolve => setTimeout(resolve, 2000)); // 2초 대기
                attempts++;

                const resultResponse = await axios.get(`${API_URL}/fitting/result/${fittingRecordId}`);
                const status = resultResponse.data.data.status;

                process.stdout.write(`\r   시도 ${attempts}/${maxAttempts} - 상태: ${status}    `);

                if (status === 'completed') {
                    completed = true;
                    console.log('\n');
                    console.log('✅ AI 가상 피팅 완료!\n');

                    const result = resultResponse.data.data;
                    console.log('📊 결과 정보:');
                    console.log(`   방법: ${result.settings?.aiModel || 'unknown'}`);
                    console.log(`   처리 시간: ${result.settings?.processingTime || 0}ms`);
                    console.log(`   결과 이미지: ${result.resultImage?.url || 'none'}\n`);

                    if (result.resultImage?.url) {
                        console.log('🎉 테스트 성공!');
                        console.log('   Replicate AI가 정상 작동합니다.');
                        console.log(`   결과 확인: ${result.resultImage.url}`);
                    }
                } else if (status === 'failed') {
                    console.log('\n❌ AI 처리 실패');
                    console.log(`   에러: ${resultResponse.data.data.errorMessage || 'Unknown error'}`);
                    break;
                }
            }

            if (!completed && attempts >= maxAttempts) {
                console.log('\n⏱️ 시간 초과');
            }

        } else {
            console.log('❌ 피팅 요청 실패');
        }

    } catch (error) {
        console.error('\n❌ 테스트 중 오류 발생:');
        if (error.response) {
            console.error(`   상태 코드: ${error.response.status}`);
            console.error(`   메시지: ${error.response.data?.message || error.message}`);
        } else {
            console.error(`   ${error.message}`);
        }

        if (error.message.includes('ECONNREFUSED')) {
            console.error('\n💡 서버가 실행 중인지 확인하세요:');
            console.error('   cd /Users/kimvstiger/KimVsTiger_code/project_apl_fit/Test_APL_fit/server');
            console.error('   npm start');
        }
    }
}

// 실행
console.log('============================================');
console.log('  APL Fit - AI 가상 피팅 테스트');
console.log('============================================\n');

testAIFitting().then(() => {
    console.log('\n============================================');
    console.log('테스트 종료');
    console.log('============================================');
    process.exit(0);
}).catch(err => {
    console.error('예상치 못한 오류:', err);
    process.exit(1);
});
