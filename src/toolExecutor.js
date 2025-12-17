const { spawn, execSync } = require('child_process');
const readline = require('readline');
const { getSystemArchitecture } = require('./systemUtils');
const UIHandler = require('./uiHandler');

/**
 * 工具执行器
 * 
 * 负责执行外部工具和命令
 * 处理外部工具的执行，包括架构检测、路径解析、命令执行和错误处理
 */

class ToolExecutor {
  /**
   * 执行工具
   * 
   * 根据配置的路径和系统架构执行外部工具
   * 支持多架构工具路径配置，自动选择合适的路径
   * 
   * @param {string|object} toolPath - 工具路径，可以是字符串或包含多架构路径的对象
   * @param {string|null} arch - 指定的系统架构，如果为null则使用系统默认架构
   * @param {string} toolPackageDir - 工具包根目录路径，用于设置工作目录
   * @returns {Promise<void>} 执行完成的Promise
   */
  async executeTool(toolPath, arch = null, toolPackageDir = null) {
    const architecture = arch || getSystemArchitecture();
    
    let resolvedPath;
    
    // 如果toolPath是对象（包含不同架构的路径），则选择对应架构的路径
    if (typeof toolPath === 'object' && toolPath !== null) {
      // 按优先级选择路径：指定架构 -> X86_64 -> 第一个可用路径
      resolvedPath = toolPath[architecture] || toolPath['X86_64'] || Object.values(toolPath)[0];
    } else {
      resolvedPath = toolPath;
    }
    
    try {
      // 显示执行信息
      console.log(`\x1b[33m正在运行命令 (${architecture}): ${resolvedPath}\x1b[0m`);
      
      // 设置工作目录为工具包目录，以便相对路径能够正确解析
      const options = { shell: true, stdio: 'inherit' };
      if (toolPackageDir) {
        options.cwd = toolPackageDir;  // 设置工作目录为工具包目录
      }
      
      // 在Windows上使用spawn启动可执行文件
      const child = spawn(resolvedPath, options);
      
      // 等待命令完成
      await new Promise((resolve, reject) => {
        child.on('close', (code) => {
          if (code !== 0) {
            console.log(`\x1b[31m命令执行结束，返回码：${code}\x1b[0m`);
          } else {
            console.log(`\x1b[32m命令执行完成\x1b[0m`);
          }
          resolve();
        });
        
        child.on('error', (error) => {
          console.log(`\x1b[31m执行命令时出错：${error.message}\x1b[0m`);
          reject(error);
        });
      });
    } catch (error) {
      console.log(`\x1b[31m执行命令时出错：${error.message}\x1b[0m`);
    }
    
    // 等待用户按Enter键返回菜单
    await UIHandler.waitForEnterReturnMenu();
  }
}

module.exports = {
  ToolExecutor
};