document.addEventListener('DOMContentLoaded', () => {
    const timeline = document.getElementById('photoTimeline');
    const loadingSpinner = document.getElementById('loadingSpinner');
    let page = 1;
    let loading = false;

    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    const searchBtn = document.getElementById('searchBtn');
    const resetBtn = document.getElementById('resetBtn');

    // 设置默认日期范围（最近一个月）
    const today = new Date();
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    startDate.valueAsDate = lastMonth;
    endDate.valueAsDate = today;

    // 从服务器获取照片
    async function getPhotosFromStorage() {
        try {
            const response = await fetch('http://localhost:3000/photos');
            if (!response.ok) {
                throw new Error('获取照片失败');
            }
            const photos = await response.json();
            return photos.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        } catch (error) {
            console.error('获取照片错误:', error);
            return [];
        }
    }

    // 修改照片卡片创建函数，添加更多信息展示
    function createPhotoCard(photo) {
        const card = document.createElement('article');
        card.className = 'photo-card';

        // 添加勾选框
        const selectDiv = document.createElement('div');
        selectDiv.className = 'photo-select';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.addEventListener('change', handlePhotoSelect);
        selectDiv.appendChild(checkbox);
        card.appendChild(selectDiv);

        const header = document.createElement('header');
        header.className = 'photo-header';
        
        const date = document.createElement('div');
        date.className = 'photo-date';
        date.innerHTML = `<i class="fas fa-calendar-alt"></i> ${new Date(photo.timestamp).toLocaleString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })}`;
        
        header.appendChild(date);
        
        const content = document.createElement('div');
        content.className = 'photo-content';
        
        const img = document.createElement('img');
        img.src = photo.imgData;
        img.loading = 'lazy';
        content.appendChild(img);
        
        if (photo.note) {
            const description = document.createElement('div');
            description.className = 'photo-description';
            description.textContent = photo.note;
            content.appendChild(description);
        }
        
        card.appendChild(header);
        card.appendChild(content);
        
        return card;
    }

    // 修改加载照片函数为异步
    async function loadPhotos() {
        if (loading) return;
        
        loading = true;
        loadingSpinner.style.display = 'block';
        
        try {
            const photos = await getPhotosFromStorage();
            const start = (page - 1) * 5;
            const end = start + 5;
            const currentPagePhotos = photos.slice(start, end);
            
            currentPagePhotos.forEach(photo => {
                const card = createPhotoCard(photo);
                timeline.appendChild(card);
            });
            
            if (currentPagePhotos.length < 5) {
                window.removeEventListener('scroll', handleScroll);
            } else {
                page++;
            }
            updatePhotoStats();
        } catch (error) {
            console.error('加载照片错误:', error);
        } finally {
            loading = false;
            loadingSpinner.style.display = 'none';
        }
    }

    // 处理滚动加载
    function handleScroll() {
        const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
        
        if (scrollTop + clientHeight >= scrollHeight - 100) {
            loadPhotos();
        }
    }

    // 初始加载
    loadPhotos();

    // 添加滚动监听
    window.addEventListener('scroll', handleScroll);

    // 添加到现有代码的开头
    function updatePhotoStats() {
        const photos = getPhotosFromStorage();
        const uniqueDates = new Set(photos.map(photo => photo.date));
        
        document.getElementById('photoCount').textContent = photos.length;
        document.getElementById('dateCount').textContent = uniqueDates.size;
    }

    // 搜索功能
    function filterPhotosByDate() {
        const start = new Date(startDate.value);
        const end = new Date(endDate.value);
        end.setHours(23, 59, 59, 999); // 设置到当天最后一毫秒

        const photos = getPhotosFromStorage();
        const filteredPhotos = photos.filter(photo => {
            const photoDate = new Date(photo.date);
            return photoDate >= start && photoDate <= end;
        });

        // 清空现有照片
        timeline.innerHTML = '';
        
        // 显示筛选结果
        filteredPhotos.forEach(photo => {
            const card = createPhotoCard(photo);
            timeline.appendChild(card);
        });

        // 更新统计信息
        document.getElementById('photoCount').textContent = filteredPhotos.length;
        const uniqueDates = new Set(filteredPhotos.map(photo => photo.date.split('T')[0]));
        document.getElementById('dateCount').textContent = uniqueDates.size;
    }

    // 重置功能
    function resetSearch() {
        startDate.valueAsDate = lastMonth;
        endDate.valueAsDate = today;
        page = 1;
        timeline.innerHTML = '';
        loadPhotos(); // 重新加载所有照片
    }

    // 添加事件监听
    searchBtn.addEventListener('click', filterPhotosByDate);
    resetBtn.addEventListener('click', resetSearch);

    // 日期输入验证
    endDate.addEventListener('change', () => {
        if (startDate.value && new Date(endDate.value) < new Date(startDate.value)) {
            alert('结束日期不能早于��始日期');
            endDate.value = startDate.value;
        }
    });

    startDate.addEventListener('change', () => {
        if (endDate.value && new Date(startDate.value) > new Date(endDate.value)) {
            alert('开始日期不能晚于结束日期');
            startDate.value = endDate.value;
        }
    });

    // 添加全选和下载功能
    const selectAll = document.getElementById('selectAll');
    const downloadBtn = document.getElementById('downloadBtn');
    
    selectAll.addEventListener('change', () => {
        const checkboxes = document.querySelectorAll('.photo-select input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = selectAll.checked;
            const card = checkbox.closest('.photo-card');
            card.classList.toggle('selected', selectAll.checked);
        });
        updateDownloadButton();
    });
    
    function handlePhotoSelect(e) {
        const card = e.target.closest('.photo-card');
        card.classList.toggle('selected', e.target.checked);
        
        // 更新全选状态
        const checkboxes = document.querySelectorAll('.photo-select input[type="checkbox"]');
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        selectAll.checked = allChecked;
        
        updateDownloadButton();
    }
    
    function updateDownloadButton() {
        const selectedPhotos = document.querySelectorAll('.photo-select input[type="checkbox"]:checked');
        downloadBtn.disabled = selectedPhotos.length === 0;
    }
    
    // 下载功能
    downloadBtn.addEventListener('click', () => {
        const selectedPhotos = document.querySelectorAll('.photo-card.selected img');
        selectedPhotos.forEach((img, index) => {
            const link = document.createElement('a');
            link.href = img.src;
            link.download = `photo_${index + 1}.jpg`;
            link.click();
        });
    });
}); 