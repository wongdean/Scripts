// ==UserScript==
// @name         Debot GMGN 跳转助手
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  在debot.ai今日榜单添加跳转到GMGN的按钮
// @author       You
// @match        https://debot.ai/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // GMGN logo base64
    const gmgnLogo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAABYlAAAWJQFJUiTwAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAGbSURBVHgB7ZqhTgNBFEXvEgIewRcgoAGDAYcifMFC+hfYKgIGi0BjCfAFBIWjBtMNIPgCBA5BzbZ2bpN5mcxs2+Td42ZmZ7p5yb3v9e0AQgjPVCjMXVO3sfX7p89g/HLZJL1D6fNX4BwFAM5ZRSbHF7uBJg+2NuMb6pmZYD9rtuvzJQE4Rx6AwvTWb6PrQ5yiy/OvRmdIQRKAc+QBKExVhaV327ZIgfN+6fMZSQDOkQdYmkv9v55Kv96Jrj+P+OcblEQSgHPcB6BiD7gZHAUPnF+/Rg/Y2O4F45O9vLzcNdwzlATgHNUBPDH8/gnG7AkWvH/RzNYRIZIAnCMPsB5YNk2XRhKAc+QBPGHlzYf+I1KYfs/HPLHen5EE4Bz1A3jC6hEy3A+wyO0XpGr89+sjGOt+AKEAwDnZPf9cz7A8wdI8a5zRPUEDBQDOyb4fYGnM8oj9tzGiHK4FQ8sTUr9lSgJwjuoAFIY1z3l/8PePFN7JAxj2BKv2ZyQBOEd1AJYcrhMsT0hFEoBzVAcgk9J536J0XSAJwDnuAzAB+j+AWaJ6ICAAAAAASUVORK5CYII=';

    // 创建GMGN跳转按钮的函数
    function createGmgnButton(ca) {
        const button = document.createElement('button');
        button.style.cssText = `
            background: linear-gradient(135deg, #00d4aa, #00b894);
            border: none;
            border-radius: 6px;
            padding: 4px 8px;
            margin-left: 8px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 12px;
            color: white;
            font-weight: 500;
            transition: all 0.3s ease;
            box-shadow: 0 2px 4px rgba(0, 212, 170, 0.2);
        `;

        button.innerHTML = `
            <img src="${gmgnLogo}" style="width: 14px; height: 14px; border-radius: 2px;" alt="GMGN">
            <span>GMGN</span>
        `;

        // 悬停效果
        button.onmouseover = () => {
            button.style.transform = 'translateY(-1px)';
            button.style.boxShadow = '0 4px 8px rgba(0, 212, 170, 0.3)';
        };
        button.onmouseout = () => {
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = '0 2px 4px rgba(0, 212, 170, 0.2)';
        };

        // 点击跳转到GMGN
        button.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.open(`https://gmgn.ai/sol/token/${ca}`, '_blank');
        };

        return button;
    }

    // 提取CA地址的函数
    function extractCA(linkElement) {
        if (!linkElement || !linkElement.href) return null;

        // 从href中提取CA: /token/solana/8fCWwxUWryzMWFS8WfuC7Tebkg5nWMQ4xrzrw7yJBAGS
        const match = linkElement.href.match(/\/token\/solana\/([a-zA-Z0-9]{32,64})/);
        return match ? match[1] : null;
    }

    // 添加GMGN按钮到榜单项目
    function addGmgnButtons() {
        // 查找今日榜单中的token链接
        const tokenLinks = document.querySelectorAll('a[href*="/token/solana/"]');

        tokenLinks.forEach(link => {
            // 检查是否已经添加过按钮
            if (link.parentElement.querySelector('.gmgn-jump-btn')) return;

            const ca = extractCA(link);
            if (ca) {
                const button = createGmgnButton(ca);
                button.classList.add('gmgn-jump-btn');

                // 将按钮添加到链接后面
                if (link.parentElement) {
                    link.parentElement.insertBefore(button, link.nextSibling);
                }
            }
        });
    }

    // 监听页面变化
    function observePageChanges() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // 延迟执行，确保DOM完全加载
                    setTimeout(addGmgnButtons, 500);
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // 初始化
    function init() {
        // 页面加载完成后添加按钮
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(addGmgnButtons, 1000);
            });
        } else {
            setTimeout(addGmgnButtons, 1000);
        }

        // 开始监听页面变化
        observePageChanges();
    }

    // 启动脚本
    init();
})();