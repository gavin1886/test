/**
 * 小程序定制需求收集系统
 * 主要功能：表单处理、数据存储、星级计算
 */

document.addEventListener('DOMContentLoaded', function() {
    // 初始化表单处理
    initFormHandlers();
    
    // 初始化步骤导航
    initStepNavigation();
    
    // 初始化版本限制
    initVersionRestrictions();
});

/**
 * 初始化表单处理函数
 */
function initFormHandlers() {
    // 选项卡点击事件
    const optionCards = document.querySelectorAll('.option-card');
    optionCards.forEach(card => {
        card.addEventListener('click', function() {
            // 检查是否是评分卡片且被禁用
            if (this.classList.contains('disabled')) {
                showToast('此选项需要企业版支持，请先升级到企业版');
                return;
            }
            
            // 在同一组中移除其他选中状态
            const parentSection = this.closest('.form-group');
            parentSection.querySelectorAll('.option-card').forEach(c => {
                c.classList.remove('selected');
            });
            
            // 添加选中状态
            this.classList.add('selected');
            
            // 获取选中值和评分
            const value = this.getAttribute('data-value');
            const rating = this.getAttribute('data-rating');
            const targetInput = this.getAttribute('data-target');
            const hiddenInput = document.getElementById(targetInput);
            
            // 更新隐藏输入框的值
            if (hiddenInput) {
                hiddenInput.value = value;
                
                // 如果是版本选择，应用版本限制
                if (targetInput === 'version') {
                    applyVersionRestrictions(value);
                }
                
                // 如果是自动进入下一步的选项卡
                if (this.classList.contains('auto-next') || parentSection.classList.contains('auto-next')) {
                    const currentSection = this.closest('.form-section');
                    const nextStepBtn = currentSection.querySelector('.next-step');
                    if (nextStepBtn) {
                        setTimeout(() => {
                            nextStepBtn.click();
                        }, 500); // 短暂延迟，让用户看到选择效果
                    }
                }
            }
            
            // 如果已经到了结果页，更新评估结果
            if (document.getElementById('result').style.display === 'block') {
                updateResults();
            }
        });
    });
    
    // 下一步按钮点击事件
    const nextButtons = document.querySelectorAll('.next-step');
    nextButtons.forEach(button => {
        button.addEventListener('click', function() {
            // 获取当前section
            const currentSection = this.closest('.form-section');
            
            // 验证当前section
            if (!validateSection(currentSection)) {
                showToast('请完成所有必填项');
                return;
            }
            
            // 获取下一个section ID
            const nextSectionId = this.getAttribute('data-next');
            if (nextSectionId) {
                // 隐藏当前section
                currentSection.style.display = 'none';
                
                // 显示下一个section
                const nextSection = document.getElementById(nextSectionId);
                if (nextSection) {
                    nextSection.style.display = 'block';
                    // 滚动到下一个section
                    nextSection.scrollIntoView({ behavior: 'smooth' });
                    
                    // 更新进度指示器
                    updateProgressIndicator(nextSectionId);
                    
                    // 如果是结果页，计算并显示结果
                    if (nextSectionId === 'result') {
                        updateResults();
                    }
                }
            }
        });
    });
    
    // 上一步按钮点击事件
    const prevButtons = document.querySelectorAll('.prev-step');
    prevButtons.forEach(button => {
        button.addEventListener('click', function() {
            // 获取当前section
            const currentSection = this.closest('.form-section');
            
            // 获取上一个section ID
            const prevSectionId = this.getAttribute('data-prev');
            if (prevSectionId) {
                // 隐藏当前section
                currentSection.style.display = 'none';
                
                // 显示上一个section
                const prevSection = document.getElementById(prevSectionId);
                if (prevSection) {
                    prevSection.style.display = 'block';
                    // 滚动到上一个section
                    prevSection.scrollIntoView({ behavior: 'smooth' });
                    
                    // 更新进度指示器
                    updateProgressIndicator(prevSectionId);
                }
            }
        });
    });
    
    // 暂不填写，仅保存报价按钮点击事件
    const saveQuoteOnlyBtn = document.getElementById('saveQuoteOnly');
    if (saveQuoteOnlyBtn) {
        saveQuoteOnlyBtn.addEventListener('click', function() {
            // 收集报价数据
            const quoteData = collectQuoteData();
            
            // 保存报价数据到localStorage
            saveQuoteData(quoteData);
            
            // 显示保存成功消息并跳转
            showToast('报价已保存');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        });
    }
    
    // 表单提交事件
    const requirementForm = document.getElementById('requirementForm');
    if (requirementForm) {
        requirementForm.addEventListener('submit', handleFormSubmit);
    }
}

