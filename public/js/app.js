// APL Fit - Frontend JavaScript

// API Configuration
// Cloudflare Proxy + Nginx를 통한 HTTPS 백엔드
const API_URL = 'https://apl-fit-test-connect.apls.kr/api';
console.log('🌐 API URL:', API_URL);

// Sample clothes data - will be loaded from S3
let sampleClothesData = {
    items: [],
    groupedByCategory: {},
    categories: []
};

// Fitting history storage
let fittingHistory = [];
let customerCounter = 1;

// State management
const state = {
    customerId: null, // MongoDB 저장된 고객 ID
    frontPhoto: null,
    sidePhoto: null,
    anglePhoto: null,
    clothingPhoto: null,
    clothingSource: null, // 'upload' or 'sample'
    clothingS3Key: null, // S3 key for sample clothes
    selectedSample: null,
    currentGender: 'female',
    currentBodyStyle: null, // 2차: 체형
    currentCategory: null, // 3차: 카테고리 (동적)
    isProcessing: false
};

// DOM elements - Main upload area
const customerUploadArea = document.getElementById('customerUploadArea');
const customerPlaceholder = document.getElementById('customerPlaceholder');
const customerPreviewSummary = document.getElementById('customerPreviewSummary');
const previewThumbnails = document.getElementById('previewThumbnails');
const editPhotosBtn = document.getElementById('editPhotosBtn');

// DOM elements - Customer Photos Modal
const customerPhotosModal = document.getElementById('customerPhotosModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const savePhotosBtn = document.getElementById('savePhotosBtn');

// DOM elements - Customer modal uploads
const frontUploadBox = document.getElementById('frontUploadBox');
const frontPhotoInput = document.getElementById('frontPhoto');
const frontPlaceholder = document.getElementById('frontPlaceholder');
const frontPreview = document.getElementById('frontPreview');

const sideUploadBox = document.getElementById('sideUploadBox');
const sidePhotoInput = document.getElementById('sidePhoto');
const sidePlaceholder = document.getElementById('sidePlaceholder');
const sidePreview = document.getElementById('sidePreview');

const angleUploadBox = document.getElementById('angleUploadBox');
const anglePhotoInput = document.getElementById('anglePhoto');
const anglePlaceholder = document.getElementById('anglePlaceholder');
const anglePreview = document.getElementById('anglePreview');

// DOM elements - Clothing
const clothingUploadArea = document.getElementById('clothingUploadArea');
const clothingPlaceholder = document.getElementById('clothingPlaceholder');
const clothingPreviewSummary = document.getElementById('clothingPreviewSummary');
const clothingThumbnail = document.getElementById('clothingThumbnail');
const editClothingBtn = document.getElementById('editClothingBtn');

// DOM elements - Clothing Modal
const clothingModal = document.getElementById('clothingModal');
const closeClothingModalBtn = document.getElementById('closeClothingModalBtn');
const cancelClothingModalBtn = document.getElementById('cancelClothingModalBtn');
const saveClothingBtn = document.getElementById('saveClothingBtn');
const clothingModalUploadBox = document.getElementById('clothingModalUploadBox');
const clothingPhotoInput = document.getElementById('clothingPhotoInput');
const clothingModalPlaceholder = document.getElementById('clothingModalPlaceholder');
const clothingModalPreview = document.getElementById('clothingModalPreview');
const sampleClothesGrid = document.getElementById('sampleClothesGrid');

// DOM elements - Customer info
const customerNameInput = document.getElementById('customerName');
const customerPhoneInput = document.getElementById('customerPhone');

// DOM elements - Actions
const startFittingBtn = document.getElementById('startFittingBtn');
const resetBtn = document.getElementById('resetBtn');
const loadingModal = document.getElementById('loadingModal');

// DOM elements - Result Modal
const resultModal = document.getElementById('resultModal');
const closeResultModalBtn = document.getElementById('closeResultModalBtn');
const closeResultBtn = document.getElementById('closeResultBtn');
const downloadResultBtn = document.getElementById('downloadResultBtn');
const continueResultBtn = document.getElementById('continueResultBtn');
const resultImageContainer = document.getElementById('resultImageContainer');
const resultCustomerName = document.getElementById('resultCustomerName');
const resultCustomerPhone = document.getElementById('resultCustomerPhone');
const resultPhoneContainer = document.getElementById('resultPhoneContainer');
const resultTimestamp = document.getElementById('resultTimestamp');

// Store current result for continue fitting
let currentResultData = null;

// DOM elements - History
const historySection = document.getElementById('history');
const historyGrid = document.getElementById('historyGrid');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    updateStartButton();
    // 초기 카테고리와 샘플 의류는 모달이 열릴 때 로드됩니다
});

