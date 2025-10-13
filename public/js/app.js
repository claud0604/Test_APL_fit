// APL Fit - Frontend JavaScript

// State management
const state = {
    frontPhoto: null,
    sidePhoto: null,
    anglePhoto: null,
    clothingPhoto: null,
    isProcessing: false
};

// DOM elements - Main upload area
const customerUploadArea = document.getElementById('customerUploadArea');
const customerPlaceholder = document.getElementById('customerPlaceholder');
const customerPreviewSummary = document.getElementById('customerPreviewSummary');
const previewThumbnails = document.getElementById('previewThumbnails');
const editPhotosBtn = document.getElementById('editPhotosBtn');

// DOM elements - Modal
const customerPhotosModal = document.getElementById('customerPhotosModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const savePhotosBtn = document.getElementById('savePhotosBtn');

// DOM elements - Modal uploads
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
const clothingPhotoInput = document.getElementById('clothingPhoto');
const clothingPlaceholder = document.getElementById('clothingPlaceholder');
const clothingPreview = document.getElementById('clothingPreview');

// DOM elements - Actions
const startFittingBtn = document.getElementById('startFittingBtn');
const resetBtn = document.getElementById('resetBtn');
const loadingModal = document.getElementById('loadingModal');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    updateStartButton();
});

// Event listeners setup
function initializeEventListeners() {
    // Open modal when clicking customer upload area
    customerPlaceholder.addEventListener('click', openCustomerPhotosModal);
    editPhotosBtn.addEventListener('click', openCustomerPhotosModal);

    // Modal controls
    closeModalBtn.addEventListener('click', closeCustomerPhotosModal);
    cancelModalBtn.addEventListener('click', closeCustomerPhotosModal);
    savePhotosBtn.addEventListener('click', saveCustomerPhotos);

    // Modal photo uploads
    frontUploadBox.addEventListener('click', () => frontPhotoInput.click());
    frontPhotoInput.addEventListener('change', (e) => handleModalPhotoSelect(e, 'front'));

    sideUploadBox.addEventListener('click', () => sidePhotoInput.click());
    sidePhotoInput.addEventListener('change', (e) => handleModalPhotoSelect(e, 'side'));

    angleUploadBox.addEventListener('click', () => anglePhotoInput.click());
    anglePhotoInput.addEventListener('change', (e) => handleModalPhotoSelect(e, 'angle'));

    // Clothing photo upload
    clothingPlaceholder.addEventListener('click', () => clothingPhotoInput.click());
    clothingPhotoInput.addEventListener('change', handleClothingPhotoSelect);
    clothingUploadArea.addEventListener('dragover', handleDragOver);
    clothingUploadArea.addEventListener('drop', handleClothingPhotoDrop);
    clothingUploadArea.addEventListener('dragleave', handleDragLeave);

    // Action buttons
    startFittingBtn.addEventListener('click', handleStartFitting);
    resetBtn.addEventListener('click', handleReset);

    // Close modal on background click
    customerPhotosModal.addEventListener('click', (e) => {
        if (e.target === customerPhotosModal) {
            closeCustomerPhotosModal();
        }
    });
}

// Modal functions
function openCustomerPhotosModal() {
    customerPhotosModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCustomerPhotosModal() {
    customerPhotosModal.classList.remove('active');
    document.body.style.overflow = '';
}

function saveCustomerPhotos() {
    // Update thumbnails
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

// Modal photo handlers
function handleModalPhotoSelect(e, type) {
    const file = e.target.files[0];
    if (file) {
        processModalPhoto(file, type);
    }
}

function processModalPhoto(file, type) {
    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
        showNotification('파일 크기는 10MB를 초과할 수 없습니다.', 'error');
        return;
    }

    // Update state
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
    // Enable save button if at least front photo is uploaded
    savePhotosBtn.disabled = state.frontPhoto === null;
}

// Drag and drop handlers for clothing
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.style.borderColor = 'var(--primary-color)';
    e.currentTarget.style.background = 'var(--gray-50)';
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.style.borderColor = '';
    e.currentTarget.style.background = '';
}

function handleClothingPhotoDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    handleDragLeave(e);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length > 0) {
        processClothingPhoto(imageFiles[0]);
    }
}

// Clothing photo handlers
function handleClothingPhotoSelect(e) {
    const file = e.target.files[0];
    if (file) {
        processClothingPhoto(file);
    }
}

function processClothingPhoto(file) {
    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
        showNotification('파일 크기는 10MB를 초과할 수 없습니다.', 'error');
        return;
    }

    state.clothingPhoto = file;
    renderClothingPhoto();
    updateStartButton();
}

function renderClothingPhoto() {
    clothingPreview.innerHTML = '';

    if (!state.clothingPhoto) {
        clothingPlaceholder.style.display = 'flex';
        clothingPreview.classList.remove('active');
        return;
    }

    clothingPlaceholder.style.display = 'none';
    clothingPreview.classList.add('active');

    const reader = new FileReader();
    reader.onload = (e) => {
        const item = document.createElement('div');
        item.className = 'preview-item';

        const img = document.createElement('img');
        img.src = e.target.result;
        img.alt = '의류 이미지';

        const removeBtn = document.createElement('button');
        removeBtn.className = 'preview-remove';
        removeBtn.innerHTML = '×';
        removeBtn.onclick = () => {
            state.clothingPhoto = null;
            clothingPhotoInput.value = '';
            renderClothingPhoto();
            updateStartButton();
        };

        item.appendChild(img);
        item.appendChild(removeBtn);
        clothingPreview.appendChild(item);
    };
    reader.readAsDataURL(state.clothingPhoto);
}

// Update start button state
function updateStartButton() {
    const hasFrontPhoto = state.frontPhoto !== null;
    const hasClothingPhoto = state.clothingPhoto !== null;

    startFittingBtn.disabled = !(hasFrontPhoto && hasClothingPhoto);
}

// Handle start fitting
async function handleStartFitting() {
    if (state.isProcessing) return;

    state.isProcessing = true;
    showLoadingModal();

    try {
        await simulateAIProcessing();

        showNotification('AI 피팅이 완료되었습니다!', 'success');

        const photoCount = [state.frontPhoto, state.sidePhoto, state.anglePhoto].filter(p => p !== null).length;
        console.log('Fitting completed with:', {
            customerPhotos: photoCount,
            frontPhoto: state.frontPhoto?.name,
            sidePhoto: state.sidePhoto?.name,
            anglePhoto: state.anglePhoto?.name,
            clothingPhoto: state.clothingPhoto.name
        });

    } catch (error) {
        console.error('Fitting error:', error);
        showNotification('처리 중 오류가 발생했습니다. 다시 시도해주세요.', 'error');
    } finally {
        state.isProcessing = false;
        hideLoadingModal();
    }
}

function simulateAIProcessing() {
    return new Promise((resolve) => {
        setTimeout(resolve, 3000);
    });
}

// Handle reset
function handleReset() {
    if (confirm('모든 업로드된 이미지를 삭제하시겠습니까?')) {
        state.frontPhoto = null;
        state.sidePhoto = null;
        state.anglePhoto = null;
        state.clothingPhoto = null;

        // Reset modal
        renderModalPhoto(null, 'front');
        renderModalPhoto(null, 'side');
        renderModalPhoto(null, 'angle');

        // Reset main view
        customerPlaceholder.style.display = 'flex';
        customerPreviewSummary.style.display = 'none';
        renderClothingPhoto();

        // Reset file inputs
        frontPhotoInput.value = '';
        sidePhotoInput.value = '';
        anglePhotoInput.value = '';
        clothingPhotoInput.value = '';

        updateStartButton();
        updateSaveButton();

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
        background: type === 'success' ? '#10B981' :
                   type === 'error' ? '#EF4444' :
                   '#3B82F6',
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
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
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
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
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
            const sectionHeight = section.clientHeight;
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

// Initialize navigation
updateActiveNav();

// Prevent default form submission
document.addEventListener('submit', (e) => {
    e.preventDefault();
});

// Log initialization
console.log('APL Fit initialized successfully');
console.log('Customer photos modal ready: front (required), side (optional), 45° angle (optional)');