/**
 * 更新评估结果
 */
function updateResults() {
    // 获取各项评分
    const pageScaleRating = getSelectedRating('pageScale');
    const dataScaleRating = getSelectedRating('dataScale');
    const uiDesignRating = getSelectedRating('uiDesign');
    
    // 计算小程序类型与功能复杂度评级
    const appTypeRating = calculateAppTypeRating(pageScaleRating, dataScaleRating);
    
    // 更新小程序类型与功能复杂度显示
    updateAppTypeDisplay(appTypeRating);
    
    // 更新价格和开发周期
    updatePriceAndDevelopmentTime(pageScaleRating, appTypeRating, dataScaleRating, uiDesignRating);
    
    // 更新增值服务推荐
    updateValueAddedServices(appTypeRating);
}

/**
 * 计算小程序类型与功能复杂度评级
 * @param {number} pageScaleRating - 页面规模评分
 * @param {number} dataScaleRating - 数据规模评分
 * @returns {number} - 小程序类型与功能复杂度评分
 */
function calculateAppTypeRating(pageScaleRating, dataScaleRating) {
    // 页面规模权重30%，数据规模权重70%
    const weightedRating = pageScaleRating * 0.3 + dataScaleRating * 0.7;
    
    // 四舍五入到最接近的整数
    return Math.round(weightedRating);
}

/**
 * 更新小程序类型与功能复杂度显示
 * @param {number} rating - 评分
 */
function updateAppTypeDisplay(rating) {
    // 更新星级显示
    const appTypeRatingStars = document.getElementById('appTypeRatingStars');
    if (appTypeRatingStars) {
        appTypeRatingStars.textContent = getStarString(rating);
    }
    
    // 更新级别文本
    const appTypeRatingText = document.getElementById('appTypeRatingText');
    const appTypeDescription = document.getElementById('appTypeDescription');
    
    if (appTypeRatingText && appTypeDescription) {
        switch(rating) {
            case 1:
                appTypeRatingText.textContent = '基础级';
                appTypeRatingText.className = 'badge bg-success';
                appTypeDescription.textContent = '展示型小程序，内容展示、简单表单，适合基础信息展示需求。';
                break;
            case 2:
                appTypeRatingText.textContent = '标准级';
                appTypeRatingText.className = 'badge bg-info';
                appTypeDescription.textContent = '功能型小程序，用户登录、基础CRUD，适合简单功能应用。';
                break;
            case 3:
                appTypeRatingText.textContent = '商业级';
                appTypeRatingText.className = 'badge bg-primary';
                appTypeDescription.textContent = '商业应用型小程序，包含用户系统、支付、数据管理等功能，适合中等规模业务需求。';
                break;
            case 4:
                appTypeRatingText.textContent = '企业级';
                appTypeRatingText.className = 'badge bg-warning';
                appTypeDescription.textContent = '高级商业型小程序，多角色权限、工作流、报表等功能，适合复杂企业应用。';
                break;
            case 5:
                appTypeRatingText.textContent = '定制级';
                appTypeRatingText.className = 'badge bg-danger';
                appTypeDescription.textContent = '企业级定制型小程序，AI算法、实时处理、高并发等高级功能，适合大型定制化解决方案。';
                break;
        }
    }
}

/**
 * 更新增值服务推荐
 * @param {number} appTypeRating - 小程序类型与功能复杂度评分
 */
function updateValueAddedServices(appTypeRating) {
    const valueAddedServices = document.querySelector('.value-added-services');
    
    if (appTypeRating === 1) {
        // 1星级不显示增值服务
        if (valueAddedServices) {
            valueAddedServices.style.display = 'none';
        }
        return;
    } else {
        if (valueAddedServices) {
            valueAddedServices.style.display = 'block';
        }
    }
    
    const serviceItems = document.querySelectorAll('.service-item');
    
    if (serviceItems.length >= 1) {
        const dataAnalysisItem = serviceItems[0];
        const dataAnalysisText = `根据您的项目星级，可获得每年${appTypeRating}次行业报告，每季度${appTypeRating}次数据分析与业务洞察报告`;
        dataAnalysisItem.querySelector('p').textContent = dataAnalysisText;
    }
}