// Event listeners setup
function initializeEventListeners() {
    // Customer photos
    customerPlaceholder.addEventListener('click', openCustomerPhotosModal);
    editPhotosBtn.addEventListener('click', openCustomerPhotosModal);
    closeModalBtn.addEventListener('click', closeCustomerPhotosModal);
    cancelModalBtn.addEventListener('click', closeCustomerPhotosModal);
    savePhotosBtn.addEventListener('click', saveCustomerPhotos);

    // Customer modal photo uploads
    frontUploadBox.addEventListener('click', () => frontPhotoInput.click());
    frontPhotoInput.addEventListener('change', (e) => handleModalPhotoSelect(e, 'front'));
    sideUploadBox.addEventListener('click', () => sidePhotoInput.click());
    sidePhotoInput.addEventListener('change', (e) => handleModalPhotoSelect(e, 'side'));
    angleUploadBox.addEventListener('click', () => anglePhotoInput.click());
    anglePhotoInput.addEventListener('change', (e) => handleModalPhotoSelect(e, 'angle'));

    // Clothing
    clothingPlaceholder.addEventListener('click', openClothingModal);
    editClothingBtn.addEventListener('click', openClothingModal);
    closeClothingModalBtn.addEventListener('click', closeClothingModal);
    cancelClothingModalBtn.addEventListener('click', closeClothingModal);
    saveClothingBtn.addEventListener('click', saveClothing);

    // Clothing modal upload - 현재 비활성화
    clothingModalUploadBox.addEventListener('click', () => {
        showNotification('현재는 닫아놓은 기능입니다. 샘플 의류를 선택해주세요.', 'info');
    });
    // clothingPhotoInput.addEventListener('change', handleClothingUpload);

    // Filter buttons
    document.querySelectorAll('[data-gender]').forEach(btn => {
        btn.addEventListener('click', (e) => handleGenderChange(e.target.dataset.gender));
    });

    // Body style buttons (체형 선택)
    document.querySelectorAll('[data-bodystyle]').forEach(btn => {
        btn.addEventListener('click', (e) => handleBodyStyleChange(e.target.dataset.bodystyle));
    });

    // Action buttons
    startFittingBtn.addEventListener('click', handleStartFitting);
    resetBtn.addEventListener('click', handleReset);

    // Result modal
    closeResultModalBtn.addEventListener('click', closeResultModal);
    closeResultBtn.addEventListener('click', closeResultModal);
    downloadResultBtn.addEventListener('click', downloadResult);
    continueResultBtn.addEventListener('click', continueFitting);

    // Close modals on background click
    customerPhotosModal.addEventListener('click', (e) => {
        if (e.target === customerPhotosModal) closeCustomerPhotosModal();
    });
    clothingModal.addEventListener('click', (e) => {
        if (e.target === clothingModal) closeClothingModal();
    });
    resultModal.addEventListener('click', (e) => {
        if (e.target === resultModal) closeResultModal();
    });
}

