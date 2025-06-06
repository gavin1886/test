// 全局变量
let formData = [];
let quoteData = []; // 报价数据
let filteredData = [];
let currentForm = null;
let isAdmin = false;
let currentTab = 'all';

// 管理员密码（实际应用中应使用更安全的认证方式）
// 在生产环境中，应该使用服务器端验证和加密存储密码
const ADMIN_PASSWORD = '123456';
const MAX_LOGIN_ATTEMPTS = 5;
let loginAttempts = 0;
const LOCKOUT_TIME = 30 * 60 * 1000; // 30分钟锁定时间（毫秒）
let lockoutEndTime = 0;

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    // 从本地存储加载数据
    loadFormData();
    loadQuoteData(); // 加载报价数据
    
    // 初始化UI元素
    initUI();
    
    // 检查登录状态
    checkLoginStatus();
    
    // 检查是否处于锁定状态
    checkLockoutStatus();
});

// 从本地存储加载表单数据
function loadFormData() {
    const storedData = localStorage.getItem('formData');
    if (storedData) {
        try {
            formData = JSON.parse(storedData);
            // 对数据进行排序，最新提交的排在前面
            formData.sort((a, b) => new Date(b.submissionDate) - new Date(a.submissionDate));
            filteredData = [...formData];
        } catch (e) {
            console.error('解析本地存储数据失败:', e);
            formData = [];
            filteredData = [];
            showToast('数据加载失败，请刷新页面重试');
        }
    } else {
        formData = [];
        filteredData = [];
    }
}

// 从本地存储加载报价数据
function loadQuoteData() {
    const storedQuoteData = localStorage.getItem('quoteData');
    if (storedQuoteData) {
        try {
            quoteData = JSON.parse(storedQuoteData);
            // 对数据进行排序，最新提交的排在前面
            quoteData.sort((a, b) => new Date(b.submissionDate) - new Date(a.submissionDate));
            
            // 将报价数据合并到表单数据中，用于统一显示
            quoteData.forEach(quote => {
                // 确保不重复添加
                const exists = formData.some(form => 
                    form.projectName === quote.projectName && 
                    form.submissionDate === quote.submissionDate
                );
                
                if (!exists) {
                    formData.push({
                        // 基本信息占位
                        name: '未留联系方式',
                        phone: '未留联系方式',
                        wechat: '未留联系方式',
                        email: '',
                        
                        // 项目信息
                        projectName: quote.projectName,
                        version: quote.version,
                        appTypeCategory: quote.appTypeCategory,
                        deadline: quote.deadline,
                        
                        // 需求参数
                        pageScale: quote.pageScale,
                        dataScale: quote.dataScale,
                        uiDesign: quote.uiDesign,
                        requirements: quote.requirements || '无详细需求描述',
                        
                        // 评估结果
                        appTypeRating: quote.appTypeRating,
                        estimatedPrice: quote.estimatedPrice,
                        developmentTime: quote.developmentTime,
                        
                        // 元数据
                        submissionDate: quote.submissionDate,
                        status: quote.status || '仅保存报价',
                        
                        // 标记为仅报价数据
                        isQuoteOnly: true
                    });
                }
            });
            
            // 重新排序合并后的数据
            formData.sort((a, b) => new Date(b.submissionDate) - new Date(a.submissionDate));
            filteredData = [...formData];
        } catch (e) {
            console.error('解析报价数据失败:', e);
            showToast('报价数据加载失败');
        }
    }
}

// 保存表单数据到本地存储
function saveFormData() {
    try {
        localStorage.setItem('formData', JSON.stringify(formData));
    } catch (e) {
        console.error('保存数据到本地存储失败:', e);
        showToast('保存数据失败，请检查浏览器存储设置');
    }
}

// 初始化UI元素和事件监听
function initUI() {
    // 登录表单提交事件
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleLogin();
        });
    }
    
    // 退出登录按钮
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // 过滤按钮
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');
            
            // 更新按钮状态
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // 过滤数据
            filterFormData(filter);
            
            // 重新渲染列表
            renderFormList();
        });
    });
    
    // 初始化模态框
    const requirementModal = document.getElementById('requirementModal');
    if (requirementModal) {
        requirementModal.addEventListener('hidden.bs.modal', function() {
            // 清除当前表单
            currentForm = null;
        });
    }
    
    // 删除按钮
    const deleteBtn = document.querySelector('.delete-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', handleDeleteForm);
    }
    
    // 保存状态按钮
    const saveStatusBtn = document.querySelector('.save-status-btn');
    if (saveStatusBtn) {
        saveStatusBtn.addEventListener('click', handleSaveStatus);
    }
}

