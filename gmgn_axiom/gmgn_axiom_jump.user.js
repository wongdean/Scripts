// ==UserScript==
// @name         GMGN & Axiom 互跳脚本
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  在 gmgn.ai 和 axiom.trade 之间互相跳转
// @author       You
// @match        https://gmgn.ai/*
// @match        https://axiom.trade/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Axiom logo base64
    const AXIOM_LOGO = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzYiIGhlaWdodD0iMzYiIHZpZXdCb3g9IjAgMCAzNiAzNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGcgY2xpcC1wYXRoPSJ1cmwoI2NsaXAwXzg4XzI4OTY3KSI+CjxwYXRoIGQ9Ik0yNC4xMzg0IDE3LjM4NzZIMTEuODYyM0wxOC4wMDAxIDcuMDAwMTJMMjQuMTM4NCAxNy4zODc2WiIgZmlsbD0iI0ZDRkNGQyIvPgo8cGF0aCBkPSJNMzEgMjkuMDAwM0w1IDI5LjAwMDNMOS45Njc2NCAyMC41OTMzTDI2LjAzMjQgMjAuNTkzM0wzMSAyOS4wMDAzWiIgZmlsbD0iI0ZDRkNGQyIvPgo8L2c+CjxkZWZzPgo8Y2xpcFBhdGggaWQ9ImNsaXAwXzg4XzI4OTY3Ij4KPHJlY3Qgd2lkdGg9IjI2IiBoZWlnaHQ9IjIyIiBmaWxsPSJ3aGl0ZSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNSA3KSIvPgo8L2NsaXBQYXRoPgo8L2RlZnM+Cjwvc3ZnPgo=';
    
    // GMGN logo base64
    const GMGN_LOGO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAABYlAAAWJQFJUiTwAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAGbSURBVHgB7ZqhTgNBFEXvEgIewRcgoAGDAYcifMFC+hfYKgIGi0BjCfAFBIWjBtMNIPgCBA5BzbZ2bpN5mcxs2+Td42ZmZ7p5yb3v9e0AQgjPVCjMXVO3sfX7p89g/HLZJL1D6fNX4BwFAM5ZRSbHF7uBJg+2NuMb6pmZYD9rtuvzJQE4Rx6AwvTWb6PrQ5yiy/OvRmdIQRKAc+QBKExVhaV327ZIgfN+6fMZSQDOkQdYmkv9v55Kv96Jrj+P+OcblEQSgHPcB6BiD7gZHAUPnF+/Rg/Y2O4F45O9vLzcNdwzlATgHNUBPDH8/gnG7AkWvH/RzNYRIZIAnCMPsB5YNk2XRhKAc+QBPGHlzYf+I1KYfs/HPLHen5EE4Bz1A3jC6hEy3A+wyO0XpGr89+sjGOt+AKEAwDnZPf9cz7A8wdI8a5zRPUEDBQDOyb4fYGnM8oj9tzGiHK4FQ8sTUr9lSgJwjuoAFIY1z3l/8PePFN7JAxj2BKv2ZyQBOEd1AJYcrhMsT0hFEoBzVAcgk9J536J0XSAJwDnuAzAB+j+AWaJ6ICAAAAAASUVORK5CYII=';

    // 等待页面加载完成
    function waitForElement(selector, callback, maxAttempts = 50) {
        let attempts = 0;
        const interval = setInterval(() => {
            const element = document.querySelector(selector);
            if (element || attempts >= maxAttempts) {
                clearInterval(interval);
                if (element) {
                    callback(element);
                }
            }
            attempts++;
        }, 100);
    }

    // 从URL中提取CA地址
    function extractCAFromURL(url) {
        const match = url.match(/[A-Za-z0-9]{32,}/);
        return match ? match[0] : null;
    }

    // 提取当前页面的CA地址
    function getCurrentCA() {
        // 优先从URL路径中提取
        const pathMatch = window.location.pathname.match(/\/token\/([A-Za-z0-9]{32,})/);
        if (pathMatch) {
            return pathMatch[1];
        }
        
        // 从搜索链接中提取
        const allSearchLinks = document.querySelectorAll('a[href*="x.com/search?q="]');
        for (const link of allSearchLinks) {
            const href = link.getAttribute('href');
            if (href && href.includes('x.com/search?q=')) {
                const urlParts = href.split('q=');
                if (urlParts.length > 1) {
                    const extracted = urlParts[1];
                    if (extracted && extracted.length >= 32) {
                        return extracted;
                    }
                }
            }
        }
        
        return null;
    }

    // 在GMGN页面添加跳转到Axiom的按钮
    function addAxiomButton() {
        // 检查是否已经添加过按钮
        if (document.querySelector('#axiom-jump-btn')) {
            return;
        }

        // 查找外层div
        const outerDivs = document.querySelectorAll('.flex.flex-col.gap-y-2px');
        if (outerDivs.length === 0) {
            return;
        }
        
        // 处理找到的外层div
        for (const outerDiv of outerDivs) {
            // 查找子div
            let childDivs = outerDiv.querySelectorAll('.flex.items-center.gap-x-4px');
            if (childDivs.length === 0) {
                childDivs = outerDiv.querySelectorAll('div[class*="flex"][class*="items-center"][class*="gap-x-4px"]');
            }
            
            // 如果还是没找到，直接查找css-70qvj9
            if (childDivs.length === 0) {
                const directCss70qvj9 = outerDiv.querySelector('.css-70qvj9');
                if (directCss70qvj9) {
                    const parentDiv = directCss70qvj9.closest('div[class*="flex"][class*="items-center"]');
                    if (parentDiv) {
                        childDivs = [parentDiv];
                    } else {
                        childDivs = [directCss70qvj9.parentElement];
                    }
                } else {
                    continue;
                }
            }
            
            let targetDiv = null;
            
            // 查找包含css-70qvj9的div
            for (const currentChildDiv of childDivs) {
                const css70qvj9Div = currentChildDiv.querySelector('.css-70qvj9');
                if (css70qvj9Div) {
                    targetDiv = css70qvj9Div;
                    break;
                }
            }
            
            // 如果没找到，尝试在当前外层div中查找
            if (!targetDiv) {
                const allCss70qvj9 = document.querySelectorAll('.css-70qvj9');
                for (const css70qvj9Element of allCss70qvj9) {
                    const parentFlexCol = css70qvj9Element.closest('.flex.flex-col.gap-y-2px');
                    if (parentFlexCol === outerDiv) {
                        targetDiv = css70qvj9Element;
                        break;
                    }
                }
                
                if (!targetDiv) {
                    continue;
                }
            }

            // 验证当前页面有CA地址可提取
            const currentCA = getCurrentCA();
            if (!currentCA) {
                continue;
            }

            // 创建Axiom跳转按钮
            const axiomButton = document.createElement('div');
            axiomButton.id = 'axiom-jump-btn';
            axiomButton.className = 'relative flex items-center gap-x-4px cursor-pointer';
            axiomButton.style.cssText = 'cursor: pointer; margin-left: 8px;';
            
            axiomButton.innerHTML = `
                <div class="flex items-center justify-center" style="width: 16px; height: 16px;">
                    <img src="${AXIOM_LOGO}" alt="Axiom" style="width: 14px; height: 14px; object-fit: contain;" />
                </div>
                <span class="text-text-300 hover:text-text-100 transition-colors text-sm">Axiom</span>
            `;

            // 添加点击事件 - 每次点击时重新提取CA地址
            axiomButton.addEventListener('click', () => {
                const ca = getCurrentCA();
                if (ca) {
                    const axiomUrl = `https://axiom.trade/t/${ca}`;
                    window.open(axiomUrl, '_blank');
                } else {
                    console.warn('无法提取CA地址');
                }
            });

            // 插入按钮
            try {
                targetDiv.parentNode.insertBefore(axiomButton, targetDiv.nextSibling);
                break;
            } catch (error) {
                // 忽略错误，继续尝试下一个
            }
        }
    }

    // 在Axiom页面添加跳转到GMGN的按钮
    function addGMGNButton() {
        // 检查是否已经添加过按钮
        if (document.querySelector('#gmgn-jump-container')) {
            return;
        }

        // 验证当前页面有CA地址可提取
        const currentCA = getCurrentCA();
        if (!currentCA) {
            return;
        }

        // 查找 pair-name-tooltip 容器
        const pairNameTooltip = document.querySelector('#pair-name-tooltip');
        if (!pairNameTooltip) {
            return;
        }
        
        // 验证容器中包含搜索链接
        const searchLink = pairNameTooltip.querySelector('a[href*="x.com/search"]');
        if (!searchLink) {
            return;
        }

        // 创建GMGN按钮
        const gmgnLink = document.createElement('div');
        gmgnLink.id = 'gmgn-jump-container';
        gmgnLink.style.cssText = `
            display: inline-flex !important;
            align-items: center !important;
            gap: 4px !important;
            cursor: pointer !important;
            transition: color 125ms !important;
            color: #666 !important;
            text-decoration: none !important;
            position: relative !important;
        `;
        
        // 创建GMGN图标
        const gmgnIcon = document.createElement('img');
        gmgnIcon.src = GMGN_LOGO;
        gmgnIcon.alt = 'GMGN';
        gmgnIcon.style.cssText = `
            width: 16px !important;
            height: 16px !important;
            object-fit: contain !important;
            display: block !important;
        `;
        
        // 创建GMGN文字
        const gmgnText = document.createElement('span');
        gmgnText.textContent = 'GMGN';
        gmgnText.style.cssText = `
            font-size: 12px !important;
            font-weight: 500 !important;
            color: inherit !important;
            white-space: nowrap !important;
            display: inline-block !important;
        `;
        
        // 组装按钮
        gmgnLink.appendChild(gmgnIcon);
        gmgnLink.appendChild(gmgnText);

        // 添加点击事件 - 每次点击时重新提取CA地址
        gmgnLink.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const ca = getCurrentCA();
            if (ca) {
                const gmgnUrl = `https://gmgn.ai/sol/token/${ca}`;
                window.open(gmgnUrl, '_blank');
            } else {
                console.warn('无法提取CA地址');
            }
        });

        // 添加悬停效果
        gmgnLink.addEventListener('mouseenter', () => {
            gmgnLink.style.color = '#5DBCFF !important';
        });
        
        gmgnLink.addEventListener('mouseleave', () => {
            gmgnLink.style.color = '#666 !important';
        });

        // 插入GMGN按钮
        try {
            pairNameTooltip.appendChild(gmgnLink);
        } catch (error) {
            // 忽略错误
        }
    }

    // 防抖函数
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // 主函数
    function init() {
        const currentDomain = window.location.hostname;
        
        if (currentDomain === 'gmgn.ai') {
            addAxiomButton();
            
            // 监听页面变化（SPA应用）
            const debouncedUpdate = debounce(() => {
                // 移除旧按钮并重新添加，确保CA地址更新
                const existingButton = document.querySelector('#axiom-jump-btn');
                if (existingButton) {
                    existingButton.remove();
                }
                addAxiomButton();
            }, 200);
            
            const observer = new MutationObserver(debouncedUpdate);
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
            
        } else if (currentDomain === 'axiom.trade') {
            addGMGNButton();
            
            // 监听页面变化（SPA应用）
            const debouncedUpdate = debounce(() => {
                // 移除旧按钮并重新添加，确保CA地址更新
                const existingButton = document.querySelector('#gmgn-jump-container');
                if (existingButton) {
                    existingButton.remove();
                }
                addGMGNButton();
            }, 200);
            
            const observer = new MutationObserver(debouncedUpdate);
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    }

    // 页面加载完成后执行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
