const fs = require('fs');
const { NumMenuEngine } = require('./menuEngine');
const { ArrowMenuEngine } = require('./arrowMenuEngine');

/**
 * 菜单控制器
 * 
 * 管理菜单状态和用户导航操作，协调菜单引擎进行显示
 * 处理菜单间的导航、用户输入响应等操作
 */

class MenuController {
  /**
   * 初始化菜单控制器
   * 
   * @param {object} config - 菜单配置对象，包含菜单结构和显示设置
   * @param {string} configDir - 配置文件目录路径
   */
  constructor(config, configDir = './config') {
    this.config = config;
    this.numMenuEngine = new NumMenuEngine(config, configDir);
    this.arrowMenuEngine = new ArrowMenuEngine(config, configDir);
    // 初始化菜单栈，用于支持无限层级的菜单嵌套
    this.menuStack = ["main"];
  }

  /**
   * 获取当前菜单ID
   * 
   * @returns {string} 当前菜单的ID
   */
  getCurrentMenu() {
    return this.menuStack[this.menuStack.length - 1];
  }

  /**
   * 设置当前菜单
   * 
   * 切换到指定的菜单
   * 
   * @param {string} menuId - 要切换到的菜单ID
   */
  setCurrentMenu(menuId) {
    this.menuStack.push(menuId);
  }

  /**
   * 返回上级菜单
   * 
   * 从菜单栈中弹出当前菜单，返回到上一级菜单
   * 
   * @returns {boolean} 如果成功返回上级菜单则返回true，否则返回false
   */
  goBack() {
    if (this.menuStack.length > 1) {
      this.menuStack.pop();
      return true;
    }
    return false; // 已经是主菜单，无法再返回
  }

  /**
   * 返回主菜单
   * 
   * 将菜单栈重置为只包含主菜单
   */
  goToMainMenu() {
    this.menuStack = ["main"];
  }

  /**
   * 获取菜单项
   * 
   * 根据菜单ID和选择项ID获取对应的菜单项配置
   * 
   * @param {string} menuId - 菜单ID
   * @param {number} choice - 用户选择的菜单项ID
   * @returns {object|null} 菜单项配置对象，未找到则返回null
   */
  getMenuItem(menuId, choice) {
    // 根据输入模式选择适当的引擎
    const inputMethod = this.settingsConfig?.settings?.input_method || 'num_input';
    if (inputMethod === 'arrow_input') {
      return this.arrowMenuEngine.getMenuItem(menuId, choice);
    } else {
      return this.numMenuEngine.getMenuItem(menuId, choice);
    }
  }

  /**
   * 获取父菜单ID
   * 
   * 获取当前菜单的上级菜单ID
   * 
   * @param {string} menuId - 菜单ID
   * @returns {string|null} 父菜单ID，如无父菜单则返回null
   */
  getParentMenu(menuId) {
    // 根据输入模式选择适当的引擎
    const inputMethod = this.settingsConfig?.settings?.input_method || 'num_input';
    if (inputMethod === 'arrow_input') {
      return this.arrowMenuEngine.getParentMenu(menuId);
    } else {
      return this.numMenuEngine.getParentMenu(menuId);
    }
  }

  /**
   * 显示当前菜单（数字输入模式）
   * 
   * 调用菜单引擎显示当前选中的菜单
   */
  displayCurrentMenu() {
    this.numMenuEngine.displayMenu(this.getCurrentMenu());
  }

  /**
   * 显示当前菜单（方向键模式）
   * 
   * @returns {Promise<number>} 用户选择的菜单项ID
   */
  async displayInteractiveCurrentMenu() {
    return await this.arrowMenuEngine.displayInteractiveMenu(this.getCurrentMenu());
  }

  /**
   * 设置设置配置（用于获取输入方法）
   * 
   * @param {object} settingsConfig - 设置配置对象
   */
  setSettingsConfig(settingsConfig) {
    this.settingsConfig = settingsConfig;
  }

  /**
   * 处理菜单导航命令
   * 
   * 处理用户输入的特殊导航命令（如'b'返回上级菜单，'m'返回主菜单，'p'切换工具包）
   * 
   * @param {string} command - 用户输入的导航命令
   * @returns {boolean} 如果是导航命令并成功处理则返回true，否则返回false
   */
  handleNavigationCommand(command) {
    if (command.toLowerCase() === "b") {
      // 返回上级菜单
      if (this.goBack()) {
        return true;
      } else {
        // 如果已经是主菜单，重新显示主菜单
        this.goToMainMenu();
        return true;
      }
    } else if (command.toLowerCase() === "m") {
      // 返回主菜单
      this.goToMainMenu();
      return true;
    } else if (command.toLowerCase() === "p") {
      // 切换工具包，不处理为导航命令，返回false让主控制器处理
      return false;
    }
    return false; // 不是导航命令
  }

  /**
   * 获取菜单栈的深度
   * 
   * @returns {number} 菜单栈的长度，表示嵌套层级
   */
  getMenuDepth() {
    return this.menuStack.length;
  }

  /**
   * 获取完整的菜单路径
   * 
   * @returns {string[]} 菜单路径数组
   */
  getMenuPath() {
    return [...this.menuStack];
  }
}

module.exports = {
  MenuController
};