// Customer Photos Modal functions
function openCustomerPhotosModal() {
    customerPhotosModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCustomerPhotosModal() {
    customerPhotosModal.classList.remove('active');
    document.body.style.overflow = '';
}

// 고객 폴더명 생성 함수 (날짜시간_고객명)
function generateCustomerFolderName(customerName) {
    const now = new Date();
    const year = now.getFullYear().toString().slice(2); // 25 (2025년)
    const month = String(now.getMonth() + 1).padStart(2, '0'); // 10
    const day = String(now.getDate()).padStart(2, '0'); // 27
    const hour = String(now.getHours()).padStart(2, '0'); // 13
    const minute = String(now.getMinutes()).padStart(2, '0'); // 00

    const dateTimePrefix = `${year}${month}${day}${hour}${minute}`;
    const sanitizedName = customerName.replace(/[^a-zA-Z0-9가-힣]/g, '_');

    // 형식: 2510271300_홍길동
    return `${dateTimePrefix}_${sanitizedName}`;
}

// 고유한 파일명 생성 함수 (중복 방지)
function generateUniqueFileName(originalFileName, customerName, photoType) {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const fileExtension = originalFileName.split('.').pop();
    const sanitizedName = customerName.replace(/[^a-zA-Z0-9가-힣]/g, '_');

    // 형식: 고객명_사진타입_타임스탬프_랜덤문자.확장자
    // 예: 홍길동_front_1698765432000_a3f5g2.jpg
    return `${sanitizedName}_${photoType}_${timestamp}_${randomStr}.${fileExtension}`;
}

// 고객 프롬프트 생성 함수
function generateCustomerPrompt(gender, bodyShape, height, weight) {
    const parts = [];

    // 1. 기본 문구
    parts.push('a photo of');

    // 2. 성별
    if (gender === 'male') {
        parts.push('a male person');
    } else {
        parts.push('a female person');
    }

    // 3. 체형
    if (bodyShape === '내추럴') {
        parts.push('natural body type, broad shoulders, long limbs, relaxed posture');
    } else if (bodyShape === '스트레이트') {
        parts.push('straight body type, balanced shoulders and hips, firm torso, vertical silhouette');
    } else if (bodyShape === '웨이브') {
        parts.push('wave body type, narrow shoulders, wider hips, soft curves, horizontal balance');
    }

    // 4. 키
    if (height === '170미만') {
        parts.push('short height, below 170cm');
    } else if (height === '170이상 180미만') {
        parts.push('average height, between 170cm and 180cm');
    } else if (height === '180이상') {
        parts.push('tall height, above 180cm');
    }

    // 5. 몸무게
    if (weight === '60kg미만') {
        parts.push('slim build, under 60kg');
    } else if (weight === '60~80') {
        parts.push('average build, between 60kg and 80kg');
    } else if (weight === '80이상') {
        parts.push('large build, over 80kg');
    }

    return parts.join(', ');
}

async function saveCustomerPhotos() {
    // 로딩 상태 시작
    const saveBtn = document.getElementById('savePhotosBtn');
    const btnText = saveBtn.querySelector('.btn-text');
    const btnSpinner = saveBtn.querySelector('.btn-spinner');
    const cancelBtn = document.getElementById('cancelModalBtn');

    saveBtn.disabled = true;
    cancelBtn.disabled = true;
    btnText.style.display = 'none';
    btnSpinner.style.display = 'inline-flex';

    try {
        // 1. 고객 기본 정보 수집
        const nameInput = document.getElementById('customerName').value.trim();
        const name = nameInput || `고객${Date.now()}`;
        const displayName = nameInput || '임의고객';  // 화면 표시용
        const phone = document.getElementById('customerPhone').value.trim();
        const email = document.getElementById('customerEmail')?.value.trim() || '';
        const genderRadio = document.querySelector('input[name="gender"]:checked');
        const gender = genderRadio ? genderRadio.value : 'female';

        // 2. 고급 옵션 정보 수집
        const bodyShapeRadio = document.querySelector('input[name="bodyShape"]:checked');
        const bodyShape = bodyShapeRadio ? bodyShapeRadio.value : null;

        const heightRadio = document.querySelector('input[name="height"]:checked');
        const height = heightRadio ? heightRadio.value : null;

        const weightRadio = document.querySelector('input[name="weight"]:checked');
        const weight = weightRadio ? weightRadio.value : null;

        // 3. 고객 폴더명 생성 (날짜시간_고객명)
        const customerFolder = generateCustomerFolderName(name);

        // 4. 고객 사진 정보 (고유한 파일명 생성으로 중복 방지)
        const photos = {
            front: state.frontPhoto ? {
                originalFileName: state.frontPhoto.name,
                fileName: generateUniqueFileName(state.frontPhoto.name, name, 'front'),
                filePath: `customer_photos/${customerFolder}/${generateUniqueFileName(state.frontPhoto.name, name, 'front')}`,
                s3Key: null, // S3 업로드 후 업데이트 예정
                url: null
            } : null,
            side: state.sidePhoto ? {
                originalFileName: state.sidePhoto.name,
                fileName: generateUniqueFileName(state.sidePhoto.name, name, 'side'),
                filePath: `customer_photos/${customerFolder}/${generateUniqueFileName(state.sidePhoto.name, name, 'side')}`,
                s3Key: null,
                url: null
            } : null,
            angle: state.anglePhoto ? {
                originalFileName: state.anglePhoto.name,
                fileName: generateUniqueFileName(state.anglePhoto.name, name, 'angle'),
                filePath: `customer_photos/${customerFolder}/${generateUniqueFileName(state.anglePhoto.name, name, 'angle')}`,
                s3Key: null,
                url: null
            } : null
        };

        // 5. 고객 프롬프트 생성
        const customerPrompt = generateCustomerPrompt(gender, bodyShape, height, weight);
        console.log('🤖 생성된 고객 프롬프트:', customerPrompt);

        // 6. FormData로 파일과 데이터 함께 전송
        const formData = new FormData();
        formData.append('name', name);
        formData.append('phone', phone);
        formData.append('email', email);
        formData.append('gender', gender);
        if (bodyShape) formData.append('bodyShape', bodyShape);
        if (height) formData.append('height', height);
        if (weight) formData.append('weight', weight);
        formData.append('customerPrompt', customerPrompt);

        // 실제 파일 추가
        if (state.frontPhoto) {
            formData.append('frontPhoto', state.frontPhoto);
            console.log('📸 정면 사진 추가:', state.frontPhoto.name);
        }
        if (state.sidePhoto) {
            formData.append('sidePhoto', state.sidePhoto);
            console.log('📸 측면 사진 추가:', state.sidePhoto.name);
        }
        if (state.anglePhoto) {
            formData.append('anglePhoto', state.anglePhoto);
            console.log('📸 45도 사진 추가:', state.anglePhoto.name);
        }

        console.log('📤 고객 정보 저장 중 (파일 포함)');

        const response = await fetch(`${API_URL}/customers`, {
            method: 'POST',
            body: formData  // Content-Type은 자동으로 설정됨
        });

        if (!response.ok) {
            throw new Error('고객 정보 저장 실패');
        }

        const result = await response.json();
        console.log('✅ 고객 정보 저장 완료:', result);

        // 저장된 고객 ID를 state에 저장
        state.customerId = result.data._id;

        // 5. UI 업데이트
        renderThumbnails();
        const totalPhotos = [state.frontPhoto, state.sidePhoto, state.anglePhoto].filter(p => p !== null).length;

        if (totalPhotos > 0) {
            customerPlaceholder.style.display = 'none';
            customerPreviewSummary.style.display = 'flex';
        } else {
            customerPlaceholder.style.display = 'flex';
            customerPreviewSummary.style.display = 'none';
        }

        updateStartButton();
        closeCustomerPhotosModal();
        showNotification(`${displayName}님의 정보가 저장되었습니다.`, 'success');

    } catch (error) {
        console.error('❌ 고객 정보 저장 실패:', error);
        showNotification('고객 정보 저장 중 오류가 발생했습니다.', 'error');
    } finally {
        // 로딩 상태 종료
        saveBtn.disabled = false;
        cancelBtn.disabled = false;
        btnText.style.display = 'inline';
        btnSpinner.style.display = 'none';
    }
}

function renderThumbnails() {
    previewThumbnails.innerHTML = '';
    const photos = [
        { file: state.frontPhoto, label: '정면' },
        { file: state.sidePhoto, label: '측면' },
        { file: state.anglePhoto, label: '45도' }
    ];

    photos.forEach(photo => {
        if (photo.file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const thumbnailItem = document.createElement('div');
                thumbnailItem.className = 'thumbnail-item';
                const img = document.createElement('img');
                img.src = e.target.result;
                img.alt = photo.label;
                const label = document.createElement('div');
                label.className = 'thumbnail-label';
                label.textContent = photo.label;
                thumbnailItem.appendChild(img);
                thumbnailItem.appendChild(label);
                previewThumbnails.appendChild(thumbnailItem);
            };
            reader.readAsDataURL(photo.file);
        }
    });
}

