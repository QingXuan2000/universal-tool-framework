const os = require('os');

/**
 * 系统工具函数
 * 
 * 提供系统相关的实用功能，主要用于系统架构检测
 * 支持多种系统架构，自动映射Node.js架构标识到通用架构名称
 */

/**
 * 获取当前系统架构
 * 
 * 将Node.js返回的架构信息映射到标准架构名称
 * 
 * @returns {string} 系统架构名称
 */
function getSystemArchitecture() {
  const arch = os.arch();
  
  if (['arm64', 'aarch64'].includes(arch)) {
    return 'ARM64';
  } else if (['arm', 'armv7l'].includes(arch)) {
    return 'ARM32';
  } else if (['ia32'].includes(arch)) {
    return 'X86';
  } else if (['x64', 'amd64'].includes(arch)) {
    return 'X86_64';
  } else {
    return 'Unknown Architecture(未知系统架构)';
  }
}

/**
 * 检测操作系统类型
 * 
 * 返回当前运行环境的操作系统类型
 * 
 * @returns {string} 操作系统类型
 */
function detectOperatingSystem() {
  const platform = os.platform();
  
  if (platform === 'win32') {
    return 'Windows';
  } else if (platform === 'linux') {
    return 'Linux';
  } else if (platform === 'darwin') {
    return 'MacOS';
  } else {
    return 'Unknown OS';
  }
}

module.exports = {
  getSystemArchitecture,
  detectOperatingSystem
};