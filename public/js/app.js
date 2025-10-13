// APL Fit - Frontend JavaScript

// State management
const state = {
    customerPhotos: [],
    clothingPhoto: null,
    isProcessing: false
};

// DOM elements
const customerUploadArea = document.getElementById('customerUploadArea');
const customerPhotoInput = document.getElementById('customerPhoto');
const customerPlaceholder = document.getElementById('customerPlaceholder');
const customerPreview = document.getElementById('customerPreview');

const clothingUploadArea = document.getElementById('clothingUploadArea');
const clothingPhotoInput = document.getElementById('clothingPhoto');
const clothingPlaceholder = document.getElementById('clothingPlaceholder');
const clothingPreview = document.getElementById('clothingPreview');

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
    // Customer photo upload
    customerPlaceholder.addEventListener('click', () => customerPhotoInput.click());
    customerPhotoInput.addEventListener('change', handleCustomerPhotoSelect);

    // Clothing photo upload
    clothingPlaceholder.addEventListener('click', () => clothingPhotoInput.click());
    clothingPhotoInput.addEventListener('change', handleClothingPhotoSelect);

    // Drag and drop for customer photos
    customerUploadArea.addEventListener('dragover', handleDragOver);
    customerUploadArea.addEventListener('drop', handleCustomerPhotoDrop);
    customerUploadArea.addEventListener('dragleave', handleDragLeave);

    // Drag and drop for clothing photos
    clothingUploadArea.addEventListener('dragover', handleDragOver);
    clothingUploadArea.addEventListener('drop', handleClothingPhotoDrop);
    clothingUploadArea.addEventListener('dragleave', handleDragLeave);

    // Action buttons
    startFittingBtn.addEventListener('click', handleStartFitting);
    resetBtn.addEventListener('click', handleReset);
}

// Drag and drop handlers
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

function handleCustomerPhotoDrop(e) {
    e.preventDefault();
    e.stopPropagation();

    handleDragLeave(e);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length > 0) {
        processCustomerPhotos(imageFiles);
    }
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

// Customer photo handlers
function handleCustomerPhotoSelect(e) {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
        processCustomerPhotos(files);
    }
}

function processCustomerPhotos(files) {
    // Validate file size (10MB max)
    const validFiles = files.filter(file => {
        if (file.size > 10 * 1024 * 1024) {
            showNotification('파일 크기는 10MB를 초과할 수 없습니다.', 'error');
            return false;
        }
        return true;
    });

    if (validFiles.length === 0) return;

    // Add to state
    state.customerPhotos = [...state.customerPhotos, ...validFiles];

    // Update UI
    renderCustomerPhotos();
    updateStartButton();
}

function renderCustomerPhotos() {
    customerPreview.innerHTML = '';

    if (state.customerPhotos.length === 0) {
        customerPlaceholder.style.display = 'flex';
        customerPreview.classList.remove('active');
        return;
    }

    customerPlaceholder.style.display = 'none';
    customerPreview.classList.add('active');

    state.customerPhotos.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewItem = createPreviewItem(e.target.result, index, 'customer');
            customerPreview.appendChild(previewItem);
        };
        reader.readAsDataURL(file);
    });
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

    // Update state
    state.clothingPhoto = file;

    // Update UI
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
        const previewItem = createPreviewItem(e.target.result, 0, 'clothing');
        clothingPreview.appendChild(previewItem);
    };
    reader.readAsDataURL(state.clothingPhoto);
}

// Create preview item
function createPreviewItem(src, index, type) {
    const item = document.createElement('div');
    item.className = 'preview-item';

    const img = document.createElement('img');
    img.src = src;
    img.alt = type === 'customer' ? '고객 사진' : '의류 이미지';

    const removeBtn = document.createElement('button');
    removeBtn.className = 'preview-remove';
    removeBtn.innerHTML = '×';
    removeBtn.onclick = () => removePhoto(index, type);

    item.appendChild(img);
    item.appendChild(removeBtn);

    return item;
}

// Remove photo
function removePhoto(index, type) {
    if (type === 'customer') {
        state.customerPhotos.splice(index, 1);
        renderCustomerPhotos();
    } else {
        state.clothingPhoto = null;
        renderClothingPhoto();
    }
    updateStartButton();
}

// Update start button state
function updateStartButton() {
    const hasCustomerPhotos = state.customerPhotos.length > 0;
    const hasClothingPhoto = state.clothingPhoto !== null;

    startFittingBtn.disabled = !(hasCustomerPhotos && hasClothingPhoto);
}

// Handle start fitting
async function handleStartFitting() {
    if (state.isProcessing) return;

    state.isProcessing = true;
    showLoadingModal();

    try {
        // Simulate AI processing (in production, this would be an API call)
        await simulateAIProcessing();

        // Show success message
        showNotification('AI 피팅이 완료되었습니다!', 'success');

        // In production, this would redirect to results page or show results
        console.log('Fitting completed with:', {
            customerPhotos: state.customerPhotos.length,
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

// Simulate AI processing
function simulateAIProcessing() {
    return new Promise((resolve) => {
        setTimeout(resolve, 3000);
    });
}

// Handle reset
function handleReset() {
    if (confirm('모든 업로드된 이미지를 삭제하시겠습니까?')) {
        state.customerPhotos = [];
        state.clothingPhoto = null;

        renderCustomerPhotos();
        renderClothingPhoto();
        updateStartButton();

        // Reset file inputs
        customerPhotoInput.value = '';
        clothingPhotoInput.value = '';

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
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // Add styles
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

    // Add to DOM
    document.body.appendChild(notification);

    // Auto remove after 3 seconds
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

// Prevent default form submission (if forms are added later)
document.addEventListener('submit', (e) => {
    e.preventDefault();
});

// Log initialization
console.log('APL Fit initialized successfully');
