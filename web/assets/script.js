// 全局变量
let autoRefreshEnabled = true;
let refreshInterval;
let currentIP = null;
let ipData = {
    localIP: '加载中...',
    networkInterface: '加载中...',
    lastUpdate: '加载中...',
    history: []
};

// 默认服务配置
const defaultServices = {
    alist: { port: 5244, name: 'Alist文件管理', icon: '📁' },
    rdp: { port: 3389, name: '远程桌面', icon: '🖥️' },
    ssh: { port: 22, name: 'SSH连接', icon: '💻' },
    web_server: { port: 8080, name: 'Web服务', icon: '🌐' },
    ftp: { port: 21, name: 'FTP服务', icon: '📂' }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    loadIPData();
    initializeServices();
    startAutoRefresh();
});

// 加载IP数据
async function loadIPData() {
    try {
        updateStatus('updating', '正在获取数据...');
        
        // 尝试从data.json文件加载数据
        const response = await fetch('../data.json?t=' + new Date().getTime());
        if (response.ok) {
            const data = await response.json();
            updateUIWithData(data);
            updateStatus('online', '在线');
        } else {
            throw new Error('无法加载数据文件');
        }
    } catch (error) {
        console.error('加载IP数据失败:', error);
        updateStatus('offline', '离线');
        updateUIWithData({
            localIP: '无法获取',
            networkInterface: '无法获取',
            lastUpdate: '数据加载失败',
            history: []
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
    
    // 如果IP发生变化，更新服务链接
    if (currentIP !== data.localIP) {
        currentIP = data.localIP;
        updateServicesLinks();
    }
}

// 更新状态指示器
function updateStatus(status, text) {
    const dot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    
    if (dot && statusText) {
        // 移除所有状态类
        dot.classList.remove('online', 'offline', 'updating');
        // 添加新状态类
        dot.classList.add(status);
        statusText.textContent = text;
    }
}

// 初始化服务按钮
function initializeServices() {
    const servicesGrid = document.getElementById('servicesGrid');
    if (!servicesGrid) return;
    
    Object.entries(defaultServices).forEach(([key, service]) => {
        const serviceBtn = createServiceButton(key, service);
        servicesGrid.appendChild(serviceBtn);
    });
}

// 创建服务按钮
function createServiceButton(key, service) {
    const button = document.createElement('div');
    button.className = 'service-btn';
    button.onclick = () => openService(key, service);
    
    button.innerHTML = `
        <span class="service-icon">${service.icon}</span>
        <div class="service-info">
            <div class="service-name">${service.name}</div>
            <div class="service-port">:${service.port}</div>
        </div>
    `;
    
    return button;
}

// 打开服务
function openService(key, service) {
    if (!currentIP || currentIP === '无法获取' || currentIP === '加载中...') {
        showNotification('当前IP地址不可用', 'error');
        return;
    }
    
    const url = generateServiceURL(key, service, currentIP);
    
    if (key === 'rdp') {
        // RDP需要特殊处理
        openRDP(currentIP);
    } else if (url) {
        window.open(url, '_blank');
        showNotification(`正在打开 ${service.name}`, 'success');
    } else {
        // 复制连接信息到剪贴板
        const connectionInfo = `${currentIP}:${service.port}`;
        copyToClipboard(null, connectionInfo);
        showNotification(`${service.name} 连接信息已复制: ${connectionInfo}`, 'success');
    }
}

// 生成服务URL
function generateServiceURL(key, service, ip) {
    switch(key) {
        case 'alist':
            return `http://${ip}:${service.port}`;
        case 'web_server':
            return `http://${ip}:${service.port}`;
        case 'ssh':
        case 'ftp':
        case 'rdp':
            return null; // 这些服务需要专用客户端
        default:
            return `http://${ip}:${service.port}`;
    }
}

// 打开RDP连接
function openRDP(ip) {
    // 创建RDP文件内容
    const rdpContent = `full address:s:${ip}:3389
audiocapturemode:i:0
session bpp:i:32
compression:i:1
keyboardhook:i:2
audiomode:i:0
displayconnectionbar:i:1
username:s:
domain:s:`;

    // 创建并下载RDP文件
    const blob = new Blob([rdpContent], { type: 'application/x-rdp' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `remote-${ip}.rdp`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('RDP文件已下载，请双击打开', 'success');
}

// 更新服务链接
function updateServicesLinks() {
    // 重新生成服务按钮以更新IP地址
    const servicesGrid = document.getElementById('servicesGrid');
    if (servicesGrid) {
        servicesGrid.innerHTML = '';
        initializeServices();
    }
}

// 更新历史记录显示
function updateHistoryDisplay(history) {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;
    
    if (!history || history.length === 0) {
        historyList.innerHTML = `
            <div class="history-item">
                <span class="history-time">暂无记录</span>
                <span class="history-ip">-</span>
                <span class="history-status init">等待数据</span>
            </div>
        `;
        return;
    }
    
    // 显示最近的10条记录
    const recentHistory = history.slice(-10).reverse();
    
    historyList.innerHTML = recentHistory.map(item => {
        const statusClass = getStatusClass(item.change);
        const statusText = getStatusText(item.change);
        
        return `
            <div class="history-item">
                <span class="history-time">${item.timestamp}</span>
                <span class="history-ip">${item.ip}</span>
                <span class="history-status ${statusClass}">${statusText}</span>
            </div>
        `;
    }).join('');
}

// 获取状态CSS类
function getStatusClass(change) {
    switch(change) {
        case 'new': return 'new';
        case 'updated': return 'updated';
        case 'error': return 'updated';
        default: return 'init';
    }
}

// 获取状态显示文本
function getStatusText(change) {
    switch(change) {
        case 'new': return '新增';
        case 'updated': return '更新';
        case 'error': return '错误';
        default: return '初始化';
    }
}

// 复制到剪贴板
async function copyToClipboard(elementId, text = null) {
    let textToCopy;
    
    if (text) {
        textToCopy = text;
    } else if (elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            textToCopy = element.textContent;
        }
    } else {
        return;
    }
    
    if (!textToCopy || textToCopy === '加载中...' || textToCopy === '无法获取') {
        showNotification('无有效内容可复制', 'error');
        return;
    }
    
    try {
        await navigator.clipboard.writeText(textToCopy);
        showNotification(`已复制: ${textToCopy}`, 'success');
    } catch (err) {
        // 备用方法
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification(`已复制: ${textToCopy}`, 'success');
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
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
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
    
    if (button && status) {
        if (autoRefreshEnabled) {
            startAutoRefresh();
            button.textContent = '暂停';
            status.textContent = '启用';
            showNotification('自动刷新已启用', 'success');
        } else {
            stopAutoRefresh();
            button.textContent = '启用';
            status.textContent = '暂停';
            showNotification('自动刷新已暂停', 'success');
        }
    }
}

// 开始自动刷新
function startAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    
    if (autoRefreshEnabled) {
        refreshInterval = setInterval(() => {
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

// 手动刷新
function manualRefresh() {
    updateStatus('updating', '手动刷新中...');
    loadIPData();
}

// 处理页面可见性变化
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        if (autoRefreshEnabled) {
            stopAutoRefresh();
        }
    } else {
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