// Customer modal photo handlers
function handleModalPhotoSelect(e, type) {
    const file = e.target.files[0];
    if (file) processModalPhoto(file, type);
}

function processModalPhoto(file, type) {
    if (file.size > 10 * 1024 * 1024) {
        showNotification('파일 크기는 10MB를 초과할 수 없습니다.', 'error');
        return;
    }

    if (type === 'front') {
        state.frontPhoto = file;
        renderModalPhoto(file, 'front');
    } else if (type === 'side') {
        state.sidePhoto = file;
        renderModalPhoto(file, 'side');
    } else if (type === 'angle') {
        state.anglePhoto = file;
        renderModalPhoto(file, 'angle');
    }
    updateSaveButton();
}

function renderModalPhoto(file, type) {
    let placeholder, preview;
    if (type === 'front') {
        placeholder = frontPlaceholder;
        preview = frontPreview;
    } else if (type === 'side') {
        placeholder = sidePlaceholder;
        preview = sidePreview;
    } else if (type === 'angle') {
        placeholder = anglePlaceholder;
        preview = anglePreview;
    }

    preview.innerHTML = '';
    if (!file) {
        placeholder.style.display = 'flex';
        preview.classList.remove('active');
        return;
    }

    placeholder.style.display = 'none';
    preview.classList.add('active');

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = document.createElement('img');
        img.src = e.target.result;
        img.alt = `${type} 사진`;
        const removeBtn = document.createElement('button');
        removeBtn.className = 'photo-remove-btn';
        removeBtn.innerHTML = '×';
        removeBtn.onclick = (event) => {
            event.stopPropagation();
            removeModalPhoto(type);
        };
        preview.appendChild(img);
        preview.appendChild(removeBtn);
    };
    reader.readAsDataURL(file);
}

function removeModalPhoto(type) {
    if (type === 'front') {
        state.frontPhoto = null;
        frontPhotoInput.value = '';
        renderModalPhoto(null, 'front');
    } else if (type === 'side') {
        state.sidePhoto = null;
        sidePhotoInput.value = '';
        renderModalPhoto(null, 'side');
    } else if (type === 'angle') {
        state.anglePhoto = null;
        anglePhotoInput.value = '';
        renderModalPhoto(null, 'angle');
    }
    updateSaveButton();
}

function updateSaveButton() {
    savePhotosBtn.disabled = state.frontPhoto === null;
}

// Clothing Modal functions
async function openClothingModal() {
    clothingModal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // 메인페이지의 성별 선택을 가져와서 모달창 성별에 자동 반영
    const selectedGenderRadio = document.querySelector('input[name="gender"]:checked');
    if (selectedGenderRadio) {
        const mainPageGender = selectedGenderRadio.value; // 'male' or 'female'
        const modalGender = mainPageGender === 'male' ? 'male' : 'female';

        // 모달창의 성별 버튼 자동 선택
        state.currentGender = modalGender;
        document.querySelectorAll('[data-gender]').forEach(btn => btn.classList.remove('active'));
        const targetBtn = document.querySelector(`[data-gender="${modalGender}"]`);
        if (targetBtn) {
            targetBtn.classList.add('active');
        }
    }

    const bodyStyleGroup = document.getElementById('bodyStyleGroup');
    const categoryGroup = document.getElementById('categoryGroup');

    // 고급옵션의 체형 선택을 가져와서 모달창 체형에 자동 반영
    const selectedBodyShapeRadio = document.querySelector('input[name="bodyShape"]:checked');
    if (selectedBodyShapeRadio) {
        const bodyShape = selectedBodyShapeRadio.value; // '내추럴', '스트레이트', '웨이브'

        // 체형 버튼 자동 선택 및 해당 체형의 카테고리 로드
        state.currentBodyStyle = bodyShape;
        document.querySelectorAll('[data-bodystyle]').forEach(btn => btn.classList.remove('active'));
        const targetBodyStyleBtn = document.querySelector(`[data-bodystyle="${bodyShape}"]`);
        if (targetBodyStyleBtn) {
            targetBodyStyleBtn.classList.add('active');
        }

        // 체형이 선택되어 있으면 카테고리 버튼도 표시하고 데이터 로드
        bodyStyleGroup.style.display = 'block';
        categoryGroup.style.display = 'block';

        const categoryButtons = document.getElementById('categoryButtons');
        categoryButtons.innerHTML = '<p style="text-align: center; color: var(--gray-500);">로딩 중...</p>';
        sampleClothesGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--gray-500);">의류 목록을 불러오는 중...</p>';

        // 해당 체형의 카테고리 로드
        await loadSampleClothes(state.currentGender, bodyShape);
        renderCategoryButtons();
        renderSampleClothes();
    } else {
        // 체형이 선택되지 않은 경우 초기 상태
        bodyStyleGroup.style.display = 'block';
        categoryGroup.style.display = 'none';
        sampleClothesGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--gray-500);">체형을 선택해주세요.</p>';
    }
}

function closeClothingModal() {
    clothingModal.classList.remove('active');
    document.body.style.overflow = '';
}

function handleClothingUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
        showNotification('파일 크기는 10MB를 초과할 수 없습니다.', 'error');
        return;
    }

    state.clothingPhoto = file;
    state.clothingSource = 'upload';
    state.selectedSample = null;

    // Clear sample selection
    document.querySelectorAll('.sample-item').forEach(item => item.classList.remove('selected'));

    // Render preview in modal
    clothingModalPlaceholder.style.display = 'none';
    clothingModalPreview.classList.add('active');
    clothingModalPreview.innerHTML = '';

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = document.createElement('img');
        img.src = e.target.result;
        clothingModalPreview.appendChild(img);
    };
    reader.readAsDataURL(file);

    saveClothingBtn.disabled = false;
}

// Render category buttons dynamically based on current gender
// Load sample clothes from S3 API
async function loadSampleClothes(gender, bodyStyle = null, category = null) {
    try {
        let url = `${API_URL}/sample-clothes?gender=${gender}`;
        if (bodyStyle) url += `&bodyStyle=${bodyStyle}`;
        if (category) url += `&category=${category}`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to load sample clothes');
        }

        const data = await response.json();
        sampleClothesData.items = data.data.items || [];
        sampleClothesData.groupedByCategory = data.data.groupedByCategory || {};
        sampleClothesData.categories = Object.keys(data.data.groupedByCategory || {});

        console.log('✅ Loaded sample clothes:', sampleClothesData);
        return sampleClothesData;
    } catch (error) {
        console.error('❌ Error loading sample clothes:', error);
        sampleClothesData = { items: [], groupedByCategory: {}, categories: [] };
        return sampleClothesData;
    }
}

function renderCategoryButtons() {
    const categoryButtons = document.getElementById('categoryButtons');
    categoryButtons.innerHTML = '';

    const categories = sampleClothesData.categories || [];

    if (categories.length === 0) {
        categoryButtons.innerHTML = '<p style="text-align: center; color: var(--gray-500);">카테고리가 없습니다.</p>';
        return;
    }

    // 맨 앞에 "추천" 버튼 추가
    const recommendBtn = document.createElement('button');
    recommendBtn.className = 'filter-btn';
    recommendBtn.dataset.category = '추천';
    recommendBtn.textContent = '추천';

    // 추천이 현재 선택된 카테고리인 경우 active
    if (state.currentCategory === '추천') {
        recommendBtn.classList.add('active');
    }

    recommendBtn.addEventListener('click', () => handleCategoryChange('추천'));
    categoryButtons.appendChild(recommendBtn);

    // Set default category if not set or doesn't exist in new gender
    if (!state.currentCategory || (!categories.includes(state.currentCategory) && state.currentCategory !== '추천')) {
        state.currentCategory = '추천';  // 기본값을 추천으로 설정
        recommendBtn.classList.add('active');
    }

    // 기존 카테고리 버튼들 추가
    categories.forEach((category, index) => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.dataset.category = category;
        btn.textContent = category;

        if (category === state.currentCategory) {
            btn.classList.add('active');
        }

        btn.addEventListener('click', () => handleCategoryChange(category));
        categoryButtons.appendChild(btn);
    });
}

async function handleGenderChange(gender) {
    state.currentGender = gender;
    state.currentBodyStyle = null;
    state.currentCategory = null;

    document.querySelectorAll('[data-gender]').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-gender="${gender}"]`).classList.add('active');

    const bodyStyleGroup = document.getElementById('bodyStyleGroup');
    const categoryGroup = document.getElementById('categoryGroup');

    // 남성/여성 모두 체형 선택 버튼 표시
    bodyStyleGroup.style.display = 'block';
    categoryGroup.style.display = 'none';

    // 체형 버튼 활성화 상태 초기화
    document.querySelectorAll('[data-bodystyle]').forEach(btn => btn.classList.remove('active'));

    sampleClothesGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--gray-500);">체형을 선택해주세요.</p>';
}

async function handleBodyStyleChange(bodyStyle) {
    state.currentBodyStyle = bodyStyle;
    state.currentCategory = null;

    document.querySelectorAll('[data-bodystyle]').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-bodystyle="${bodyStyle}"]`).classList.add('active');

    const categoryGroup = document.getElementById('categoryGroup');
    categoryGroup.style.display = 'block';

    const categoryButtons = document.getElementById('categoryButtons');
    categoryButtons.innerHTML = '<p style="text-align: center; color: var(--gray-500);">로딩 중...</p>';
    sampleClothesGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--gray-500);">의류 목록을 불러오는 중...</p>';

    // 해당 체형의 카테고리 로드
    await loadSampleClothes(state.currentGender, bodyStyle);
    renderCategoryButtons();
    renderSampleClothes();
}