/**
 * 初始化步骤导航
 */
function initStepNavigation() {
    // 进度指示器中的步骤点击事件
    const progressSteps = document.querySelectorAll('.progress-step');
    progressSteps.forEach(step => {
        step.addEventListener('click', function() {
            const stepId = this.getAttribute('data-step');
            if (stepId && !this.classList.contains('active')) {
                showToast('请按顺序完成表单填写');
            }
        });
    });
    
    // 底部步骤导航按钮点击事件
    const stepNavButtons = document.querySelectorAll('.step-navigation button[data-step]');
    stepNavButtons.forEach(button => {
        button.addEventListener('click', function() {
            const stepId = this.getAttribute('data-step');
            if (stepId) {
                // 检查是否是已完成的步骤（查找对应的progress-step是否active）
                const progressStep = document.querySelector(`.progress-step[data-step="${stepId}"]`);
                if (progressStep && progressStep.classList.contains('active')) {
                    // 隐藏所有section
                    document.querySelectorAll('.form-section').forEach(section => {
                        section.style.display = 'none';
                    });
                    
                    // 显示目标section
                    const targetSection = document.getElementById(stepId);
                    if (targetSection) {
                        targetSection.style.display = 'block';
                        // 滚动到目标section
                        targetSection.scrollIntoView({ behavior: 'smooth' });
                        
                        // 更新进度指示器
                        updateProgressIndicator(stepId);
                        
                        // 如果是结果页，更新结果
                        if (stepId === 'result') {
                            updateResults();
                        }
                    }
                } else {
                    showToast('请按顺序完成表单填写');
                }
            }
        });
    });
}

/**
 * 验证当前section是否填写完整
 * @param {HTMLElement} section - 当前表单section
 * @returns {boolean} 表单是否有效
 */
function validateSection(section) {
    // 检查必填字段
    const requiredFields = section.querySelectorAll('[required]');
    for (const field of requiredFields) {
        if (!field.value.trim()) {
            return false;
        }
    }
    
    // 检查是否有必选项
    const requiredGroups = section.querySelectorAll('.form-group');
    for (const group of requiredGroups) {
        const label = group.querySelector('.form-label');
        if (label && label.querySelector('.required')) {
            // 检查是否有隐藏输入且值为空
            const hiddenInputs = group.querySelectorAll('input[type="hidden"]');
            for (const input of hiddenInputs) {
                if (!input.value.trim()) {
                    // 检查是否有选中的选项卡
                    if (!group.querySelector('.option-card.selected')) {
                        return false;
                    }
                }
            }
        }
    }
    
    return true;
}

/**
 * 处理表单提交
 * @param {Event} e - 表单提交事件
 */
function handleFormSubmit(e) {
    e.preventDefault();
    
    // 验证表单
    if (!validateForm()) {
        showToast('请完成所有必填项');
        return;
    }
    
    // 收集表单数据
    const formData = collectFormData();
    
    // 保存到localStorage
    saveFormData(formData);
    
    // 显示成功消息
    showSuccessMessage();
}

/**
 * 验证表单是否填写完整
 * @returns {boolean} 表单是否有效
 */
function validateForm() {
    // 检查必填字段
    const requiredFields = document.querySelectorAll('[required]');
    for (const field of requiredFields) {
        if (!field.value.trim()) {
            return false;
        }
    }
    
    // 检查必选项
    const requiredSelects = ['pageScale', 'dataScale', 'uiDesign', 'version', 'appTypeCategory'];
    for (const selectId of requiredSelects) {
        const input = document.getElementById(selectId);
        if (input && !input.value.trim()) {
            return false;
        }
    }
    
    return true;
}

/**
 * 收集表单数据
 * @returns {Object} 表单数据对象
 */
