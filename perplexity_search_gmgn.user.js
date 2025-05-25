// ==UserScript==
// @name         GMGN 搜索叙事
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  在GMGN页面添加搜索叙事功能，复制格式化内容到剪切板并跳转到Perplexity
// @author       You
// @match        https://gmgn.ai/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 等待页面加载完成
    function waitForElement(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const checkElement = () => {
                const element = document.querySelector(selector);
                if (element) {
                    resolve(element);
                } else if (Date.now() - startTime > timeout) {
                    reject(new Error(`Element ${selector} not found within ${timeout}ms`));
                } else {
                    setTimeout(checkElement, 100);
                }
            };
            checkElement();
        });
    }

    // 提取信息的函数
    function extractTokenInfo() {
        try {
            // 提取链名称 - 从指定的HTML元素中获取
            const chainElement = document.querySelector('span.text-base.font-normal.text-text-100');
            const chain = chainElement ? chainElement.textContent.trim() : 'SOL'; // 默认SOL

            // 提取名称 - 使用更精确的选择器
            const nameElement = document.querySelector('span.text-text-100.text-xl.font-semibold') || 
                               document.querySelector('span[class*="text-xl"][class*="font-semibold"]');
            const name = nameElement ? nameElement.textContent.trim() : '';

            // 提取全称 - 处理Tailwind CSS的特殊字符
            const fullNameElement = document.querySelector('span[class*="max-w-"][class*="overflow-hidden"][class*="text-ellipsis"]') ||
                                  document.querySelector('.css-1g9j7u span.text-text-300');
            const fullName = fullNameElement ? fullNameElement.textContent.trim() : '';

            // 提取链接信息
            const linksContainer = document.querySelector('.flex-shrink-0[class*="css-"]') || 
                                 document.querySelector('div[class*="css-n6fhzv"]');
            let website = '';
            let twitter = '';
            let pumpfun = '';

            if (linksContainer) {
                // 网站链接 - 寻找globe图标或website标签
                const websiteLink = linksContainer.querySelector('a[aria-label="website"]') ||
                                  linksContainer.querySelector('a[href*="http"]:not([href*="twitter"]):not([href*="x.com"]):not([href*="pump.fun"]):not([href*="solscan"])');
                if (websiteLink) {
                    website = websiteLink.href;
                }

                // Twitter链接
                const twitterLink = linksContainer.querySelector('a[aria-label="twitter"]') ||
                                  linksContainer.querySelector('a[href*="twitter.com"], a[href*="x.com"]');
                if (twitterLink) {
                    twitter = twitterLink.href;
                }

                // Pumpfun链接
                const pumpfunLink = linksContainer.querySelector('a[href*="pump.fun"]');
                if (pumpfunLink) {
                    pumpfun = pumpfunLink.href;
                }
            }

            // 从URL提取CA地址 - 新的提取方式
            let ca = '';
            const currentUrl = window.location.href;
            const urlMatch = currentUrl.match(/\/token\/[^_]+_([A-Za-z0-9]+)/);
            if (urlMatch) {
                ca = urlMatch[1];
            }

            // 如果URL方式没有获取到CA，使用原来的备用方案
            if (!ca) {
                const solscanLink = document.querySelector('a[href*="solscan.io/token/"]');
                if (solscanLink) {
                    const href = solscanLink.href;
                    const match = href.match(/token\/([A-Za-z0-9]+)/);
                    if (match) {
                        ca = match[1];
                    }
                }

                // 如果还是没找到，尝试从其他地方获取CA
                if (!ca) {
                    const addressElement = document.querySelector('[class*="gap-x-4px"] [class*="text-text-300"]:not([class*="leading"])');
                    if (addressElement && addressElement.textContent.match(/^[A-Za-z0-9]{32,}$/)) {
                        ca = addressElement.textContent.trim();
                    }
                }
            }

            // 提取图片
            let image = '';
            const imageContainer = document.querySelector('.css-1ims5l1') || 
                                 document.querySelector('div[class*="border-line-100"] img') ||
                                 document.querySelector('.css-1g9j7u img');
            if (imageContainer) {
                const imgElement = imageContainer.tagName === 'IMG' ? imageContainer : imageContainer.querySelector('img');
                if (imgElement && imgElement.src) {
                    image = imgElement.src;
                }
            }

            return {
                chain,
                name,
                fullName,
                website,
                twitter,
                pumpfun,
                ca,
                image
            };
        } catch (error) {
            console.error('提取信息时出错:', error);
            return null;
        }
    }

    // 复制到剪切板的函数
    async function copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            console.log('内容已复制到剪切板');
            return true;
        } catch (err) {
            console.error('复制失败:', err);
            // 降级方案
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                if (successful) {
                    console.log('内容已复制到剪切板 (降级方案)');
                    return true;
                }
            } catch (fallbackErr) {
                document.body.removeChild(textArea);
                console.error('复制失败 (降级方案):', fallbackErr);
            }
            return false;
        }
    }

    // 格式化模板
    function formatTemplate(info) {
        let template = `这是一个${info.chain}上的memecoin，这是我所能找到的相关信息，快速给我以下信息：（用中文回答）
根据网站中叙事简洁和大家的评论，还有meme的名称/全称/图片，总结出一份简洁全面的叙事。速度要快！

1.你觉得这个叙事传播出圈的可能性有多高？
2.在西方文化和语境中，你觉得这个叙事足够吸引欧美人吗？
3.以及在互联网上有什么名人事件或者关键词与其相关吗？

名称：${info.name}
全称：${info.fullName}`;

        // 只有在有值的情况下才添加推特和网站字段
        if (info.twitter && info.twitter.trim()) {
            template += `\n推特：${info.twitter}`;
        }
        
        if (info.website && info.website.trim()) {
            template += `\n网站：${info.website}`;
        }
        
        // 这些字段一定会有值，所以始终显示
        template += `\nCA：${info.ca}
图片：${info.image}`;

        return template;
    }

    // 处理搜索叙事点击事件
    async function handleSearchNarrative() {
        const info = extractTokenInfo();
        if (!info) {
            alert('无法提取代币信息');
            return;
        }

        const formattedText = formatTemplate(info);
        const copied = await copyToClipboard(formattedText);
        
        if (copied) {
            // 显示成功提示
            showNotification('内容已复制到剪切板！', '#4CAF50');
        } else {
            showNotification('复制失败，请手动复制', '#f44336');
        }

        // 跳转到Perplexity
        setTimeout(() => {
            window.open('https://www.perplexity.ai/', '_blank');
        }, 500);
    }

    // 显示通知
    function showNotification(message, color = '#4CAF50') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${color};
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            z-index: 10000;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 3000);
    }

    // 创建搜索叙事按钮
    function createSearchNarrativeButton() {
        const button = document.createElement('a');
        button.className = 'css-1dgetxa';
        button.style.cursor = 'pointer';
        button.setAttribute('data-narrative-button', 'true');
        button.addEventListener('click', (e) => {
            e.preventDefault();
            handleSearchNarrative();
        });

        button.innerHTML = `
            <div class="flex gap-x-2px items-center text-[13px] leading-[16px] font-normal text-text-300 transition-colors hover:text-text-100">
                <svg width="14" height="14" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" fill="currentColor" size="14">
                    <g clip-path="url(#narrative-search-icon)">
                        <path d="M15.8783 16.145C16.1956 15.8277 16.7101 15.8277 17.0274 16.145L18.8844 18.002C19.2017 18.3193 19.2017 18.8337 18.8844 19.151 18.5671 19.4683 18.0526 19.4683 17.7353 19.151L15.8783 17.294C15.561 16.9767 15.561 16.4623 15.8783 16.145ZM9.11776 2.30273C5.31739 2.30273 2.23657 5.38355 2.23657 9.18393 2.23657 12.9843 5.31739 16.0651 9.11776 16.0651 12.9181 16.0651 15.999 12.9843 15.999 9.18393 15.999 5.38355 12.9181 2.30273 9.11776 2.30273ZM.611572 9.18393C.611572 4.48609 4.41992.677734 9.11776.677734 13.8156.677734 17.624 4.48609 17.624 9.18393 17.624 13.8818 13.8156 17.6901 9.11776 17.6901 4.41992 17.6901.611572 13.8818.611572 9.18393Z"></path>
                    </g>
                    <defs>
                        <clipPath id="narrative-search-icon">
                            <rect width="20" height="20"></rect>
                        </clipPath>
                    </defs>
                </svg>
                叙事
            </div>
        `;

        return button;
    }

    // 移除指定的按钮
    function removeTargetButtons(container) {
        // 获取所有子元素
        const children = Array.from(container.children);
        
        // 找到搜索按钮的位置
        const searchButtons = container.querySelectorAll('a[id^="search"]');
        let lastSearchButtonIndex = -1;
        
        if (searchButtons.length > 0) {
            const lastSearchButton = searchButtons[searchButtons.length - 1];
            lastSearchButtonIndex = children.indexOf(lastSearchButton);
        }
        
        // 如果找到了搜索按钮，移除其后面的所有元素（分隔线、分享按钮、更新社媒/CTO按钮等）
        if (lastSearchButtonIndex !== -1 && lastSearchButtonIndex < children.length - 1) {
            // 移除最后一个搜索按钮之后的所有元素
            for (let i = children.length - 1; i > lastSearchButtonIndex; i--) {
                const child = children[i];
                if (child && child.parentNode) {
                    child.remove();
                }
            }
        } else {
            // 备用方案：移除最后几个可能的目标元素
            const elementsToRemove = [];
            
            // 查找分享按钮 (包含cursor: pointer样式的div)
            const shareButtons = container.querySelectorAll('div[style*="cursor: pointer"]');
            shareButtons.forEach(btn => elementsToRemove.push(btn));
            
            // 查找独立的SVG元素（可能是皇冠/更新社媒按钮）
            const standaloneSvgs = container.querySelectorAll('svg:not([aria-label]):not([width="12"]):not([width="16"])');
            standaloneSvgs.forEach(svg => {
                // 检查这个SVG是否是独立的按钮（不在链接内）
                if (!svg.closest('a') && svg.parentElement === container) {
                    elementsToRemove.push(svg);
                }
            });
            
            // 移除找到的元素
            elementsToRemove.forEach(element => {
                if (element && element.parentNode) {
                    element.remove();
                }
            });
            
            // 清理多余的分隔线
            cleanupSeparators(container);
        }
        
        // 最后清理一遍分隔线，确保样式协调
        cleanupSeparators(container);
    }
    
    // 清理多余的分隔线
    function cleanupSeparators(container) {
        const separators = container.querySelectorAll('i.w-\\[0\\.5px\\], i[class*="bg-line-200"]');
        const children = Array.from(container.children);
        
        separators.forEach(separator => {
            const index = children.indexOf(separator);
            
            // 移除末尾的分隔线
            if (index === children.length - 1) {
                separator.remove();
                return;
            }
            
            // 移除连续的分隔线
            const nextElement = children[index + 1];
            if (nextElement && (nextElement.tagName === 'I' && nextElement.className.includes('bg-line-200'))) {
                separator.remove();
                return;
            }
            
            // 移除开头的分隔线
            if (index === 0) {
                separator.remove();
                return;
            }
        });
        
        // 更新children数组并再次检查末尾分隔线
        const updatedChildren = Array.from(container.children);
        if (updatedChildren.length > 0) {
            const lastChild = updatedChildren[updatedChildren.length - 1];
            if (lastChild.tagName === 'I' && lastChild.className.includes('bg-line-200')) {
                lastChild.remove();
            }
        }
    }

    // 主函数
    async function main() {
        try {
            // 等待页面元素加载
            await waitForElement('.flex.items-center.text-sm');

            // 寻找包含搜索按钮的容器
            const containers = document.querySelectorAll('.flex.items-center.text-sm');
            let targetContainer = null;

            for (const container of containers) {
                const searchButtons = container.querySelectorAll('a[id^="search"]');
                if (searchButtons.length >= 2) { // 包含"搜索 名称"和"搜索 合约"
                    targetContainer = container;
                    break;
                }
            }

            if (!targetContainer) {
                console.log('未找到目标容器，尝试备用方案');
                targetContainer = document.querySelector('.flex.items-center.text-sm.gap-x-4px.text-text-300.whitespace-nowrap');
            }
            
            if (targetContainer && !targetContainer.querySelector('[data-narrative-button="true"]')) {
                // 移除分享和皇冠按钮
                removeTargetButtons(targetContainer);

                // 添加分隔线
                const separator = document.createElement('i');
                separator.className = 'w-[0.5px] h-10px bg-line-200';
                targetContainer.appendChild(separator);

                // 添加搜索叙事按钮
                const searchNarrativeButton = createSearchNarrativeButton();
                targetContainer.appendChild(searchNarrativeButton);

                console.log('搜索叙事按钮已添加');
            }
        } catch (error) {
            console.error('脚本执行失败:', error);
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

    // 监听页面变化
    const debouncedMain = debounce(main, 1000);
    const observer = new MutationObserver(() => {
        if (document.querySelector('.flex.items-center.text-sm') && 
            !document.querySelector('[data-narrative-button="true"]')) {
            debouncedMain();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // 初始执行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', main);
    } else {
        setTimeout(main, 1000); // 给页面一些时间完全加载
    }
})(); 