async function handleCategoryChange(category) {
    state.currentCategory = category;
    document.querySelectorAll('[data-category]').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-category="${category}"]`).classList.add('active');

    sampleClothesGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--gray-500);">의류 목록을 불러오는 중...</p>';

    // "추천" 카테고리는 모든 카테고리 의류를 보여줌 (category 파라미터 없이 로드)
    if (category === '추천') {
        await loadSampleClothes(state.currentGender, state.currentBodyStyle, null);
    } else {
        // 특정 카테고리의 이미지만 로드
        await loadSampleClothes(state.currentGender, state.currentBodyStyle, category);
    }
    renderSampleClothes();
}

function renderSampleClothes() {
    sampleClothesGrid.innerHTML = '';

    let clothes = [];

    // "추천" 카테고리는 모든 카테고리의 의류를 표시
    if (state.currentCategory === '추천') {
        clothes = sampleClothesData.items || [];
    } else {
        // 특정 카테고리의 의류만 표시
        clothes = sampleClothesData.groupedByCategory[state.currentCategory] || [];
    }

    if (clothes.length === 0) {
        sampleClothesGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--gray-500);">준비된 예시가 없습니다.</p>';
        return;
    }

    clothes.forEach(item => {
        const sampleItem = document.createElement('div');
        sampleItem.className = 'sample-item';
        if (state.selectedSample === item.s3Key) {
            sampleItem.classList.add('selected');
        }

        sampleItem.innerHTML = `
            <img src="${item.url}" alt="${item.fileName}">
            <div class="sample-item-name">${item.fileName}</div>
            <div class="selected-indicator">✓</div>
        `;

        sampleItem.onclick = () => selectSampleClothing(item);
        sampleClothesGrid.appendChild(sampleItem);
    });
}

function selectSampleClothing(item) {
    state.selectedSample = item.s3Key;
    state.clothingSource = 'sample';
    state.clothingPhoto = item.url;
    state.clothingS3Key = item.s3Key; // Store S3 key for backend

    // Update UI
    document.querySelectorAll('.sample-item').forEach(el => el.classList.remove('selected'));
    event.currentTarget.classList.add('selected');

    // Show preview in modal
    clothingModalPlaceholder.style.display = 'none';
    clothingModalPreview.classList.add('active');
    clothingModalPreview.innerHTML = `<img src="${item.url}" alt="${item.fileName}">`;

    // Clear file input
    clothingPhotoInput.value = '';

    saveClothingBtn.disabled = false;
}

function saveClothing() {
    if (!state.clothingPhoto) return;

    // Render thumbnail
    clothingThumbnail.innerHTML = '';
    const img = document.createElement('img');

    if (state.clothingSource === 'upload') {
        const reader = new FileReader();
        reader.onload = (e) => {
            img.src = e.target.result;
        };
        reader.readAsDataURL(state.clothingPhoto);
    } else {
        img.src = state.clothingPhoto;
    }

    const label = document.createElement('div');
    label.className = 'thumbnail-label';
    label.textContent = state.clothingSource === 'upload' ? '업로드' : '예시';

    clothingThumbnail.appendChild(img);
    clothingThumbnail.appendChild(label);

    clothingPlaceholder.style.display = 'none';
    clothingPreviewSummary.style.display = 'flex';

    updateStartButton();
    closeClothingModal();
    showNotification('의류가 선택되었습니다.', 'success');
}

// Update start button state
function updateStartButton() {
    const hasFrontPhoto = state.frontPhoto !== null;
    const hasClothing = state.clothingPhoto !== null;
    startFittingBtn.disabled = !(hasFrontPhoto && hasClothing);
}

// Handle start fitting
async function handleStartFitting() {
    if (state.isProcessing) return;
    state.isProcessing = true;
    showLoadingModal();

    try {
        // Get customer info
        let customerName = customerNameInput.value.trim();
        if (!customerName) {
            customerName = `고객${customerCounter}`;
            customerCounter++;
        }
        const customerPhone = customerPhoneInput.value.trim();

        // 1. Upload customer photo
        console.log('고객 사진 업로드 중...');
        const gender = document.querySelector('input[name="gender"]:checked').value;

        // Get advanced options (체형 정보)
        const bodyShapeInput = document.querySelector('input[name="bodyShape"]:checked');
        const heightInput = document.querySelector('input[name="height"]:checked');
        const weightInput = document.querySelector('input[name="weight"]:checked');

        const customerFormData = new FormData();
        customerFormData.append('customerPhoto', state.frontPhoto);
        customerFormData.append('name', customerName);
        customerFormData.append('gender', gender);
        if (customerPhone) {
            customerFormData.append('phone', customerPhone);
        }
        // 체형 정보 추가
        if (bodyShapeInput) {
            customerFormData.append('bodyShape', bodyShapeInput.value);
        }
        if (heightInput) {
            customerFormData.append('height', heightInput.value);
        }
        if (weightInput) {
            customerFormData.append('weight', weightInput.value);
        }

        const customerUploadResponse = await fetch(`${API_URL}/images/upload-customer`, {
            method: 'POST',
            body: customerFormData
        });

        if (!customerUploadResponse.ok) {
            throw new Error('고객 사진 업로드 실패');
        }

        const customerData = await customerUploadResponse.json();
        console.log('고객 사진 업로드 완료:', customerData);

        // 2. Upload or get clothing image
        let clothingImageUrl;
        let clothingItemId;

        if (state.clothingSource === 'upload') {
            console.log('의류 이미지 업로드 중...');
            const clothingFormData = new FormData();
            clothingFormData.append('clothingImage', state.clothingPhoto);
            clothingFormData.append('name', '고객 업로드 의류');
            clothingFormData.append('category', 'top');
            clothingFormData.append('color', 'unknown');

            const clothingUploadResponse = await fetch(`${API_URL}/images/upload-clothing`, {
                method: 'POST',
                body: clothingFormData
            });

            if (!clothingUploadResponse.ok) {
                throw new Error('의류 이미지 업로드 실패');
            }

            const clothingData = await clothingUploadResponse.json();
            clothingImageUrl = clothingData.data.image.url;
            clothingItemId = clothingData.data._id;
            console.log('의류 이미지 업로드 완료:', clothingData);
        } else {
            // Sample clothing - use S3 URL directly
            console.log('샘플 의류 사용 중...');
            clothingImageUrl = state.clothingPhoto; // This is the S3 signed URL
            clothingItemId = state.clothingS3Key; // Use S3 key as ID for sample clothes
            console.log('샘플 의류 선택 완료:', { url: clothingImageUrl, s3Key: clothingItemId });
        }

        // 3. Create virtual fitting (gender and body info already retrieved above)
        console.log('AI 가상 피팅 생성 중...');
        const fittingRequestBody = {
            customerId: customerData.data.customerId,
            clothingItemId: clothingItemId,
            customerPhotoUrl: customerData.data.url,
            customerPhotoS3Key: customerData.data.s3Key,
            clothingImageUrl: clothingImageUrl,
            gender: gender
        };

        // 체형 정보 추가 (선택 시에만)
        if (bodyShapeInput) fittingRequestBody.bodyShape = bodyShapeInput.value;
        if (heightInput) fittingRequestBody.height = heightInput.value;
        if (weightInput) fittingRequestBody.weight = weightInput.value;

        const fittingResponse = await fetch(`${API_URL}/fitting/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(fittingRequestBody)
        });

        if (!fittingResponse.ok) {
            throw new Error('가상 피팅 생성 실패');
        }

        const fittingData = await fittingResponse.json();
        const fittingRecordId = fittingData.data.fittingRecordId;
        console.log('가상 피팅 시작:', fittingData);

        // 4. Poll for result
        console.log('AI 처리 대기 중...');
        let attempts = 0;
        const maxAttempts = 60; // 최대 2분 대기
        let resultData;

        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // 2초 대기

            const resultResponse = await fetch(`${API_URL}/fitting/result/${fittingRecordId}`);
            if (!resultResponse.ok) {
                throw new Error('결과 조회 실패');
            }

            resultData = await resultResponse.json();
            console.log(`처리 상태 (${attempts + 1}/${maxAttempts}):`, resultData.data.status);

            if (resultData.data.status === 'completed') {
                break;
            } else if (resultData.data.status === 'failed') {
                throw new Error('AI 피팅 처리 실패');
            }

            attempts++;
        }

        if (resultData.data.status !== 'completed') {
            throw new Error('처리 시간 초과');
        }

        // Create result object
        const result = {
            id: fittingRecordId,
            customerName: customerName,
            customerPhone: customerPhone,
            timestamp: new Date().toLocaleString('ko-KR'),
            frontPhoto: state.frontPhoto,
            resultImageUrl: resultData.data.resultImage.url, // S3 URL
            clothingSource: state.clothingSource
        };

        // Save to history
        fittingHistory.push(result);

        // Show result modal
        showResultModal(result);

        // Render history
        renderHistory();

        // Show history section if hidden
        if (historySection.style.display === 'none') {
            historySection.style.display = 'block';
        }

        // Clear inputs for next fitting
        customerNameInput.value = '';
        customerPhoneInput.value = '';

        showNotification('AI 피팅이 완료되었습니다!', 'success');
    } catch (error) {
        console.error('Fitting error:', error);
        showNotification(`처리 중 오류: ${error.message}`, 'error');
    } finally {
        state.isProcessing = false;
        hideLoadingModal();
    }
}

