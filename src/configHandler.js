const fs = require('fs');
const path = require('path');

/**
 * 配置处理器
 * 
 * 负责加载和处理JSON配置文件
 * 支持错误处理，当配置文件不存在或格式错误时会抛出相应异常
 */

class ConfigHandler {
  /**
   * 初始化ConfigHandler实例
   * 
   * @param {string} jsonPath - JSON配置文件的路径
   */
  constructor(jsonPath) {
    this.jsonPath = path.resolve(jsonPath);
    this.jsonData = this.loadJson();
  }

  /**
   * 从JSON文件加载配置数据
   * 
   * @returns {object} 配置文件的JSON数据解析后的JavaScript对象
   */
  loadJson() {
    try {
      const data = fs.readFileSync(this.jsonPath, 'utf8');
      const cleanData = data.replace(/^\uFEFF/, '');
      return JSON.parse(cleanData);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`JSON解析错误: ${error.message}`);
      } else if (error.code === 'ENOENT') {
        throw new Error(`配置文件未找到: ${this.jsonPath}`);
      } else {
        throw new Error(`读取配置文件时出错: ${error.message}`);
      }
    }
  }

  /**
   * 获取配置数据
   * 
   * @returns {object} 配置数据的JavaScript对象
   */
  getConfig() {
    return this.jsonData;
  }
}

module.exports = ConfigHandler;