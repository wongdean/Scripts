// ==UserScript==
// @name         DexScreener to GMGN Jump
// @namespace    http://tampermonkey.net/
// @version      1.7
// @description  Add GMGN jump icon to DexScreener rows
// @author       You
// @match        https://dexscreener.com/*
// @match        https://www.dexscreener.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // GMGN 图标的 base64 编码
    const gmgnIconBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAABYlAAAWJQFJUiTwAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAGbSURBVHgB7ZqhTgNBFEXvEgIewRcgoAGDAYcifMFC+hfYKgIGi0BjCfAFBIWjBtMNIPgCBA5BzbZ2bpN5mcxs2+Td42ZmZ7p5yb3v9e0AQgjPVCjMXVO3sfX7p89g/HLZJL1D6fNX4BwFAM5ZRSbHF7uBJg+2NuMb6pmZYD9rtuvzJQE4Rx6AwvTWb6PrQ5yiy/OvRmdIQRKAc+QBKExVhaV327ZIgfN+6fMZSQDOkQdYmkv9v55Kv96Jrj+P+OcblEQSgHPcB6BiD7gZHAUPnF+/Rg/Y2O4F45O9vLzcNdwzlATgHNUBPDH8/gnG7AkWvH/RzNYRIZIAnCMPsB5YNk2XRhKAc+QBPGHlzYf+I1KYfs/HPLHen5EE4Bz1A3jC6hEy3A+wyO0XpGr89+sjGOt+AKEAwDnZPf9cz7A8wdI8a5zRPUEDBQDOyb4fYGnM8oj9tzGiHK4FQ8sTUr9lSgJwjuoAFIY1z3l/8PePFN7JAxj2BKv2ZyQBOEd1AJYcrhMsT0hFEoBzVAcgk9J536J0XSAJwDnuAzAB+j+AWaJ6ICAAAAAASUVORK5CYII=';
    
    // 链名映射到 GMGN 支持的链名
    const chainMapping = {
        'solana': 'sol',
        'ethereum': 'eth', 
        'bsc': 'bsc',
        'arbitrum': 'arb',
        'polygon': 'polygon',
        'avalanche': 'avax',
        'base': 'base'
    };

    // 创建 GMGN 图标元素
    function createGmgnIcon(ca, chain) {
        const gmgnIcon = document.createElement('img');
        gmgnIcon.className = 'ds-dex-table-row-dex-icon gmgn-jump-icon';
        gmgnIcon.src = gmgnIconBase64;
        gmgnIcon.title = 'Jump to GMGN';
        gmgnIcon.width = 14;
        gmgnIcon.height = 14;
        gmgnIcon.loading = 'lazy';
        gmgnIcon.style.cursor = 'pointer';
        gmgnIcon.style.transition = 'opacity 0.2s';
        gmgnIcon.style.userSelect = 'none';
        gmgnIcon.style.pointerEvents = 'auto';
        gmgnIcon.style.zIndex = '99999';
        gmgnIcon.style.position = 'relative';
        gmgnIcon.style.display = 'inline-block';
        gmgnIcon.style.verticalAlign = 'middle';
        
        // 添加标识属性
        gmgnIcon.setAttribute('data-gmgn-ca', ca);
        gmgnIcon.setAttribute('data-gmgn-chain', chain);
        
        // 跳转函数
        function jumpToGMGN() {
            const gmgnChain = chainMapping[chain] || chain;
            const gmgnUrl = `https://gmgn.ai/${gmgnChain}/token/PoiIeNkg_${ca}`;
            window.open(gmgnUrl, '_blank');
        }
        
        // 创建一个包装器来完全隔离事件
        const wrapper = document.createElement('span');
        wrapper.style.display = 'inline-block';
        wrapper.style.cursor = 'pointer';
        wrapper.style.zIndex = '99999';
        wrapper.style.position = 'relative';
        wrapper.style.verticalAlign = 'middle';
        wrapper.className = 'gmgn-icon-wrapper';
        
        // 鼠标悬停效果
        wrapper.addEventListener('mouseenter', () => {
            gmgnIcon.style.opacity = '0.7';
        });
        
        wrapper.addEventListener('mouseleave', () => {
            gmgnIcon.style.opacity = '1';
        });
        
        // 使用mousedown事件直接触发
        let mouseDownHandled = false;
        wrapper.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                mouseDownHandled = true;
                jumpToGMGN();
                return false;
            }
        }, true);
        
        // 备用的mouseup处理
        wrapper.addEventListener('mouseup', (e) => {
            if (!mouseDownHandled && e.button === 0) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                jumpToGMGN();
                return false;
            }
            mouseDownHandled = false;
        }, true);
        
        // 阻止其他事件冒泡
        ['click', 'dblclick', 'contextmenu'].forEach(eventType => {
            wrapper.addEventListener(eventType, (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                return false;
            }, true);
        });
        
        wrapper.appendChild(gmgnIcon);
        return wrapper;
    }
    
    // 从 token icon 的 src URL 中提取 CA 地址和链名
    function extractTokenInfoFromIcon(row) {
        const tokenIcon = row.querySelector('.ds-dex-table-row-token-icon-img');
        if (!tokenIcon) return null;
        
        const iconSrc = tokenIcon.src;
        
        try {
            const url = new URL(iconSrc);
            const pathParts = url.pathname.split('/').filter(part => part.length > 0);
            
            if (pathParts.length >= 4 && pathParts[0] === 'ds-data' && pathParts[1] === 'tokens') {
                const chain = pathParts[2];
                const caWithExtension = pathParts[3];
                const ca = caWithExtension.replace(/\.(png|jpg|jpeg|webp)$/i, '');
                
                return { chain, ca };
            }
        } catch (error) {
            // 静默处理错误
        }
        
        return null;
    }
    
    // 为表格行添加 GMGN 图标
    function addGmgnIconToRow(row) {
        if (row.querySelector('.gmgn-icon-wrapper') || row.querySelector('.gmgn-jump-icon')) {
            return;
        }
        
        const tokenInfo = extractTokenInfoFromIcon(row);
        if (!tokenInfo) return;
        
        const dexIcon = row.querySelector('.ds-dex-table-row-dex-icon');
        if (!dexIcon) return;
        
        const gmgnIconWrapper = createGmgnIcon(tokenInfo.ca, tokenInfo.chain);
        dexIcon.parentNode.insertBefore(gmgnIconWrapper, dexIcon.nextSibling);
    }
    
    // 处理所有现有的表格行
    function processExistingRows() {
        const rows = document.querySelectorAll('.ds-dex-table-row');
        rows.forEach(addGmgnIconToRow);
    }
    
    // 监听 DOM 变化，处理动态加载的内容
    function observeForNewRows() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) {
                        if (node.classList && node.classList.contains('ds-dex-table-row')) {
                            addGmgnIconToRow(node);
                        }
                        
                        const newRows = node.querySelectorAll ? node.querySelectorAll('.ds-dex-table-row') : [];
                        newRows.forEach(addGmgnIconToRow);
                    }
                });
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    // 初始化
    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => {
                    processExistingRows();
                    observeForNewRows();
                }, 1000);
            });
        } else {
            setTimeout(() => {
                processExistingRows();
                observeForNewRows();
            }, 1000);
        }
    }
    
    init();
    
    // 添加 CSS 样式
    const style = document.createElement('style');
    style.textContent = `
        .gmgn-icon-wrapper {
            margin-left: 2px !important;
            z-index: 99999 !important;
            position: relative !important;
            vertical-align: middle !important;
        }
        .gmgn-jump-icon {
            border-radius: 2px;
            z-index: 99999 !important;
            position: relative !important;
            vertical-align: middle !important;
        }
        .gmgn-jump-icon:hover {
            filter: brightness(1.1);
        }
    `;
    document.head.appendChild(style);
    
})();