// Handle reset
function handleReset() {
    if (confirm('모든 업로드된 이미지를 삭제하시겠습니까?')) {
        state.frontPhoto = null;
        state.sidePhoto = null;
        state.anglePhoto = null;
        state.clothingPhoto = null;
        state.clothingSource = null;
        state.selectedSample = null;

        renderModalPhoto(null, 'front');
        renderModalPhoto(null, 'side');
        renderModalPhoto(null, 'angle');

        customerPlaceholder.style.display = 'flex';
        customerPreviewSummary.style.display = 'none';
        clothingPlaceholder.style.display = 'flex';
        clothingPreviewSummary.style.display = 'none';

        frontPhotoInput.value = '';
        sidePhotoInput.value = '';
        anglePhotoInput.value = '';
        clothingPhotoInput.value = '';

        clothingModalPlaceholder.style.display = 'flex';
        clothingModalPreview.classList.remove('active');
        clothingModalPreview.innerHTML = '';

        updateStartButton();
        updateSaveButton();
        saveClothingBtn.disabled = true;

        showNotification('초기화되었습니다.', 'info');
    }
}

// Modal controls
function showLoadingModal() {
    loadingModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function hideLoadingModal() {
    loadingModal.classList.remove('active');
    document.body.style.overflow = '';
}

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '1rem 1.5rem',
        borderRadius: '0.5rem',
        background: type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#3B82F6',
        color: 'white',
        fontWeight: '600',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        zIndex: '10000',
        animation: 'slideIn 0.3s ease',
        maxWidth: '400px'
    });

    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
}

// Smooth scroll helper
function scrollToUpload() {
    const uploadSection = document.getElementById('upload');
    uploadSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Add animation keyframes
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Navigation active state
function updateActiveNav() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            if (scrollY >= sectionTop - 200) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });
}

updateActiveNav();
document.addEventListener('submit', (e) => e.preventDefault());

