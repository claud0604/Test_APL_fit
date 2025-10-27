// APL Fit - Frontend JavaScript

// API Configuration
// Cloudflare Proxy + Nginx를 통한 HTTPS 백엔드
const API_URL = 'https://apl-fit-test-connect.apls.kr/api';
console.log('🌐 API URL:', API_URL);

// Sample clothes data
const sampleClothes = {
    female: {
        원피스: [
            { id: 'dress1', name: '원피스 1', path: 'sample-clothes/여성/원피스1.jpg' },
            { id: 'dress2', name: '원피스 2', path: 'sample-clothes/여성/원피스2.jpg' },
            { id: 'dress3', name: '원피스 3', path: 'sample-clothes/여성/원피스3.jpg' }
        ],
        티셔츠: [
            { id: 'tshirt1', name: '티셔츠 1', path: 'sample-clothes/여성/티셔츠1.jpg' },
            { id: 'tshirt2', name: '티셔츠 2', path: 'sample-clothes/여성/티셔츠2.jpg' }
        ]
    },
    male: {
        티셔츠: [
            { id: 'male_tshirt1', name: '티셔츠 1', path: 'sample-clothes/남성/티셔츠1.jpg' }
        ]
    }
};

// Fitting history storage
let fittingHistory = [];
let customerCounter = 1;

// State management
const state = {
    frontPhoto: null,
    sidePhoto: null,
    anglePhoto: null,
    clothingPhoto: null,
    clothingSource: null, // 'upload' or 'sample'
    selectedSample: null,
    currentGender: 'female',
    currentCategory: null, // Will be set dynamically
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
const resultImageContainer = document.getElementById('resultImageContainer');
const resultCustomerName = document.getElementById('resultCustomerName');
const resultCustomerPhone = document.getElementById('resultCustomerPhone');
const resultPhoneContainer = document.getElementById('resultPhoneContainer');
const resultTimestamp = document.getElementById('resultTimestamp');

// DOM elements - History
const historySection = document.getElementById('history');
const historyGrid = document.getElementById('historyGrid');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeDefaultCategory();
    initializeEventListeners();
    updateStartButton();
    renderCategoryButtons();
    renderSampleClothes();
});

// Set default category based on current gender
function initializeDefaultCategory() {
    const categories = Object.keys(sampleClothes[state.currentGender]);
    if (categories.length > 0) {
        state.currentCategory = categories[0];
    }
}

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

    // Clothing modal upload
    clothingModalUploadBox.addEventListener('click', () => clothingPhotoInput.click());
    clothingPhotoInput.addEventListener('change', handleClothingUpload);

    // Filter buttons
    document.querySelectorAll('[data-gender]').forEach(btn => {
        btn.addEventListener('click', (e) => handleGenderChange(e.target.dataset.gender));
    });

    // Action buttons
    startFittingBtn.addEventListener('click', handleStartFitting);
    resetBtn.addEventListener('click', handleReset);

    // Result modal
    closeResultModalBtn.addEventListener('click', closeResultModal);
    closeResultBtn.addEventListener('click', closeResultModal);
    downloadResultBtn.addEventListener('click', downloadResult);

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

function saveCustomerPhotos() {
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
    showNotification(`${totalPhotos}장의 사진이 저장되었습니다.`, 'success');
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
function openClothingModal() {
    clothingModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    renderSampleClothes();
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
function renderCategoryButtons() {
    const categoryButtons = document.getElementById('categoryButtons');
    categoryButtons.innerHTML = '';

    const categories = Object.keys(sampleClothes[state.currentGender]);

    // Set default category if not set or doesn't exist in new gender
    if (!state.currentCategory || !categories.includes(state.currentCategory)) {
        state.currentCategory = categories.length > 0 ? categories[0] : null;
    }

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

function handleGenderChange(gender) {
    state.currentGender = gender;
    document.querySelectorAll('[data-gender]').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-gender="${gender}"]`).classList.add('active');

    // Re-render category buttons for the new gender
    renderCategoryButtons();
    renderSampleClothes();
}

function handleCategoryChange(category) {
    state.currentCategory = category;
    document.querySelectorAll('[data-category]').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-category="${category}"]`).classList.add('active');
    renderSampleClothes();
}

function renderSampleClothes() {
    sampleClothesGrid.innerHTML = '';
    const clothes = sampleClothes[state.currentGender][state.currentCategory] || [];

    if (clothes.length === 0) {
        sampleClothesGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--gray-500);">준비된 예시가 없습니다.</p>';
        return;
    }

    clothes.forEach(item => {
        const sampleItem = document.createElement('div');
        sampleItem.className = 'sample-item';
        if (state.selectedSample === item.id) {
            sampleItem.classList.add('selected');
        }

        sampleItem.innerHTML = `
            <img src="${item.path}" alt="${item.name}">
            <div class="sample-item-name">${item.name}</div>
            <div class="selected-indicator">✓</div>
        `;

        sampleItem.onclick = () => selectSampleClothing(item);
        sampleClothesGrid.appendChild(sampleItem);
    });
}

function selectSampleClothing(item) {
    state.selectedSample = item.id;
    state.clothingSource = 'sample';
    state.clothingPhoto = item.path;

    // Update UI
    document.querySelectorAll('.sample-item').forEach(el => el.classList.remove('selected'));
    event.currentTarget.classList.add('selected');

    // Show preview in modal
    clothingModalPlaceholder.style.display = 'none';
    clothingModalPreview.classList.add('active');
    clothingModalPreview.innerHTML = `<img src="${item.path}" alt="${item.name}">`;

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

        const customerFormData = new FormData();
        customerFormData.append('customerPhoto', state.frontPhoto);
        customerFormData.append('name', customerName);
        customerFormData.append('gender', gender);
        if (customerPhone) {
            customerFormData.append('phone', customerPhone);
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
            // Sample clothing - not yet uploaded to S3
            throw new Error('샘플 의류는 아직 지원되지 않습니다. 의류를 직접 업로드해주세요.');
        }

        // 3. Get gender for prompt
        const gender = document.querySelector('input[name="gender"]:checked').value;
        const genderText = gender === 'male' ? 'man' : 'woman';

        // 4. Create virtual fitting
        console.log('AI 가상 피팅 생성 중...');
        const fittingResponse = await fetch(`${API_URL}/fitting/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                customerId: customerData.data.customerId,
                clothingItemId: clothingItemId,
                customerPhotoUrl: customerData.data.url,
                customerPhotoS3Key: customerData.data.s3Key,
                clothingImageUrl: clothingImageUrl,
                gender: gender  // 성별 정보 전송
            })
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

console.log('APL Fit initialized successfully');
console.log('Sample clothes:', sampleClothes);
