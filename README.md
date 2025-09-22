# 本地设备IP地址监控系统

一个自动监控本地设备内网IP地址变化并通过GitHub Pages展示的系统。

## 📋 功能特性

- 🏠 **实时IP监控**: 自动检测本地设备内网IP地址变化
- 📊 **可视化展示**: 通过GitHub Pages提供美观的Web界面
- 📱 **响应式设计**: 支持桌面端和移动端访问
- 📈 **历史记录**: 记录IP地址变更历史
- 🔄 **自动更新**: 检测到IP变化时自动更新GitHub Pages
- ⏱️ **定时检查**: 可配置的监控间隔
- 🌐 **网络接口优先级**: 支持多网卡环境的接口优先级配置

## 🚀 快速开始

### 1. 创建GitHub仓库

1. 在GitHub上创建一个新的公开仓库（例如：`local-ip-monitor`）
2. 克隆仓库到本地，或直接上传项目文件

### 2. 获取GitHub Personal Access Token

1. 访问 [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. 点击 "Generate new token (classic)"
3. 设置token名称，选择过期时间
4. 勾选以下权限：
   - `repo` (完整仓库访问权限)
   - `workflow` (GitHub Actions权限，可选)
5. 点击生成并**保存好token**（只显示一次）

### 3. 配置项目

1. 编辑 `config.json` 文件：

```json
{
    "github": {
        "token": "ghp_xxxxxxxxxxxxxxxxxxxx",  // 你的GitHub Token
        "repo": "username/repository",        // 你的仓库名
        "branch": "main"                      // 分支名
    },
    "monitor": {
        "interval": 60,                       // 检查间隔（秒）
        "interface_priority": ["以太网", "WLAN", "Wi-Fi", "无线网络连接"],
        "exclude_interfaces": ["Loopback", "VMware", "VirtualBox", "Hyper-V"]
    },
    "data_file": "data.json"                  // 数据文件名
}
```

### 4. 安装Python依赖

```bash
# 创建虚拟环境（推荐）
python -m venv venv
venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt
```

### 5. 启用GitHub Pages

1. 在GitHub仓库中，进入 `Settings` > `Pages`
2. 在 "Source" 部分选择 "Deploy from a branch"
3. 选择 `main` 分支和 `/ (root)` 文件夹
4. 点击 Save
5. 几分钟后，你的网站将在 `https://username.github.io/repository` 可用

### 6. 运行监控脚本

```bash
# 执行单次检查
python ip_monitor.py --once

# 运行持续监控
python ip_monitor.py
```

## 📂 项目结构

```
local_nav/
├── index.html          # 主页面
├── style.css           # 样式文件
├── script.js           # 前端JavaScript
├── data.json           # IP数据文件（自动生成）
├── ip_monitor.py       # Python监控脚本
├── config.json         # 配置文件
├── requirements.txt    # Python依赖
├── setup.bat          # Windows安装脚本
├── run.bat            # Windows运行脚本
└── README.md          # 说明文档
```

## ⚙️ 配置说明

### config.json 配置项

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `github.token` | GitHub Personal Access Token | 必须配置 |
| `github.repo` | 仓库名称 (格式: username/repo) | 必须配置 |
| `github.branch` | 分支名称 | "main" |
| `monitor.interval` | 检查间隔（秒） | 60 |
| `monitor.interface_priority` | 网络接口优先级列表 | 见默认配置 |
| `monitor.exclude_interfaces` | 排除的网络接口关键词 | 见默认配置 |
| `data_file` | 数据文件名 | "data.json" |

### 网络接口配置

脚本会按照 `interface_priority` 中的顺序查找网络接口：

1. **以太网**: 有线网络连接
2. **WLAN/Wi-Fi**: 无线网络连接
3. **无线网络连接**: Windows中文版的无线网络

可以根据你的系统语言和网络环境调整这些名称。

## 🔧 高级用法

### 1. 作为Windows服务运行

可以使用 `nssm` 或 `sc` 命令将脚本注册为Windows服务：

```batch
# 使用NSSM (推荐)
nssm install IPMonitor "C:\path\to\python.exe" "C:\path\to\ip_monitor.py"
nssm start IPMonitor
```

### 2. 设置开机自启动

创建批处理文件并添加到Windows启动文件夹：

```batch
@echo off
cd /d "C:\path\to\your\project"
call venv\Scripts\activate
python ip_monitor.py
```

将批处理文件复制到：`C:\Users\%USERNAME%\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup`

### 3. 使用Task Scheduler

1. 打开 "任务计划程序"
2. 创建基本任务
3. 设置触发器为 "计算机启动时"
4. 操作设置为运行Python脚本

### 4. 日志管理

脚本会自动生成 `ip_monitor.log` 日志文件，记录运行状态和错误信息。

## 🌐 访问网站

部署完成后，你可以通过以下方式访问：

- **GitHub Pages**: `https://username.github.io/repository`
- **自定义域名**: 在仓库设置中配置自定义域名

## 🔒 安全注意事项

1. **Token安全**: 
   - 不要将GitHub Token提交到公开仓库
   - 定期更换Token
   - 使用最小权限原则

2. **网络安全**:
   - 内网IP地址相对安全，但仍需谨慎
   - 考虑使用私有仓库来存储敏感信息

3. **访问控制**:
   - 可以将仓库设为私有并配置访问权限
   - 使用GitHub Pages的访问控制功能

## 🐛 故障排除

### 常见问题

1. **"配置文件不存在"**
   - 确保 `config.json` 文件存在且格式正确
   - 检查文件编码为UTF-8

2. **"GitHub API访问失败"**
   - 检查Token是否正确且有足够权限
   - 确认仓库名称格式正确
   - 检查网络连接

3. **"无法获取IP地址"**
   - 检查网络连接
   - 调整 `interface_priority` 配置
   - 查看日志文件了解详细错误

4. **"GitHub Pages不显示最新数据"**
   - GitHub Pages可能有缓存延迟
   - 检查 `data.json` 文件是否正确更新
   - 尝试强制刷新浏览器缓存

### 调试技巧

1. **使用单次运行模式**:
   ```bash
   python ip_monitor.py --once
   ```

2. **查看详细日志**:
   ```bash
   tail -f ip_monitor.log
   ```

3. **手动测试GitHub API**:
   使用工具如Postman测试API访问

## 📊 监控数据格式

生成的 `data.json` 文件格式：

```json
{
    "localIP": "192.168.1.100",
    "networkInterface": "以太网适配器",
    "lastUpdate": "2025-09-22 10:30:00",
    "history": [
        {
            "timestamp": "2025-09-22 08:00:00",
            "ip": "192.168.1.105",
            "change": "new"
        },
        {
            "timestamp": "2025-09-22 09:15:00",
            "ip": "192.168.1.100",
            "change": "updated"
        }
    ]
}
```

## 🤝 贡献

欢迎提交Issue和Pull Request来改进这个项目！

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

- [psutil](https://github.com/giampaolo/psutil) - 系统和进程监控库
- [requests](https://github.com/psf/requests) - HTTP库
- GitHub Pages - 免费的静态网站托管服务

---

如果这个项目对你有帮助，请给个⭐️支持一下！