function collectFormData() {
    const formData = {
        // 基本信息
        name: document.getElementById('name')?.value || '',
        phone: document.getElementById('phone')?.value || '',
        wechat: document.getElementById('wechat')?.value || '',
        email: document.getElementById('email')?.value || '',
        
        // 项目信息
        projectName: document.getElementById('projectName')?.value || '',
        version: document.getElementById('version')?.value || '',
        appTypeCategory: document.getElementById('appTypeCategory')?.value || '',
        deadline: document.getElementById('deadline')?.value || '',
        
        // 需求参数
        pageScale: document.getElementById('pageScale')?.value || '',
        dataScale: document.getElementById('dataScale')?.value || '',
        uiDesign: document.getElementById('uiDesign')?.value || '',
        requirements: document.getElementById('requirements')?.value || '',
        
        // 评估结果
        appTypeRating: document.getElementById('appTypeRatingText')?.textContent || '',
        estimatedPrice: document.getElementById('totalPrice')?.textContent || '',
        developmentTime: document.getElementById('developmentTime')?.textContent || '',
        
        // 元数据
        submissionDate: formatDate(new Date()),
        status: '待处理'
    };
    
    return formData;
}

/**
 * 保存表单数据到localStorage
 * @param {Object} formData - 表单数据对象
 */
function saveFormData(formData) {
    // 获取现有数据
    let existingData = localStorage.getItem('formData');
    let dataArray = [];
    
    if (existingData) {
        try {
            dataArray = JSON.parse(existingData);
        } catch (e) {
            console.error('解析localStorage数据出错:', e);
            dataArray = [];
        }
    }
    
    // 添加新数据
    dataArray.push(formData);
    
    // 保存回localStorage
    localStorage.setItem('formData', JSON.stringify(dataArray));
}

/**
 * 显示成功消息并跳转
 */
function showSuccessMessage() {
    window.location.href = 'success.html';
}

/**
 * 显示提示消息
 * @param {string} message - 提示消息内容
 */
function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    if (toast && toastMessage) {
        toastMessage.textContent = message;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    } else {
        alert(message);
    }
}

/**
 * 获取选中选项的评分
 * @param {string} targetId - 目标输入框ID
 * @returns {number} 选中选项的评分
 */
function getSelectedRating(targetId) {
    const selected = document.querySelector(`.option-card.selected[data-target="${targetId}"]`);
    return selected ? parseInt(selected.getAttribute('data-rating')) : 0;
}

/**
 * 获取星级字符串
 * @param {number} rating - 评分
 * @returns {string} 星级字符串
 */
function getStarString(rating) {
    switch(rating) {
        case 1: return '★☆☆☆☆';
        case 2: return '★★☆☆☆';
        case 3: return '★★★☆☆';
        case 4: return '★★★★☆';
        case 5: return '★★★★★';
        default: return '☆☆☆☆☆';
    }
}

/**
 * 更新价格和开发周期
 * @param {number} pageScaleRating - 页面规模评分
 * @param {number} appTypeRating - 小程序类型与功能复杂度评分
 * @param {number} dataScaleRating - 数据规模评分
 * @param {number} uiDesignRating - UI设计评分
 */