// 检查登录状态
function checkLoginStatus() {
    // 从会话存储中获取登录状态
    isAdmin = sessionStorage.getItem('isAdmin') === 'true';
    
    updateUIByLoginStatus();
}

// 检查是否处于锁定状态
function checkLockoutStatus() {
    // 从本地存储中获取锁定结束时间
    const storedLockoutEndTime = localStorage.getItem('adminLockoutEndTime');
    if (storedLockoutEndTime) {
        lockoutEndTime = parseInt(storedLockoutEndTime);
        
        // 如果当前时间小于锁定结束时间，则显示锁定信息
        const currentTime = Date.now();
        if (currentTime < lockoutEndTime) {
            const remainingMinutes = Math.ceil((lockoutEndTime - currentTime) / (60 * 1000));
            showToast(`由于多次登录失败，账户已被锁定。请在${remainingMinutes}分钟后重试。`);
            
            // 禁用登录按钮
            const submitBtn = document.querySelector('#loginForm button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                
                // 设置定时器，到达解锁时间后启用登录按钮
                setTimeout(() => {
                    submitBtn.disabled = false;
                    showToast('账户已解锁，可以重新登录');
                }, lockoutEndTime - currentTime);
            }
        } else {
            // 锁定时间已过，清除锁定状态
            localStorage.removeItem('adminLockoutEndTime');
            localStorage.removeItem('loginAttempts');
            loginAttempts = 0;
        }
    }
}

// 根据登录状态更新UI
function updateUIByLoginStatus() {
    const loginPage = document.getElementById('loginPage');
    const adminPage = document.getElementById('adminPage');
    
    if (isAdmin) {
        // 已登录状态
        if (loginPage) loginPage.style.display = 'none';
        if (adminPage) adminPage.style.display = 'block';
        
        // 显示表单数据
        renderFormList();
    } else {
        // 未登录状态
        if (loginPage) loginPage.style.display = 'block';
        if (adminPage) adminPage.style.display = 'none';
    }
}

// 处理登录逻辑
function handleLogin() {
    const passwordInput = document.getElementById('password');
    
    // 检查是否处于锁定状态
    const currentTime = Date.now();
    if (currentTime < lockoutEndTime) {
        const remainingMinutes = Math.ceil((lockoutEndTime - currentTime) / (60 * 1000));
        showToast(`由于多次登录失败，账户已被锁定。请在${remainingMinutes}分钟后重试。`);
        return;
    }
    
    // 获取存储的登录尝试次数
    const storedLoginAttempts = localStorage.getItem('loginAttempts');
    if (storedLoginAttempts) {
        loginAttempts = parseInt(storedLoginAttempts);
    }
    
    if (passwordInput && passwordInput.value === ADMIN_PASSWORD) {
        // 登录成功
        isAdmin = true;
        sessionStorage.setItem('isAdmin', 'true');
        
        // 重置登录尝试次数
        loginAttempts = 0;
        localStorage.removeItem('loginAttempts');
        
        updateUIByLoginStatus();
        showToast('登录成功，欢迎回来！');
    } else {
        // 登录失败
        loginAttempts++;
        localStorage.setItem('loginAttempts', loginAttempts);
        
        // 检查是否超过最大尝试次数
        if (loginAttempts >= MAX_LOGIN_ATTEMPTS) {
            // 设置锁定结束时间
            lockoutEndTime = currentTime + LOCKOUT_TIME;
            localStorage.setItem('adminLockoutEndTime', lockoutEndTime);
            
            showToast(`由于多次登录失败，账户已被锁定30分钟。请稍后重试。`);
            
            // 禁用登录按钮
            const submitBtn = document.querySelector('#loginForm button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                
                // 设置定时器，到达解锁时间后启用登录按钮
                setTimeout(() => {
                    submitBtn.disabled = false;
                    showToast('账户已解锁，可以重新登录');
                }, LOCKOUT_TIME);
            }
        } else {
            // 显示剩余尝试次数
            const remainingAttempts = MAX_LOGIN_ATTEMPTS - loginAttempts;
            showToast(`密码错误，还剩${remainingAttempts}次尝试机会`);
        }
    }
    
    // 清空密码输入框
    if (passwordInput) {
        passwordInput.value = '';
    }
}

