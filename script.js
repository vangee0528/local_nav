// 全局变量
let autoRefreshEnabled = true;
let refreshInterval;
let ipData = {
    localIP: '加载中...',
    networkInterface: '加载中...',
    lastUpdate: '加载中...',
    history: []
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    loadIPData();
    startAutoRefresh();
    updateLastRefreshTime();
});

// 加载IP数据
async function loadIPData() {
    try {
        // 尝试从data.json文件加载数据
        const response = await fetch('data.json?t=' + new Date().getTime());
        if (response.ok) {
            const data = await response.json();
            updateUIWithData(data);
            updateStatus('online', '在线 - 数据已更新');
        } else {
            throw new Error('无法加载数据文件');
        }
    } catch (error) {
        console.error('加载IP数据失败:', error);
        updateStatus('offline', '离线 - 无法获取数据');
        // 显示默认数据
        updateUIWithData({
            localIP: '无法获取',
            networkInterface: '无法获取',
            lastUpdate: '数据加载失败',
            history: [
                {
                    timestamp: new Date().toLocaleString('zh-CN'),
                    ip: '无法获取',
                    change: 'error'
                }
            ]
        });
    }
}

// 使用数据更新UI
function updateUIWithData(data) {
    ipData = data;
    
    // 更新IP信息
    document.getElementById('localIP').textContent = data.localIP || '无法获取';
    document.getElementById('networkInterface').textContent = data.networkInterface || '无法获取';
    document.getElementById('lastUpdate').textContent = data.lastUpdate || '无法获取';
    
    // 更新历史记录
    updateHistoryDisplay(data.history || []);
}

// 更新状态指示器
function updateStatus(status, text) {
    const indicator = document.getElementById('statusIndicator');
    const dot = indicator.querySelector('.status-dot');
    const statusText = indicator.querySelector('.status-text');
    
    // 移除所有状态类
    dot.classList.remove('online', 'offline', 'updating');
    // 添加新状态类
    dot.classList.add(status);
    statusText.textContent = text;
}

// 更新历史记录显示
function updateHistoryDisplay(history) {
    const historyList = document.getElementById('historyList');
    
    if (!history || history.length === 0) {
        historyList.innerHTML = '<div class="history-item"><span class="history-time">暂无记录</span><span class="history-ip">-</span><span class="history-change init">等待数据</span></div>';
        return;
    }
    
    // 显示最近的10条记录
    const recentHistory = history.slice(-10).reverse();
    
    historyList.innerHTML = recentHistory.map(item => {
        const changeClass = getChangeClass(item.change);
        const changeText = getChangeText(item.change);
        
        return `
            <div class="history-item">
                <span class="history-time">${item.timestamp}</span>
                <span class="history-ip">${item.ip}</span>
                <span class="history-change ${changeClass}">${changeText}</span>
            </div>
        `;
    }).join('');
}

// 获取变更类型的CSS类
function getChangeClass(change) {
    switch(change) {
        case 'new': return 'new';
        case 'updated': return 'updated';
        case 'error': return 'updated';
        default: return 'init';
    }
}

// 获取变更类型的显示文本
function getChangeText(change) {
    switch(change) {
        case 'new': return '新增';
        case 'updated': return '更新';
        case 'error': return '错误';
        default: return '初始化';
    }
}

// 复制到剪贴板
async function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    const text = element.textContent;
    
    if (text === '加载中...' || text === '无法获取') {
        showNotification('无有效内容可复制', 'error');
        return;
    }
    
    try {
        await navigator.clipboard.writeText(text);
        showNotification('已复制到剪贴板: ' + text, 'success');
    } catch (err) {
        // 备用方法
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('已复制到剪贴板: ' + text, 'success');
    }
}

// 显示通知
function showNotification(message, type = 'success') {
    // 移除现有通知
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // 创建新通知
    const notification = document.createElement('div');
    notification.className = type === 'success' ? 'copy-success' : 'copy-error';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 6px;
        color: white;
        background: ${type === 'success' ? '#48bb78' : '#f56565'};
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // 3秒后移除通知
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

// 切换自动刷新
function toggleAutoRefresh() {
    autoRefreshEnabled = !autoRefreshEnabled;
    const button = document.getElementById('refreshToggle');
    const status = document.getElementById('autoRefreshStatus');
    
    if (autoRefreshEnabled) {
        startAutoRefresh();
        button.textContent = '关闭自动刷新';
        status.textContent = '开启';
        showNotification('自动刷新已开启', 'success');
    } else {
        stopAutoRefresh();
        button.textContent = '开启自动刷新';
        status.textContent = '关闭';
        showNotification('自动刷新已关闭', 'success');
    }
}

// 开始自动刷新
function startAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    
    if (autoRefreshEnabled) {
        refreshInterval = setInterval(() => {
            updateStatus('updating', '正在更新数据...');
            loadIPData();
        }, 30000); // 30秒刷新一次
    }
}

// 停止自动刷新
function stopAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
}

// 更新最后刷新时间显示
function updateLastRefreshTime() {
    setInterval(() => {
        const now = new Date();
        const timeString = now.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        // 可以在这里添加页面最后刷新时间的显示
    }, 1000);
}

// 手动刷新按钮（可以添加到HTML中）
function manualRefresh() {
    updateStatus('updating', '手动刷新中...');
    loadIPData();
    showNotification('手动刷新完成', 'success');
}

// 处理页面可见性变化
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        // 页面隐藏时停止刷新以节省资源
        if (autoRefreshEnabled) {
            stopAutoRefresh();
        }
    } else {
        // 页面显示时重新开始刷新并立即更新一次
        if (autoRefreshEnabled) {
            loadIPData();
            startAutoRefresh();
        }
    }
});

// 错误处理
window.addEventListener('error', function(e) {
    console.error('页面错误:', e.error);
    updateStatus('offline', '页面出现错误');
});

// 网络状态监听
window.addEventListener('online', function() {
    showNotification('网络连接已恢复', 'success');
    if (autoRefreshEnabled) {
        loadIPData();
    }
});

window.addEventListener('offline', function() {
    showNotification('网络连接已断开', 'error');
    updateStatus('offline', '网络离线');
});