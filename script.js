document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const browseBtn = document.getElementById('browseBtn');
    const uploadBtn = document.getElementById('uploadBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const photoDate = document.getElementById('photoDate');
    const photoNote = document.getElementById('photoNote');
    const photoGallery = document.getElementById('photoGallery');
    const uploadPrompt = document.getElementById('uploadPrompt');
    const previewArea = document.getElementById('previewArea');
    const previewGrid = document.getElementById('previewGrid');
    const selectedFiles = new Set();

    // 设置默认日期为今天
    photoDate.valueAsDate = new Date();

    // 拖放功能
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });

    // 点击选择文件
    browseBtn.addEventListener('click', () => {
        fileInput.click();
    });

    // 当选择文件后直接处理上传
    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    // 处理文件选择
    function handleFiles(files) {
        uploadPrompt.style.display = 'none';
        previewArea.style.display = 'block';
        
        Array.from(files).forEach(file => {
            if (!selectedFiles.has(file) && file.type.startsWith('image/')) {
                selectedFiles.add(file);
                const reader = new FileReader();
                
                reader.onload = (e) => {
                    const previewItem = document.createElement('div');
                    previewItem.className = 'preview-item';
                    
                    previewItem.innerHTML = `
                        <img src="${e.target.result}" alt="预览图片">
                        <div class="preview-remove" onclick="removePreview(this)">
                            <i class="fas fa-times"></i>
                        </div>
                    `;
                    
                    previewGrid.appendChild(previewItem);
                };
                
                reader.readAsDataURL(file);
            }
        });
    }

    // 移除预览图片
    function removePreview(element) {
        const previewItem = element.parentElement;
        previewItem.remove();
        
        // 如果没有预览图片了，显示上传提示
        if (previewGrid.children.length === 0) {
            uploadPrompt.style.display = 'block';
            previewArea.style.display = 'none';
        }
    }

    // 添加照片到画廊
    async function addPhotoToGallery(imgData, date, note) {
        try {
            // 发送照片数据到服务器
            const response = await fetch('http://localhost:3000/photos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    imgData,
                    date,
                    note,
                    timestamp: new Date().toISOString()
                })
            });

            if (!response.ok) {
                throw new Error('上传失败');
            }

            const photoData = await response.json();
            const photoItem = createPhotoItem(photoData);
            
            // 将新照片插入到顶部
            if (photoGallery.firstChild) {
                photoGallery.insertBefore(photoItem, photoGallery.firstChild);
            } else {
                photoGallery.appendChild(photoItem);
            }

            showUploadSuccess();
        } catch (error) {
            console.error('保存照片错误:', error);
            alert('上传失败，请重试');
            throw error;
        }
    }

    // 修改创建照片项的函数
    function createPhotoItem(photo) {
        const photoPost = document.createElement('div');
        photoPost.className = 'photo-post';
        
        // 创建帖子头部
        const header = document.createElement('div');
        header.className = 'photo-post-header';
        
        const dateElement = document.createElement('div');
        dateElement.className = 'photo-post-date';
        dateElement.innerHTML = `<i class="fas fa-calendar-alt"></i> ${new Date(photo.date).toLocaleString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })}`;
        
        header.appendChild(dateElement);
        photoPost.appendChild(header);
        
        // 创建帖子内容
        const content = document.createElement('div');
        content.className = 'photo-post-content';
        
        const img = document.createElement('img');
        img.src = photo.imgData;
        img.loading = 'lazy';
        content.appendChild(img);
        
        if (photo.note) {
            const noteElement = document.createElement('div');
            noteElement.className = 'photo-post-note';
            noteElement.textContent = photo.note;
            content.appendChild(noteElement);
        }
        
        photoPost.appendChild(content);
        return photoPost;
    }

    // 添加上传区域的拖放高亮效果
    dropZone.addEventListener('dragenter', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
        dropZone.style.transform = 'scale(1.02)';
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
        dropZone.style.transform = 'scale(1)';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        dropZone.style.transform = 'scale(1)';
        handleFiles(e.dataTransfer.files);
    });

    // 添加上传成功提示动画
    function showUploadSuccess() {
        const successMessage = document.getElementById('uploadSuccess');
        successMessage.style.display = 'flex';
        successMessage.style.opacity = '1';
        
        setTimeout(() => {
            successMessage.style.opacity = '0';
            setTimeout(() => {
                successMessage.style.display = 'none';
            }, 300);
        }, 2000);
    }

    // 添加加载动画
    function showLoadingAnimation() {
        const loading = document.createElement('div');
        loading.className = 'loading-animation';
        loading.innerHTML = `
            <div class="spinner"></div>
            <span>正在上传照片...</span>
        `;
        photoGallery.insertBefore(loading, photoGallery.firstChild);
        return loading;
    }

    // 上传按钮点击事件
    uploadBtn.addEventListener('click', async () => {
        const date = photoDate.value;
        if (!date) {
            alert('请选择照片日期！');
            return;
        }

        const note = photoNote.value;
        const loading = showLoadingAnimation();
        let uploadedCount = 0;
        
        // 获取所有预览图片的数据
        const previews = previewGrid.querySelectorAll('.preview-item img');
        const totalFiles = previews.length;

        if (totalFiles === 0) {
            alert('请选择要上传的照片！');
            loading.remove();
            return;
        }

        try {
            for (const preview of previews) {
                await addPhotoToGallery(preview.src, date, note);
                uploadedCount++;
            }
            
            loading.remove();
            showUploadSuccess();
            resetUploadArea();
        } catch (error) {
            console.error('上传处理错误:', error);
            alert('上传处理过程中出现错误，请重试！');
            loading.remove();
        }
    });

    // 取消按钮点击事件
    cancelBtn.addEventListener('click', resetUploadArea);

    // 重置上传区域
    function resetUploadArea() {
        fileInput.value = '';
        photoNote.value = '';
        selectedFiles.clear();
        previewGrid.innerHTML = '';
        uploadPrompt.style.display = 'block';
        previewArea.style.display = 'none';
    }
}); 