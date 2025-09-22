#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
本地IP监控脚本
检测本地网络接口IP地址变化并自动更新到GitHub Pages
"""

import json
import time
import socket
import requests
import psutil
import os
import sys
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import base64
import logging

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/ip_monitor.log', encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class GitHubAPI:
    """GitHub API操作类"""
    
    def __init__(self, token: str, repo: str, branch: str = 'main'):
        self.token = token
        self.repo = repo  # 格式: username/repository
        self.branch = branch
        self.base_url = 'https://api.github.com'
        self.headers = {
            'Authorization': f'token {token}',
            'Accept': 'application/vnd.github.v3+json'
        }
    
    def get_file_content(self, file_path: str) -> Optional[Dict]:
        """获取文件内容"""
        url = f"{self.base_url}/repos/{self.repo}/contents/{file_path}"
        try:
            response = requests.get(url, headers=self.headers)
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 404:
                return None
            else:
                logger.error(f"获取文件失败: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            logger.error(f"获取文件异常: {e}")
            return None
    
    def update_file(self, file_path: str, content: str, message: str, sha: Optional[str] = None) -> bool:
        """更新文件内容"""
        url = f"{self.base_url}/repos/{self.repo}/contents/{file_path}"
        
        # 将内容编码为base64
        content_encoded = base64.b64encode(content.encode('utf-8')).decode('utf-8')
        
        data = {
            'message': message,
            'content': content_encoded,
            'branch': self.branch
        }
        
        if sha:
            data['sha'] = sha
        
        try:
            response = requests.put(url, headers=self.headers, json=data)
            if response.status_code in [200, 201]:
                logger.info(f"文件更新成功: {file_path}")
                return True
            else:
                logger.error(f"文件更新失败: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            logger.error(f"文件更新异常: {e}")
            return False

class IPMonitor:
    """IP地址监控类"""
    
    def __init__(self, config_file: str = 'config.json'):
        self.config_file = config_file
        self.config = self.load_config()
        self.github_api = GitHubAPI(
            token=self.config['github']['token'],
            repo=self.config['github']['repo'],
            branch=self.config['github']['branch']
        )
        self.last_ip = None
        self.history = []
        self.load_history()
    
    def load_config(self) -> Dict:
        """加载配置文件"""
        try:
            with open(self.config_file, 'r', encoding='utf-8') as f:
                config = json.load(f)
                logger.info("配置文件加载成功")
                return config
        except FileNotFoundError:
            logger.error(f"配置文件不存在: {self.config_file}")
            self.create_default_config()
            sys.exit(1)
        except Exception as e:
            logger.error(f"配置文件加载失败: {e}")
            sys.exit(1)
    
    def create_default_config(self):
        """创建默认配置文件"""
        default_config = {
            "github": {
                "token": "YOUR_GITHUB_TOKEN",
                "repo": "username/repository",
                "branch": "main"
            },
            "monitor": {
                "interval": 60,
                "interface_priority": ["以太网", "WLAN", "Wi-Fi", "无线网络连接"],
                "exclude_interfaces": ["Loopback", "VMware", "VirtualBox", "Hyper-V"]
            },
            "data_file": "data.json"
        }
        
        try:
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(default_config, f, indent=4, ensure_ascii=False)
            logger.info(f"已创建默认配置文件: {self.config_file}")
            logger.info("请编辑配置文件并填入正确的GitHub信息")
        except Exception as e:
            logger.error(f"创建配置文件失败: {e}")
    
    def load_history(self):
        """加载历史记录"""
        try:
            # 尝试从GitHub获取当前数据
            file_content = self.github_api.get_file_content(self.config['data_file'])
            if file_content:
                content = base64.b64decode(file_content['content']).decode('utf-8')
                data = json.loads(content)
                self.history = data.get('history', [])
                self.last_ip = data.get('localIP')
                logger.info(f"从GitHub加载历史记录: {len(self.history)}条")
            else:
                logger.info("GitHub上没有找到数据文件，将创建新的")
                self.history = []
        except Exception as e:
            logger.error(f"加载历史记录失败: {e}")
            self.history = []
    
    def get_local_ip(self) -> Tuple[Optional[str], Optional[str]]:
        """获取本地IP地址和网络接口名"""
        try:
            # 获取所有网络接口
            interfaces = psutil.net_if_addrs()
            interface_stats = psutil.net_if_stats()
            
            # 按优先级查找接口
            priority_interfaces = self.config['monitor']['interface_priority']
            exclude_keywords = self.config['monitor']['exclude_interfaces']
            
            # 首先按优先级查找
            for priority_name in priority_interfaces:
                for interface_name, addresses in interfaces.items():
                    if priority_name.lower() in interface_name.lower():
                        # 检查接口是否排除
                        if any(exclude.lower() in interface_name.lower() for exclude in exclude_keywords):
                            continue
                        
                        # 检查接口是否激活
                        if interface_name in interface_stats and interface_stats[interface_name].isup:
                            for addr in addresses:
                                if addr.family == socket.AF_INET and not addr.address.startswith('127.'):
                                    logger.info(f"找到优先网络接口: {interface_name} - {addr.address}")
                                    return addr.address, interface_name
            
            # 如果没找到优先接口，查找其他可用接口
            for interface_name, addresses in interfaces.items():
                # 排除特定接口
                if any(exclude.lower() in interface_name.lower() for exclude in exclude_keywords):
                    continue
                
                # 检查接口是否激活
                if interface_name in interface_stats and interface_stats[interface_name].isup:
                    for addr in addresses:
                        if addr.family == socket.AF_INET and not addr.address.startswith('127.'):
                            logger.info(f"找到网络接口: {interface_name} - {addr.address}")
                            return addr.address, interface_name
            
            logger.warning("未找到可用的网络接口")
            return None, None
            
        except Exception as e:
            logger.error(f"获取本地IP失败: {e}")
            return None, None
    
    def update_data_file(self, ip: str, interface: str) -> bool:
        """更新数据文件到GitHub"""
        current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # 创建新的历史记录项
        change_type = "new" if self.last_ip is None else ("updated" if ip != self.last_ip else "same")
        
        if change_type != "same":
            history_item = {
                "timestamp": current_time,
                "ip": ip,
                "change": change_type
            }
            self.history.append(history_item)
            
            # 只保留最近50条记录
            if len(self.history) > 50:
                self.history = self.history[-50:]
        
        # 创建数据结构
        data = {
            "localIP": ip,
            "networkInterface": interface,
            "lastUpdate": current_time,
            "history": self.history
        }
        
        # 转换为JSON字符串
        json_content = json.dumps(data, ensure_ascii=False, indent=2)
        
        # 获取当前文件的SHA（如果存在）
        file_content = self.github_api.get_file_content(self.config['data_file'])
        sha = file_content['sha'] if file_content else None
        
        # 更新文件
        commit_message = f"自动更新IP地址: {ip} ({current_time})"
        success = self.github_api.update_file(
            file_path=self.config['data_file'],
            content=json_content,
            message=commit_message,
            sha=sha
        )
        
        if success:
            self.last_ip = ip
            logger.info(f"IP地址数据已更新到GitHub: {ip}")
        
        return success
    
    def run_once(self) -> bool:
        """执行一次检查"""
        logger.info("开始检查IP地址...")
        
        current_ip, interface = self.get_local_ip()
        
        if current_ip is None:
            logger.error("无法获取当前IP地址")
            return False
        
        logger.info(f"当前IP地址: {current_ip} (接口: {interface})")
        
        # 检查IP是否发生变化
        if current_ip != self.last_ip:
            logger.info(f"IP地址发生变化: {self.last_ip} -> {current_ip}")
            success = self.update_data_file(current_ip, interface)
            if success:
                logger.info("IP地址更新成功")
            else:
                logger.error("IP地址更新失败")
            return success
        else:
            logger.info("IP地址未发生变化")
            # 即使IP未变化，也定期更新最后检查时间（每小时一次）
            last_update_time = None
            try:
                file_content = self.github_api.get_file_content(self.config['data_file'])
                if file_content:
                    content = base64.b64decode(file_content['content']).decode('utf-8')
                    data = json.loads(content)
                    last_update_str = data.get('lastUpdate', '')
                    if last_update_str:
                        last_update_time = datetime.strptime(last_update_str, "%Y-%m-%d %H:%M:%S")
            except:
                pass
            
            # 如果超过1小时没更新，强制更新一次
            if last_update_time is None or (datetime.now() - last_update_time).total_seconds() > 3600:
                logger.info("执行定期更新...")
                return self.update_data_file(current_ip, interface)
            
            return True
    
    def run_monitor(self):
        """运行监控循环"""
        logger.info("启动IP地址监控服务...")
        logger.info(f"监控间隔: {self.config['monitor']['interval']}秒")
        
        while True:
            try:
                self.run_once()
            except KeyboardInterrupt:
                logger.info("收到停止信号，退出监控...")
                break
            except Exception as e:
                logger.error(f"监控过程中发生错误: {e}")
            
            # 等待下一次检查
            time.sleep(self.config['monitor']['interval'])

def main():
    """主函数"""
    if len(sys.argv) > 1 and sys.argv[1] == '--once':
        # 只执行一次检查
        monitor = IPMonitor()
        success = monitor.run_once()
        sys.exit(0 if success else 1)
    else:
        # 运行持续监控
        monitor = IPMonitor()
        monitor.run_monitor()

if __name__ == '__main__':
    main()