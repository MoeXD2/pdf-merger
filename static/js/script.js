// static/js/script.js
const fileInput = document.getElementById('file-input');
const fileList = document.getElementById('file-list');
const mergeBtn = document.getElementById('merge-btn');
const resetBtn = document.getElementById('reset-btn');
let uploadedFiles = [];

fileInput.addEventListener('change', handleFileSelect);
mergeBtn.addEventListener('click', mergePDFs);
resetBtn.addEventListener('click', resetApp);

function handleFileSelect(event) {
    const files = event.target.files;
    Array.from(files).forEach(uploadFile);
}

async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    showFileListOverlay();

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        uploadedFiles.push(result);
        renderFileList();
        updateMergeButton();
    } catch (error) {
        console.error('Error uploading file:', error);
        showToast('Error uploading file', 'error');
    } finally {
        hideFileListOverlay();
    }
}

function renderFileList() {
    fileList.innerHTML = '';
    uploadedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item d-flex align-items-center mb-3 p-2';
        fileItem.style.border = '1px solid #ddd'; 
        fileItem.style.borderRadius = '5px'; 
        fileItem.style.backgroundColor = '#f8f9fa'; 
        fileItem.draggable = true;
        fileItem.dataset.index = index;

        fileItem.innerHTML = `
            <i class="bi bi-file-earmark-pdf me-2"></i>
            <span class="flex-grow-1">${file.name}</span>
            <button class="btn btn-sm btn-outline-secondary me-1 move-up-btn" data-index="${index}" ${index === 0 ? 'disabled' : ''}>
                <i class="bi bi-arrow-up"></i>
            </button>
            <button class="btn btn-sm btn-outline-secondary me-1 move-down-btn" data-index="${index}" ${index === uploadedFiles.length - 1 ? 'disabled' : ''}>
                <i class="bi bi-arrow-down"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger remove-btn" data-index="${index}">
                <i class="bi bi-trash"></i>
            </button>
        `;
        fileList.appendChild(fileItem);

        // Add drag and drop event listeners
        fileItem.addEventListener('dragstart', dragStart);
        fileItem.addEventListener('dragover', dragOver);
        fileItem.addEventListener('drop', drop);
        fileItem.addEventListener('dragenter', dragEnter);
        fileItem.addEventListener('dragleave', dragLeave);
    });

    document.querySelectorAll('.move-up-btn').forEach(btn => btn.addEventListener('click', moveFileUp));
    document.querySelectorAll('.move-down-btn').forEach(btn => btn.addEventListener('click', moveFileDown));
    document.querySelectorAll('.remove-btn').forEach(btn => btn.addEventListener('click', removeFile));
}

function updateMergeButton() {
    mergeBtn.disabled = uploadedFiles.length < 2;
    resetBtn.disabled = uploadedFiles.length === 0;
}

function moveFileUp(event) {
    const index = parseInt(event.currentTarget.dataset.index);
    if (index > 0) {
        const temp = uploadedFiles[index];
        uploadedFiles[index] = uploadedFiles[index - 1];
        uploadedFiles[index - 1] = temp;
        renderFileList();
    }
}

function moveFileDown(event) {
    const index = parseInt(event.currentTarget.dataset.index);
    if (index < uploadedFiles.length - 1) {
        const temp = uploadedFiles[index];
        uploadedFiles[index] = uploadedFiles[index + 1];
        uploadedFiles[index + 1] = temp;
        renderFileList();
    }
}

function removeFile(event) {
    const index = parseInt(event.currentTarget.dataset.index);
    uploadedFiles.splice(index, 1);
    renderFileList();
    updateMergeButton();
}

function dragStart(e) {
    e.dataTransfer.setData('text/plain', e.target.dataset.index);
    e.target.style.opacity = '0.5';
}

function dragOver(e) {
    e.preventDefault();
}

function dragEnter(e) {
    e.target.closest('.file-item').style.border = '2px dashed #007bff';
}

function dragLeave(e) {
    e.target.closest('.file-item').style.border = '1px solid #ddd';
}

function drop(e) {
    e.preventDefault();
    const draggedIndex = parseInt(e.dataTransfer.getData('text'));
    const targetIndex = parseInt(e.target.closest('.file-item').dataset.index);
    
    if (draggedIndex !== targetIndex) {
        const [removed] = uploadedFiles.splice(draggedIndex, 1);
        uploadedFiles.splice(targetIndex, 0, removed);
        renderFileList();
    }
    
    e.target.closest('.file-item').style.border = '1px solid #ddd';
}

async function mergePDFs() {
    const fileOrder = uploadedFiles.map(file => file.id).join(',');
    
    showMergeSpinner();
    
    try {
        const response = await fetch('/merge', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `file_order=${fileOrder}`
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'merged.pdf';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            showToast('PDFs merged successfully!', 'success');
        } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Merge failed');
        }
    } catch (error) {
        console.error('Error merging PDFs:', error);
        showToast('Error merging PDFs: ' + error.message, 'error');
    } finally {
        hideMergeSpinner();
    }
}

function resetApp() {
    uploadedFiles = [];
    renderFileList();
    updateMergeButton();
    fileInput.value = '';
    
    // Restore the placeholder message
    fileList.innerHTML = `
        <p id="file-placeholder" class="text-center text-muted" style="font-size: 1.1rem; opacity: 0.7;">
            Your uploaded PDF files will appear here for merging.
        </p>`;
    
    showToast('App reset successfully', 'success');
}

function showToast(message, type) {
    const toast = document.getElementById(`${type}Toast`);
    const toastBody = toast.querySelector('.toast-body');
    toastBody.textContent = message;
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
}

function showFileListOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'file-list-overlay';
    overlay.innerHTML = '<div class="spinner-border file-list-spinner text-primary" role="status"><span class="visually-hidden">Loading...</span></div>';
    fileList.appendChild(overlay);
}

function hideFileListOverlay() {
    const overlay = fileList.querySelector('.file-list-overlay');
    if (overlay) {
        overlay.remove();
    }
}

function showMergeSpinner() {
    const spinner = mergeBtn.querySelector('.spinner-border');
    spinner.classList.remove('d-none');
    mergeBtn.disabled = true;
}

function hideMergeSpinner() {
    const spinner = mergeBtn.querySelector('.spinner-border');
    spinner.classList.add('d-none');
    mergeBtn.disabled = false;
    updateMergeButton();
}