function updatePriceAndDevelopmentTime(pageScaleRating, appTypeRating, dataScaleRating, uiDesignRating) {
    // 获取版本
    const version = document.getElementById('version').value;
    const versionFactor = version === 'enterprise' ? 1.0 : 0.6;
    
    // 获取页面数量
    let pageCount = 0;
    switch(pageScaleRating) {
        case 1: pageCount = 3; break;  // 微型：1-3页，取最大值
        case 2: pageCount = 6; break;  // 小型：4-6页，取最大值
        case 3: pageCount = 10; break; // 中型：7-10页，取最大值
        case 4: pageCount = 15; break; // 大型：11-15页，取最大值
        case 5: pageCount = 20; break; // 超大型：15页以上，取20页
    }
    
    // 1. 计算小程序基础开发费用
    let baseDevFee = 0;
    switch(appTypeRating) {
        case 1: baseDevFee = 2000; break;  // 基础级
        case 2: baseDevFee = 4000; break;  // 标准级
        case 3: baseDevFee = 8000; break;  // 商业级
        case 4: baseDevFee = 15000; break; // 企业级
        case 5: baseDevFee = 50000; break; // 定制级
    }
    
    // 2. 计算UI设计费用
    let uiUnitPrice = 0;
    switch(uiDesignRating) {
        case 1: uiUnitPrice = 0; break;   // 基础UI
        case 2: uiUnitPrice = 100; break; // 简单UI
        case 3: uiUnitPrice = 200; break; // 标准UI
        case 4: uiUnitPrice = 300; break; // 专业级UI
        case 5: uiUnitPrice = 500; break; // 高端定制UI
    }
    const uiDesignFee = uiUnitPrice * pageCount;
    
    // 3. 计算服务器及存储费用
    let serverFee = 0;
    switch(dataScaleRating) {
        case 1: serverFee = 360; break;  // 微型
        case 2: serverFee = 1080; break; // 小型
        case 3: serverFee = 3000; break; // 中型
        case 4: serverFee = 9000; break; // 大型
        case 5: serverFee = 18000; break; // 超大型
    }
    
    // 4. 其他费用（认证费等）
    // 4.1 小程序认证费
    const wechatCertFee = version === 'enterprise' ? 300 : 30;
    
    // 4.2 SSL证书费用
    const sslCertFee = version === 'enterprise' ? 200 * appTypeRating : 0;
    
    // 4.3 总其他费用
    const otherFee = version === 'enterprise' ? 300 : 0; // 之前其他费用项
    
    // 5. 计算总价
    const subTotal = baseDevFee + uiDesignFee + serverFee + otherFee + wechatCertFee + sslCertFee;
    const totalPrice = Math.round(subTotal * versionFactor);
    
    // 6. 计算后续年费（主要是服务器费用和维护费用）
    const maintenanceFee = Math.round(totalPrice * 0.15); // 维护费为总费用的15%，第一年免费
    const subsequentYearFee = serverFee + maintenanceFee + wechatCertFee + sslCertFee;
    
    // 7. 确定开发周期
    let developmentTime = '';
    switch(appTypeRating) {
        case 1: developmentTime = '2周'; break;
        case 2: developmentTime = '4周'; break;
        case 3: developmentTime = '2个月'; break;
        case 4: developmentTime = '3个月'; break;
        case 5: developmentTime = '6个月'; break;
    }
    
    // 更新DOM
    const baseDevFeeElement = document.getElementById('baseDevFee');
    if (baseDevFeeElement) baseDevFeeElement.textContent = `${baseDevFee}元`;
    
    const uiDesignFeeElement = document.getElementById('uiDesignFee');
    if (uiDesignFeeElement) uiDesignFeeElement.textContent = `${uiDesignFee}元`;
    
    const serverFeeElement = document.getElementById('serverFee');
    if (serverFeeElement) serverFeeElement.textContent = `${serverFee}元/年`;
    
    const serverFee2Element = document.getElementById('serverFee2');
    if (serverFee2Element) serverFee2Element.textContent = `${serverFee}元/年`;
    
    const wechatCertFeeElement = document.getElementById('wechatCertFee');
    if (wechatCertFeeElement) wechatCertFeeElement.textContent = `${wechatCertFee}元/年`;
    
    const wechatCertFee2Element = document.getElementById('wechatCertFee2');
    if (wechatCertFee2Element) wechatCertFee2Element.textContent = `${wechatCertFee}元/年`;
    
    const sslCertFeeElement = document.getElementById('sslCertFee');
    if (sslCertFeeElement) sslCertFeeElement.textContent = `${sslCertFee}元/年`;
    
    const sslCertFee2Element = document.getElementById('sslCertFee2');
    if (sslCertFee2Element) sslCertFee2Element.textContent = `${sslCertFee}元/年`;
    
    const otherFeeElement = document.getElementById('otherFee');
    if (otherFeeElement) otherFeeElement.textContent = `${otherFee}元`;
    
    const versionFactorElement = document.getElementById('versionFactor');
    if (versionFactorElement) versionFactorElement.textContent = version === 'enterprise' ? '1.0 (企业版)' : '0.6 (个人版)';
    
    const totalPriceElement = document.getElementById('totalPrice');
    if (totalPriceElement) totalPriceElement.textContent = `${totalPrice}元`;
    
    const maintenanceFeeElement = document.getElementById('maintenanceFee');
    if (maintenanceFeeElement) maintenanceFeeElement.textContent = `${maintenanceFee}元/年`;
    
    const subsequentYearFeeElement = document.getElementById('subsequentYearFee');
    if (subsequentYearFeeElement) subsequentYearFeeElement.textContent = `${subsequentYearFee}元/年`;
    
    // 更新摘要
    const firstYearPriceElement = document.getElementById('firstYearPrice');
    if (firstYearPriceElement) firstYearPriceElement.textContent = `${totalPrice}元`;
    
    const yearlyPriceElement = document.getElementById('yearlyPrice');
    if (yearlyPriceElement) yearlyPriceElement.textContent = `${subsequentYearFee}元/年`;
    
    const developmentTimeElement = document.getElementById('developmentTime');
    if (developmentTimeElement) developmentTimeElement.textContent = developmentTime;
    
    // 显示价格表（只在结果页面显示）
    const resultElement = document.getElementById('result');
    const priceTableElement = document.getElementById('priceTable');
    if (resultElement && priceTableElement && resultElement.style.display === 'block') {
        priceTableElement.style.display = 'block';
    }
}

