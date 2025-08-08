// ==UserScript==
// @name         MEXC弹窗屏蔽器
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  屏蔽MEXC.com网站的各种弹窗
// @author       You
// @match        https://www.mexc.com/*
// @match        https://mexc.com/*
// @icon         https://www.mexc.com/favicon.ico
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    
    // 预先注入CSS以防止页面变黑和弹窗显示
    const preventStyle = document.createElement('style');
    preventStyle.textContent = `
        /* 预防性样式，防止页面变黑 */
        body.ant-scrolling-effect {
            overflow: auto !important;
            width: auto !important;
            position: static !important;
        }
        
        /* 隐藏广告弹窗 - 更新选择器以匹配新的弹窗结构 */
        div[role="dialog"].ant-modal:has(.special-shaped-modal_modalContent__Hm6MS),
        div[role="dialog"].ant-modal:has(.web-swiper-modal_modalContent__WeKt7),
        div[role="dialog"].ant-modal:has(.surface-shape-modal_wrapper__6b9v3),
        div.ant-modal-mask + div.ant-modal-wrap:has(.special-shaped-modal_modalContent__Hm6MS),
        div.ant-modal-mask + div.ant-modal-wrap:has(.web-swiper-modal_modalContent__WeKt7),
        div.ant-modal-mask + div.ant-modal-wrap:has(.surface-shape-modal_wrapper__6b9v3) {
            display: none !important;
        }
        
        /* 隐藏相关联的遮罩层 */
        .ant-modal-mask:not(:has(+ div.ant-modal-wrap:has(div.ant-modal:not(:has(.special-shaped-modal_modalContent__Hm6MS)):not(:has(.web-swiper-modal_modalContent__WeKt7)):not(:has(.surface-shape-modal_wrapper__6b9v3))))) {
            display: none !important;
        }
    `;
    
    // 尽早插入样式
    if (document.head) {
        document.head.appendChild(preventStyle);
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            document.head.appendChild(preventStyle);
        });
    }
    
    // 创建主观察器
    const observer = new MutationObserver(function() {
        // 尝试移除广告弹窗和遮罩
        removeAdModalsAndMasks();
        // 恢复页面状态
        restorePageState();
    });
    
    // 判断是否为广告弹窗
    function isAdvertisementModal(modal) {
        // 检查新的弹窗结构
        const hasSpecialModalContent = modal.querySelector('.special-shaped-modal_modalContent__Hm6MS') !== null;
        const hasOldModalClass = modal.classList.contains('surface-shape-modal_wrapper__6b9v3');
        const hasNewModalContent = modal.querySelector('.web-swiper-modal_modalContent__WeKt7') !== null;
        
        if (!hasSpecialModalContent && !hasOldModalClass && !hasNewModalContent) {
            return false;
        }
        
        // 检查更多特征以确认是广告弹窗
        const hasBannerImage = modal.querySelector('img[src*="banner"]') !== null;
        const hasPublicMocorImage = modal.querySelector('img[src*="public.mocortech.com"]') !== null;
        const hasImageWrapper = modal.querySelector('section.media-view_imgWrapper__0ftQJ') !== null;
        const hasSwiper = modal.querySelector('.displaySwiper') !== null || modal.querySelector('.swiper') !== null;
        const hasNoRemindText = (modal.textContent || '').includes('今日不再提示') || (modal.textContent || '').includes('No more reminders for today');
        const hasMexcAlt = modal.querySelector('img[alt="mexc"]') !== null;
        const hasSpecialButton = modal.querySelector('.special-shaped-modal_funcButton__V6kAe') !== null;
        
        return hasSpecialModalContent || hasBannerImage || hasPublicMocorImage || hasImageWrapper || hasNoRemindText || hasMexcAlt || hasSwiper || hasSpecialButton;
    }
    
    // 移除广告弹窗和相关遮罩
    function removeAdModalsAndMasks() {
        // 查找所有弹窗
        const allModals = document.querySelectorAll('div[role="dialog"].ant-modal');
        let removedAny = false;
        
        allModals.forEach(modal => {
            if (isAdvertisementModal(modal)) {
                console.log('拦截广告弹窗');
                
                // 找到这个弹窗对应的遮罩和包装元素
                let modalWrap = modal.closest('.ant-modal-wrap');
                if (modalWrap) {
                    let mask = modalWrap.previousElementSibling;
                    if (mask && mask.classList.contains('ant-modal-mask')) {
                        mask.remove();
                    }
                    modalWrap.remove();
                } else {
                    // 如果找不到父元素，直接移除弹窗
                    modal.remove();
                }
                
                removedAny = true;
            }
        });
        
        // 如果移除了弹窗，检查是否还有其他弹窗
        if (removedAny) {
            const remainingModals = document.querySelector('div[role="dialog"].ant-modal:not(:has(.special-shaped-modal_modalContent__Hm6MS)):not(:has(.web-swiper-modal_modalContent__WeKt7)):not(:has(.surface-shape-modal_wrapper__6b9v3))');
            
            // 如果没有其他弹窗，移除所有可能残留的遮罩
            if (!remainingModals) {
                document.querySelectorAll('.ant-modal-mask').forEach(mask => {
                    mask.remove();
                });
            }
        }
    }
    
    // 恢复页面状态
    function restorePageState() {
        // 检查是否还有其他功能性弹窗
        const hasOtherModals = document.querySelector('div[role="dialog"].ant-modal:not(:has(.special-shaped-modal_modalContent__Hm6MS)):not(:has(.web-swiper-modal_modalContent__WeKt7)):not(:has(.surface-shape-modal_wrapper__6b9v3))');
        
        if (!hasOtherModals) {
            // 恢复页面滚动和位置
            if (document.body) {
                if (document.body.classList.contains('ant-scrolling-effect')) {
                    document.body.classList.remove('ant-scrolling-effect');
                }
                
                if (document.body.style.overflow === 'hidden') {
                    document.body.style.overflow = '';
                }
                
                if (document.body.style.width === 'calc(100% - 15px)' || document.body.style.width === 'calc(100% - 17px)') {
                    document.body.style.width = '';
                }
                
                if (document.body.style.position === 'fixed') {
                    document.body.style.position = '';
                    document.body.style.top = '';
                    document.body.style.left = '';
                    document.body.style.right = '';
                }
            }
        }
    }
    
    // 自动点击"今日不再提示"复选框
    function autoClickDontRemindCheckbox() {
        // 查找新结构的弹窗中的复选框
        const checkboxWrappers = document.querySelectorAll('.special-shaped-modal_noTipText__eM8x9 .ant-checkbox-wrapper');
        
        checkboxWrappers.forEach(wrapper => {
            const text = wrapper.textContent || '';
            if (text.includes('今日不再提示') || text.includes('No more reminders for today')) {
                const checkbox = wrapper.querySelector('input[type="checkbox"]');
                if (checkbox && !checkbox.checked) {
                    console.log('[MEXC弹窗屏蔽] 自动点击"今日不再提示"复选框');
                    checkbox.click();
                    
                    // 短暂延迟后尝试关闭弹窗
                    setTimeout(() => {
                        // 尝试点击关闭按钮
                        const closeButton = document.querySelector('.ant-modal-close');
                        if (closeButton) {
                            console.log('[MEXC弹窗屏蔽] 自动点击关闭按钮');
                            closeButton.click();
                        } else {
                            // 如果没有关闭按钮，直接移除弹窗
                            const modal = wrapper.closest('.ant-modal');
                            if (modal) {
                                console.log('[MEXC弹窗屏蔽] 直接移除弹窗');
                                removeAdModalsAndMasks();
                            }
                        }
                    }, 300);
                }
            }
        });
        
        // 兼容旧版本的复选框
        const oldCheckboxes = document.querySelectorAll('.ant-checkbox-wrapper:not(.special-shaped-modal_noTipText__eM8x9 .ant-checkbox-wrapper)');
        oldCheckboxes.forEach(wrapper => {
            const text = wrapper.textContent || '';
            if (text.includes('今日不再提示') || text.includes('No more reminders for today')) {
                const checkbox = wrapper.querySelector('input[type="checkbox"]');
                if (checkbox && !checkbox.checked) {
                    console.log('[MEXC弹窗屏蔽] 自动点击旧版"今日不再提示"复选框');
                    checkbox.click();
                }
            }
        });
    }
    
    // 立即开始观察当前DOM
    if (document.body) {
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class']
        });
        
        // 立即执行一次检查
        autoClickDontRemindCheckbox(); // 先尝试自动点击复选框
        removeAdModalsAndMasks();
        restorePageState();
    }
    
    // 在DOM准备好时开始观察
    document.addEventListener('DOMContentLoaded', function() {
        // 立即执行一次检查
        autoClickDontRemindCheckbox(); // 先尝试自动点击复选框
        removeAdModalsAndMasks();
        restorePageState();
        
        // 确保观察器已启动
        if (!observer.takeRecords().length) {
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['style', 'class']
            });
        }
    });
    
    // 监听DOM节点插入，作为额外保障
    document.addEventListener('DOMNodeInserted', function(e) {
        if (e.target && e.target.nodeType === 1) {
            // 检查插入的是否为弹窗或遮罩
            if (e.target.classList) {
                if (e.target.classList.contains('ant-modal') || 
                    e.target.classList.contains('ant-modal-mask') || 
                    e.target.classList.contains('ant-modal-wrap')) {
                    
                    // 延迟极短时间执行移除和恢复（让DOM完全插入）
                    setTimeout(() => {
                        autoClickDontRemindCheckbox(); // 先尝试自动点击复选框
                        removeAdModalsAndMasks();
                        restorePageState();
                    }, 0);
                }
            }
        }
    });
    
    // 拦截className 和 style修改
    const originalSetAttribute = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function(name, value) {
        // 调用原始方法
        originalSetAttribute.call(this, name, value);
        
        // 如果修改的是body元素的类名或样式
        if (this === document.body && (name === 'class' || name === 'style')) {
            // 延迟极短时间检查并恢复页面状态
            setTimeout(() => {
                restorePageState();
            }, 0);
        }
    };
})();