// 处理退出登录
function handleLogout() {
    // 清除登录状态
    isAdmin = false;
    sessionStorage.removeItem('isAdmin');
    
    // 更新UI
    updateUIByLoginStatus();
    showToast('已退出登录');
}

// 过滤表单数据
function filterFormData(filter) {
    currentTab = filter || 'all';
    
    if (currentTab === 'all') {
        filteredData = [...formData];
    } else {
        filteredData = formData.filter(item => item.status === currentTab);
    }
}

// 渲染表单列表
function renderFormList() {
    const requirementList = document.getElementById('requirementList');
    if (!requirementList) return;
    
    if (filteredData.length === 0) {
        requirementList.innerHTML = `
            <div class="text-center py-5">
                <p class="text-muted">暂无需求数据</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    filteredData.forEach(item => {
        const statusClass = getStatusClass(item.status);
        const isQuoteOnly = item.isQuoteOnly === true;
        
        html += `
            <div class="card requirement-card mb-3 ${isQuoteOnly ? 'quote-only-card' : ''}">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${item.projectName || '未命名项目'}</strong>
                        ${isQuoteOnly ? '<span class="badge bg-info ms-2">仅报价</span>' : ''}
                    </div>
                    <span class="status-badge ${statusClass}">${item.status}</span>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <p class="mb-1"><strong>提交人：</strong>${isQuoteOnly ? '<em>未留联系方式</em>' : item.name}</p>
                            <p class="mb-1"><strong>联系方式：</strong>${isQuoteOnly ? '<em>未留联系方式</em>' : item.phone}</p>
                        </div>
                        <div class="col-md-6">
                            <p class="mb-1"><strong>提交时间：</strong>${item.submissionDate}</p>
                            <p class="mb-1"><strong>预估价格：</strong>${item.estimatedPrice || '未评估'}</p>
                        </div>
                    </div>
                    <div class="mt-3">
                        <p class="mb-1"><strong>需求描述：</strong></p>
                        <p class="text-muted">${truncateText(item.requirements, 100)}</p>
                    </div>
                    <div class="text-end mt-3">
                        <button class="btn btn-sm btn-primary" onclick="viewDetail('${item.id || item.submissionDate}')">查看详情</button>
                    </div>
                </div>
            </div>
        `;
    });
    
    requirementList.innerHTML = html;
}

// 截断文本
function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// 获取状态对应的CSS类
function getStatusClass(status) {
    switch (status) {
        case '待处理':
            return 'status-pending';
        case '处理中':
            return 'status-processing';
        case '已完成':
            return 'status-completed';
        case '已拒绝':
            return 'status-rejected';
        default:
            return 'status-pending';
    }
}

// 查看需求详情
function viewDetail(id) {
    // 查找对应的表单数据
    const form = formData.find(item => item.id === id);
    if (!form) {
        showToast('未找到对应的需求数据');
        return;
    }
    
    // 保存当前表单
    currentForm = form;
    
    // 填充详情模态框
    const detailContainer = document.querySelector('.requirement-detail');
    if (!detailContainer) return;
    
    const ratingDisplay = form.requirementRating?.totalRating || '未评级';
    const versionType = form.projectInfo.version === 'enterprise' ? '企业版' : '个人版';
    
    let html = `
        <div class="mb-4">
            <h4 class="mb-3">基本信息</h4>
            <div class="row detail-row">
                <div class="col-md-4"><span class="detail-label">提交人：</span></div>
                <div class="col-md-8">${form.basicInfo.name}</div>
            </div>
            <div class="row detail-row">
                <div class="col-md-4"><span class="detail-label">联系电话：</span></div>
                <div class="col-md-8">
                    ${form.basicInfo.phone}
                    <button class="btn btn-sm btn-outline-primary ms-2" onclick="makePhoneCall('${form.basicInfo.phone}')">拨打</button>
                </div>
            </div>
            <div class="row detail-row">
                <div class="col-md-4"><span class="detail-label">微信号：</span></div>
                <div class="col-md-8">
                    ${form.basicInfo.wechat}
                    <button class="btn btn-sm btn-outline-primary ms-2" onclick="copyContent('${form.basicInfo.wechat}')">复制</button>
                </div>
            </div>
            ${form.basicInfo.email ? `
                <div class="row detail-row">
                    <div class="col-md-4"><span class="detail-label">电子邮箱：</span></div>
                    <div class="col-md-8">${form.basicInfo.email}</div>
                </div>
            ` : ''}
        </div>
        
        <div class="mb-4">
            <h4 class="mb-3">项目信息</h4>
            <div class="row detail-row">
                <div class="col-md-4"><span class="detail-label">项目名称：</span></div>
                <div class="col-md-8">${form.projectInfo.projectName}</div>
            </div>
            <div class="row detail-row">
                <div class="col-md-4"><span class="detail-label">版本类型：</span></div>
                <div class="col-md-8">${versionType}</div>
            </div>
            ${form.projectInfo.budget ? `
                <div class="row detail-row">
                    <div class="col-md-4"><span class="detail-label">预算范围：</span></div>
                    <div class="col-md-8">${form.projectInfo.budget}</div>
                </div>
            ` : ''}
            ${form.projectInfo.deadline ? `
                <div class="row detail-row">
                    <div class="col-md-4"><span class="detail-label">期望完成时间：</span></div>
                    <div class="col-md-8">${form.projectInfo.deadline}</div>
                </div>
            ` : ''}
        </div>
        
        <div class="mb-4">
            <h4 class="mb-3">需求评级</h4>
            <div class="row detail-row">
                <div class="col-md-4"><span class="detail-label">小程序类型：</span></div>
                <div class="col-md-8">${getAppTypeText(form.requirementRating?.appType)}</div>
            </div>
            <div class="row detail-row">
                <div class="col-md-4"><span class="detail-label">数据规模：</span></div>
                <div class="col-md-8">${getDataScaleText(form.requirementRating?.dataScale)}</div>
            </div>
            <div class="row detail-row">
                <div class="col-md-4"><span class="detail-label">UI设计级别：</span></div>
                <div class="col-md-8">${getUIDesignText(form.requirementRating?.uiDesign)}</div>
            </div>
            <div class="row detail-row">
                <div class="col-md-4"><span class="detail-label">项目星级：</span></div>
                <div class="col-md-8">
                    <span class="rating-display">${ratingDisplay}</span>
                </div>
            </div>
            <div class="row detail-row">
                <div class="col-md-4"><span class="detail-label">预估价格：</span></div>
                <div class="col-md-8">${form.requirementRating?.estimatedPrice || '未评估'}</div>
            </div>
            <div class="row detail-row">
                <div class="col-md-4"><span class="detail-label">开发周期：</span></div>
                <div class="col-md-8">${form.requirementRating?.developmentTime || '未评估'}</div>
            </div>
        </div>
        
        <div class="mb-4">
            <h4 class="mb-3">需求描述</h4>
            <div class="p-3 bg-light rounded">
                ${form.requirements.replace(/\n/g, '<br>')}
            </div>
        </div>
        
        <div class="mb-4">
            <h4 class="mb-3">处理状态</h4>
            <div class="mb-3">
                <label for="statusSelect" class="form-label">选择状态</label>
                <select class="form-control" id="statusSelect">
                    <option value="待处理" ${form.status === '待处理' ? 'selected' : ''}>待处理</option>
                    <option value="处理中" ${form.status === '处理中' ? 'selected' : ''}>处理中</option>
                    <option value="已完成" ${form.status === '已完成' ? 'selected' : ''}>已完成</option>
                    <option value="已拒绝" ${form.status === '已拒绝' ? 'selected' : ''}>已拒绝</option>
                </select>
            </div>
            <div class="mb-3">
                <label for="statusNote" class="form-label">处理备注</label>
                <textarea class="form-control" id="statusNote" rows="3">${form.statusNote || ''}</textarea>
            </div>
        </div>
    `;
    
    detailContainer.innerHTML = html;
    
    // 显示模态框
    const modal = new bootstrap.Modal(document.getElementById('requirementModal'));
    modal.show();
}

// 获取小程序类型文本
function getAppTypeText(type) {
    const types = {
        'basic': '基础级（展示型）',
        'standard': '标准级（功能型）',
        'business': '商业级（商业应用型）',
        'enterprise': '企业级（高级商业型）',
        'custom': '定制级（企业级定制型）'
    };
    return types[type] || type || '未指定';
}

// 获取数据规模文本
function getDataScaleText(scale) {
    const scales = {
        'micro': '微型（<100用户/日）',
        'small': '小型（100-1,000用户/日）',
        'medium': '中型（1,000-10,000用户/日）',
        'large': '大型（10,000-100,000用户/日）',
        'xlarge': '超大型（>100,000用户/日）'
    };
    return scales[scale] || scale || '未指定';
}

// 获取UI设计级别文本
function getUIDesignText(design) {
    const designs = {
        'basic': '基础UI（微信基础组件）',
        'simple': '简单UI（现成模板）',
        'standard': '标准UI（定制设计）',
        'professional': '专业级UI（全定制设计）',
        'premium': '高端定制UI（独特创意设计）'
    };
    return designs[design] || design || '未指定';
}

// 隐藏详情模态框
function hideDetailModal() {
    const modal = bootstrap.Modal.getInstance(document.getElementById('requirementModal'));
    if (modal) {
        modal.hide();
    }
    currentForm = null;
}

// 拨打电话
function makePhoneCall(phone) {
    window.location.href = `tel:${phone}`;
}

// 复制内容到剪贴板
function copyContent(content) {
    navigator.clipboard.writeText(content)
        .then(() => {
            showToast('已复制到剪贴板');
        })
        .catch(err => {
            console.error('复制失败:', err);
            showToast('复制失败，请手动复制');
        });
}

// 保存状态更改
function handleSaveStatus() {
    if (!currentForm) {
        showToast('未找到需求数据');
        return;
    }
    
    // 获取新状态和备注
    const statusSelect = document.getElementById('statusSelect');
    const statusNote = document.getElementById('statusNote');
    
    if (!statusSelect) return;
    
    // 更新状态
    const newStatus = statusSelect.value;
    const newNote = statusNote ? statusNote.value : '';
    
    // 查找并更新数据
    const index = formData.findIndex(item => item.id === currentForm.id);
    if (index !== -1) {
        formData[index].status = newStatus;
        formData[index].statusNote = newNote;
        
        // 保存到本地存储
        saveFormData();
        
        // 重新过滤和渲染
        filterFormData(currentTab);
        renderFormList();
        
        // 隐藏模态框
        hideDetailModal();
        
        showToast('状态已更新');
    }
}

// 处理删除表单
function handleDeleteForm() {
    if (!currentForm) {
        showToast('未找到需求数据');
        return;
    }
    
    if (!confirm('确定要删除此需求吗？此操作不可恢复。')) {
        return;
    }
    
    // 查找并删除数据
    const index = formData.findIndex(item => item.id === currentForm.id);
    if (index !== -1) {
        formData.splice(index, 1);
        
        // 保存到本地存储
        saveFormData();
        
        // 重新过滤和渲染
        filterFormData(currentTab);
        renderFormList();
        
        // 隐藏模态框
        hideDetailModal();
        
        showToast('需求已删除');
    }
}

// 显示提示消息
function showToast(message) {
    // 检查是否存在Toast组件
    const toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        // 创建Toast容器
        const container = document.createElement('div');
        container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(container);
        
        // 创建Toast元素
        container.innerHTML = `
            <div class="toast align-items-center text-white bg-primary border-0" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                    <div class="toast-body"></div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            </div>
        `;
    }
    
    // 获取Toast元素
    const toastElement = document.querySelector('.toast');
    const toastBody = document.querySelector('.toast-body');
    
    if (toastElement && toastBody) {
        // 设置消息
        toastBody.textContent = message;
        
        // 显示Toast
        const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
        toast.show();
    } else {
        // 降级处理
        alert(message);
    }
} 