// Result Modal Functions
function showResultModal(result) {
    // Store result data for continue fitting
    currentResultData = result;

    // Set result image
    resultImageContainer.innerHTML = '';
    const img = document.createElement('img');

    if (result.resultImageUrl) {
        // Use S3 URL from backend
        img.src = result.resultImageUrl;
        img.alt = 'AI 피팅 결과';
    } else {
        // Fallback: use front photo (for old history items)
        const reader = new FileReader();
        reader.onload = (e) => {
            img.src = e.target.result;
        };
        reader.readAsDataURL(result.frontPhoto);
    }

    resultImageContainer.appendChild(img);

    // Set customer info
    resultCustomerName.textContent = result.customerName;
    resultTimestamp.textContent = result.timestamp;

    if (result.customerPhone) {
        resultCustomerPhone.textContent = result.customerPhone;
        resultPhoneContainer.style.display = 'flex';
    } else {
        resultPhoneContainer.style.display = 'none';
    }

    // Show modal
    resultModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeResultModal() {
    resultModal.classList.remove('active');
    document.body.style.overflow = '';
}

function downloadResult() {
    // Get the current result image
    const img = resultImageContainer.querySelector('img');
    if (!img) return;

    // Create download link
    const link = document.createElement('a');
    link.download = `fitting_result_${Date.now()}.jpg`;
    link.href = img.src;
    link.click();

    showNotification('결과 이미지가 다운로드되었습니다.', 'success');
}

async function continueFitting() {
    if (!currentResultData || !currentResultData.resultImageUrl) {
        showNotification('결과 이미지를 불러올 수 없습니다.', 'error');
        return;
    }

    try {
        showNotification('피팅 결과를 고객 사진으로 설정 중...', 'info');

        // Fetch the result image from S3 via proxy (CORS 우회)
        const proxyUrl = `${API_URL}/images/proxy?url=${encodeURIComponent(currentResultData.resultImageUrl)}`;
        console.log('🔄 프록시를 통한 이미지 다운로드:', proxyUrl);

        const response = await fetch(proxyUrl);
        if (!response.ok) {
            throw new Error('이미지 다운로드 실패');
        }
        const blob = await response.blob();

        // Convert blob to File object
        const file = new File([blob], `fitting_result_${Date.now()}.jpg`, { type: 'image/jpeg' });

        // Set as customer photo in state
        state.frontPhoto = file;

        // 🆕 고객 정보를 /api/customers 엔드포인트로 업로드
        console.log('📤 피팅 결과 이미지를 고객 사진으로 업로드 중...');

        const formData = new FormData();
        formData.append('name', `추가피팅_${Date.now()}`);
        formData.append('gender', state.currentGender || 'female');
        formData.append('frontPhoto', file);  // 피팅 결과 이미지를 정면 사진으로 전송

        const uploadResponse = await fetch(`${API_URL}/customers`, {
            method: 'POST',
            body: formData
        });

        if (!uploadResponse.ok) {
            throw new Error('고객 사진 업로드 실패');
        }

        const uploadData = await uploadResponse.json();
        console.log('✅ 고객 사진 업로드 완료:', uploadData);

        // Update state with new customer ID and photo
        state.customerId = uploadData.data._id;

        // UI 업데이트: 메인 화면에 썸네일 표시
        renderThumbnails();
        customerPlaceholder.style.display = 'none';
        customerPreviewSummary.style.display = 'flex';

        // Close result modal
        closeResultModal();

        // Scroll to clothing selection
        const uploadSection = document.getElementById('upload');
        uploadSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Open clothing modal for next fitting
        setTimeout(() => {
            openClothingModal();
            showNotification('추가 피팅을 위한 의류를 선택해주세요!', 'success');
        }, 500);

    } catch (error) {
        console.error('❌ Continue fitting error:', error);
        showNotification('추가 피팅 설정 중 오류가 발생했습니다.', 'error');
    }
}

// History Functions
function renderHistory() {
    if (fittingHistory.length === 0) {
        historySection.style.display = 'none';
        return;
    }

    historyGrid.innerHTML = '';

    // Render in reverse order (newest first)
    [...fittingHistory].reverse().forEach(result => {
        const card = document.createElement('div');
        card.className = 'history-card';
        card.onclick = () => showResultModal(result);

        const cardImage = document.createElement('div');
        cardImage.className = 'history-card-image';
        const img = document.createElement('img');
        const reader = new FileReader();
        reader.onload = (e) => {
            img.src = e.target.result;
        };
        reader.readAsDataURL(result.frontPhoto);
        cardImage.appendChild(img);

        const cardContent = document.createElement('div');
        cardContent.className = 'history-card-content';

        const cardTitle = document.createElement('h3');
        cardTitle.className = 'history-card-title';
        cardTitle.textContent = result.customerName;

        const cardMeta = document.createElement('div');
        cardMeta.className = 'history-card-meta';

        const timeItem = document.createElement('div');
        timeItem.className = 'history-card-meta-item';
        timeItem.innerHTML = `<strong>피팅 시간:</strong> ${result.timestamp}`;

        cardMeta.appendChild(timeItem);

        if (result.customerPhone) {
            const phoneItem = document.createElement('div');
            phoneItem.className = 'history-card-meta-item';
            phoneItem.innerHTML = `<strong>연락처:</strong> ${result.customerPhone}`;
            cardMeta.appendChild(phoneItem);
        }

        cardContent.appendChild(cardTitle);
        cardContent.appendChild(cardMeta);

        card.appendChild(cardImage);
        card.appendChild(cardContent);

        historyGrid.appendChild(card);
    });
}

// ===== Modal Advanced Options Toggle =====
const modalAdvancedToggle = document.getElementById('modalAdvancedToggle');
const modalAdvancedContent = document.getElementById('modalAdvancedContent');

if (modalAdvancedToggle && modalAdvancedContent) {
    modalAdvancedToggle.addEventListener('click', () => {
        modalAdvancedToggle.classList.toggle('active');
        modalAdvancedContent.classList.toggle('active');
    });
}

console.log('APL Fit initialized successfully');