/**
 * 格式化日期
 * @param {Date} date - 日期对象
 * @returns {string} 格式化后的日期字符串
 */
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * 更新进度指示器
 * @param {string} currentStepId - 当前步骤ID
 */
function updateProgressIndicator(currentStepId) {
    const steps = ['project-info', 'app-type', 'page-scale', 'data-scale', 'ui-design', 'result', 'personal-info'];
    const currentIndex = steps.indexOf(currentStepId);
    
    if (currentIndex >= 0) {
        // 更新进度条
        const progressPercentage = ((currentIndex + 1) / steps.length) * 100;
        document.getElementById('progressBar').style.width = `${progressPercentage}%`;
        
        // 更新步骤状态
        document.querySelectorAll('.progress-step').forEach((step, index) => {
            if (index <= currentIndex) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });
    }
}

/**
 * 应用版本限制
 * @param {string} version - 版本类型
 */
function applyVersionRestrictions(version) {
    // 获取所有小程序类型选项卡
    const appTypeCards = document.querySelectorAll('.app-type-card');
    
    appTypeCards.forEach(card => {
        const cardVersion = card.getAttribute('data-version');
        
        if (version === 'personal' && cardVersion !== 'both') {
            // 个人版不能选择企业版专属类型
            card.classList.add('disabled');
        } else {
            card.classList.remove('disabled');
        }
    });
}

/**
 * 初始化版本限制
 */
function initVersionRestrictions() {
    // 初始状态下禁用企业版专属选项
    document.querySelectorAll('.app-type-card[data-version="enterprise"]').forEach(card => {
        card.classList.add('disabled');
    });
}

/**
 * 收集报价数据（不包含个人信息）
 * @returns {Object} 报价数据对象
 */
function collectQuoteData() {
    const quoteData = {
        // 项目信息
        projectName: document.getElementById('projectName')?.value || '未命名项目',
        version: document.getElementById('version')?.value || '',
        appTypeCategory: document.getElementById('appTypeCategory')?.value || '',
        deadline: document.getElementById('deadline')?.value || '',
        
        // 需求参数
        pageScale: document.getElementById('pageScale')?.value || '',
        dataScale: document.getElementById('dataScale')?.value || '',
        uiDesign: document.getElementById('uiDesign')?.value || '',
        requirements: document.getElementById('requirements')?.value || '',
        
        // 评估结果
        appTypeRating: document.getElementById('appTypeRatingText')?.textContent || '',
        estimatedPrice: document.getElementById('totalPrice')?.textContent || '',
        developmentTime: document.getElementById('developmentTime')?.textContent || '',
        
        // 元数据
        submissionDate: formatDate(new Date()),
        status: '仅保存报价'
    };
    
    return quoteData;
}

/**
 * 保存报价数据到localStorage
 * @param {Object} quoteData - 报价数据对象
 */
function saveQuoteData(quoteData) {
    // 获取现有数据
    let existingData = localStorage.getItem('quoteData');
    let dataArray = [];
    
    if (existingData) {
        try {
            dataArray = JSON.parse(existingData);
        } catch (e) {
            console.error('解析localStorage数据出错:', e);
            dataArray = [];
        }
    }
    
    // 添加新数据
    dataArray.push(quoteData);
    
    // 保存回localStorage
    localStorage.setItem('quoteData', JSON.stringify(dataArray));
} 