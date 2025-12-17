const fs = require('fs');
const path = require('path');

/**
 * 方向键菜单引擎
 * 
 * 专门处理支持方向键选择的菜单显示和操作
 * 通过配置文件管理显示设置，如是否清屏、Logo路径等
 */

class ArrowMenuEngine {
  /**
   * 初始化方向键菜单引擎
   * 
   * @param {object} config - 菜单配置对象，包含菜单结构和显示设置
   * @param {string} configDir - 配置文件目录路径
   */
  constructor(config, configDir = './config') {
    this.config = config;
    
    // 从settings.json加载显示设置
    try {
      const settingsConfigPath = configDir + '/settings.json';
      const settingsConfigContent = fs.readFileSync(settingsConfigPath, 'utf8');
      this.settingsConfig = JSON.parse(settingsConfigContent);
      this.settings = this.settingsConfig.settings || {};
      
      // 处理 logo 设置
      const logoConfig = this.settingsConfig.logo || {};
      if (logoConfig.logo_path && logoConfig.logo_path.startsWith('./')) {
        this.logoSettings = {
          display_logo: logoConfig.display_logo !== false,
          logo_path: path.join(configDir, logoConfig.logo_path.substring(2)) // 移除 './' 并拼接完整路径
        };
      } else if (logoConfig.logo_path) {
        // 如果是绝对路径或完整的路径，直接使用
        this.logoSettings = {
          display_logo: logoConfig.display_logo !== false,
          logo_path: logoConfig.logo_path
        };
      } else {
        // 如果没有指定 logo_path，使用默认路径
        this.logoSettings = {
          display_logo: logoConfig.display_logo !== false,
          logo_path: configDir + '/logo'
        };
      }
    } catch (error) {
      // 如果settings.json文件不存在或解析失败，使用默认配置
      this.settingsConfig = {};
      this.settings = {
        display_clear: true,
        arch_picker: true
      };
      this.logoSettings = {
        display_logo: true,
        logo_path: configDir + '/logo'
      };
    }
    
    this.configDir = configDir;
  }

  /**
   * 显示带方向键选择的菜单
   * 
   * @param {string} menuId - 菜单的唯一标识符
   * @returns {Promise<number>} 用户选择的菜单项ID
   */
  async displayInteractiveMenu(menuId) {
    const menu = this.config.menu[menuId];
    if (!menu) {
      console.log('\x1b[31m菜单不存在: ' + menuId + '\x1b[0m');
      return null;
    }
    
    if (!menu.items || !Array.isArray(menu.items)) {
      console.log('\x1b[31m菜单项不存在或格式错误\x1b[0m');
      return null;
    }
    
    // 导入 UIHandler（避免循环依赖）
    const UIHandler = require('./uiHandler');
    
    // 使用方向键选择菜单项，传递配置目录
    const selectedId = await UIHandler.selectWithArrowKeys(menu.items, menu.title, this.configDir);
    return selectedId;
  }

  /**
   * 获取菜单项
   * 
   * 根据菜单ID和选择项ID获取对应的菜单项配置
   * 
   * @param {string} menuId - 菜单的唯一标识符
   * @param {number} choice - 用户选择的菜单项ID
   * @returns {object|null} 找到的菜单项配置对象，未找到则返回null
   */
  getMenuItem(menuId, choice) {
    const menu = this.config.menu[menuId];
    if (!menu || !menu.items) {
      return null;
    }
    
    return menu.items.find(item => item.id === choice) || null;
  }

  /**
   * 获取父菜单ID
   * 
   * 获取指定菜单的父级菜单ID，用于实现菜单导航功能
   * 
   * @param {string} menuId - 菜单的唯一标识符
   * @returns {string|null} 父菜单ID，如无父菜单则返回null
   */
  getParentMenu(menuId) {
    const menu = this.config.menu[menuId];
    if (!menu) {
      return null;
    }
    
    return menu.parent || null;
  }

  /**
   * 清屏
   * 
   * 根据配置决定是否执行清屏操作
   * 使用ANSI转义序列实现跨平台清屏功能
   */
  clearScreen() {
    const displayClear = this.settingsConfig.settings && this.settingsConfig.settings.display_clear;
    
    if (displayClear) {
      // 使用ANSI转义序列清屏，兼容所有平台
      process.stdout.write('\u001b[2J\u001b[0;0H');
    }
  }

  /**
   * 显示Logo
   * 
   * 从配置的路径读取Logo文件并显示
   * 如果Logo文件不存在或读取失败，则显示默认的Logo文本
   */
  displayLogo() {
    const displayLogoSetting = this.logoSettings.display_logo;
    
    if (displayLogoSetting && this.logoSettings.logo_path) {
      try {
        const logoContent = fs.readFileSync(this.logoSettings.logo_path, 'utf-8');
        console.log(logoContent);
      } catch (error) {
        // 如果logo文件不存在或读取失败，显示默认标题
        console.log('\x1b[35m');
        console.log('---------------------------------');
        console.log('    Universal Tool Framework    ');
        console.log('---------------------------------\x1b[0m');
      }
    }
  }
}

module.exports = {
  ArrowMenuEngine
};