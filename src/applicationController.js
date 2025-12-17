const readline = require("readline");
const os = require("os");
const path = require("path");
const fs = require("fs");
const ConfigHandler = require("./configHandler");
const { MenuController } = require("./menuController");
const { ToolExecutor } = require("./toolExecutor");
const { getSystemArchitecture } = require("./systemUtils");
const UIHandler = require("./uiHandler");

/**
 * 应用程序控制器
 * 
 * 程序的核心控制器，协调各个模块工作，管理应用主循环
 */

class ApplicationController {
  /**
   * 初始化控制器
   */
  constructor() {
    this.configHandler = null;
    this.config = null;
    this.settingsConfig = null;
    this.menuController = null;
    this.toolExecutor = new ToolExecutor();
    this.configDir = null;
  }

  /**
   * 处理用户选择的菜单项
   * 
   * @param {number} choice - 用户输入的菜单编号
   */
  async handleUserChoice(choice) {
    const menuItem = this.menuController.getMenuItem(this.menuController.getCurrentMenu(), choice);

    if (!menuItem) {
      console.log("\x1b[31m无效的选择！\x1b[0m");
      await UIHandler.waitForEnter();
      return;
    }

    switch (menuItem.type) {
      case "submenu":
        // 进入子菜单
        this.menuController.setCurrentMenu(menuItem.submenu);
        return null;
      case "executable":
        // 运行工具
        let selectedArch = getSystemArchitecture(); // 默认使用当前系统架构

        if (
          this.settingsConfig.settings &&
          this.settingsConfig.settings.arch_picker
        ) {
          // 如果启用了架构选择器，让用户选择
          try {
            const userChoice = await UIHandler.architecturePicker(this.configDir, this.settingsConfig);
            if (userChoice) {
              selectedArch = userChoice;
            }
          } catch (error) {
            if (error.message === 'BACK_TO_PARENT_MENU') {
              // 在架构选择器中，'b'命令应该返回到之前所在的菜单（即工具所在的子菜单）
              // 由于架构选择器是在工具选择后立即执行的，这里应该只是返回到当前菜单（不改变菜单状态）
              // 实际上，我们不需要改变菜单状态，只是不执行工具而已
              return null;
            } else if (error.message === 'BACK_TO_MAIN_MENU') {
              // 在架构选择器中，'m'命令应该返回到主菜单
              this.menuController.goToMainMenu();
              return null;
            } else {
              // 重新抛出其他错误
              throw error;
            }
          }
        }

        await this.toolExecutor.executeTool(menuItem.path, selectedArch, this.toolPackageDir);
        return null;
      case "back":
        // 返回上级菜单
        this.menuController.goBack();
        return null;
      case "main":
        // 返回主菜单
        this.menuController.goToMainMenu();
        return null;
      default:
        console.log("\x1b[31m未知的菜单项类型！\x1b[0m");
        await UIHandler.waitForEnter();
        return null;
    }
  }

  /**
   * 显示当前菜单并处理用户输入
   * 
   * 主循环：持续显示菜单并等待用户输入
   */
  async showCurrentMenu() {
    // 显示欢迎信息
    const currentPackageInfo = await this.getToolPackageInfo(this.toolPackageDir);
    console.log("\x1b[33m欢迎使用 Universal Tool Framework v2.0!\x1b[0m");
    console.log(`\x1b[36m当前工具包: ${currentPackageInfo.name} (版本: ${currentPackageInfo.version})\x1b[0m`);
    console.log("\x1b[32m提示: 按 'p' 键切换工具包\x1b[0m");
    
    while (true) {
      try {
        let userChoice;
        
        // 根据配置决定使用哪种输入方式
        const inputMethod = this.settingsConfig.settings?.input_method || 'num_input';
        
        if (inputMethod === 'num_input') {
          // 使用传统的数字输入方式
          this.menuController.displayCurrentMenu();

          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
          });

          const answer = await new Promise((resolve) => {
            // 使用配置的箭头指示符作为输入提示符
            const arrowIndicator = this.settingsConfig.settings?.arrow_indicator;
            if (arrowIndicator) {
              rl.question(`\n${arrowIndicator} `, (input) => {
                rl.close();
                resolve(input ? input.trim() : "");
              });
            } else {
              rl.question("", (input) => {
                rl.close();
                resolve(input ? input.trim() : "");
              });
            }
          });

          // 检查特殊命令
          if (this.menuController.handleNavigationCommand(answer)) {
            continue; // 如果是导航命令，继续循环
          }
          
          // 检查工具包切换命令
          if (answer.toLowerCase() === "p") {
            const selectedPath = await this.showToolPackageSelector();
            if (selectedPath) {
              await this.switchToToolPackage(selectedPath);
              // 添加到保存的工具包列表
              await this.addToolPackage(selectedPath);
            }
            continue;
          }

          if (!answer || answer === "") {
            console.log("\x1b[31m输入不能为空！\x1b[0m");
            await UIHandler.waitForEnter();
            continue;
          }

          userChoice = parseInt(answer);

          if (isNaN(userChoice)) {
            console.log("\x1b[31m输入无效，请输入一个数字！\x1b[0m");
            await UIHandler.waitForEnter();
            continue;
          }
        } else {
          // 使用交互式菜单（支持方向键）
          userChoice = await this.menuController.displayInteractiveCurrentMenu();

          // 如果用户按q返回上级菜单
          if (userChoice === 'q') {
            this.menuController.goBack();
            continue;
          }
          
          // 如果用户按m返回主菜单
          if (userChoice === 'm') {
            this.menuController.goToMainMenu();
            continue;
          }
          
          // 如果用户按p键切换工具包
          if (userChoice === 'p') {
            const selectedPath = await this.showToolPackageSelector();
            if (selectedPath) {
              await this.switchToToolPackage(selectedPath);
              // 添加到保存的工具包列表
              await this.addToolPackage(selectedPath);
            }
            continue;
          }

          if (!userChoice) {
            console.log("\x1b[31m输入不能为空！\x1b[0m");
            await UIHandler.waitForEnter();
            continue;
          }
        }

        await this.handleUserChoice(userChoice);
      } catch (error) {
        console.log("\x1b[31m发生错误: " + error.message + "\x1b[0m");
        await UIHandler.waitForEnter();
      }
    }
  }

  /**
   * 获取用户配置路径
   * 
   * 优先使用已保存的路径，如果不存在则提示用户输入
   * 
   * @returns {Promise<string>} 配置目录路径
   */
  async getUserConfigPath() {
    // 检查是否已保存过配置路径
    const userDataPath = path.join(os.homedir(), '.ut-framework');
    const configPathFile = path.join(userDataPath, 'config_path.json');
    
    if (fs.existsSync(configPathFile)) {
      try {
        const savedConfig = JSON.parse(fs.readFileSync(configPathFile, 'utf8'));
        const savedPath = savedConfig.path;
        
        // 检查保存的路径是否仍然有效
        if (fs.existsSync(savedPath)) {
          return savedPath;
        }
      } catch (error) {
        console.log('\x1b[33m配置路径文件解析失败，将重新设置...\x1b[0m');
      }
    }
    
    // 首次运行或路径无效，提示用户输入
    return await this.promptForConfigPath(configPathFile);
  }
  
  /**
   * 获取所有保存的工具包列表
   * 
   * @returns {Promise<Array>} 已保存的工具包列表
   */
  async getSavedToolPackages() {
    const userDataPath = path.join(os.homedir(), '.ut-framework');
    const configPathFile = path.join(userDataPath, 'config_path.json');
    const packagesPathFile = path.join(userDataPath, 'tool_packages.json');
    
    if (fs.existsSync(packagesPathFile)) {
      try {
        const savedPackages = JSON.parse(fs.readFileSync(packagesPathFile, 'utf8'));
        return savedPackages.packages || [];
      } catch (error) {
        console.log('\x1b[33m工具包列表文件解析失败\x1b[0m');
      }
    }
    
    return [];
  }
  
  /**
   * 获取工具包信息（名称和版本）
   * 
   * @param {string} packagePath - 工具包路径
   * @returns {Promise<Object>} 包含工具包名称和版本的对象
   */
  async getToolPackageInfo(packagePath) {
    let configDir;
    if (fs.existsSync(path.join(packagePath, "menu.json"))) {
      configDir = packagePath;
    } else {
      configDir = path.join(packagePath, "config");
    }
    
    try {
      const settingsConfigPath = path.join(configDir, "settings.json");
      if (fs.existsSync(settingsConfigPath)) {
        const settingsConfigContent = fs.readFileSync(settingsConfigPath, "utf8");
        const settingsConfig = JSON.parse(settingsConfigContent);
        
        const name = settingsConfig.app?.name || path.basename(packagePath);
        const version = settingsConfig.app?.version || "未知版本";
        
        return { name, version };
      } else {
        // 如果没有 settings.json，则使用路径名作为名称
        return { name: path.basename(packagePath), version: "未知版本" };
      }
    } catch (error) {
      console.log(`\x1b[33m无法读取工具包信息: ${error.message}\x1b[0m`);
      return { name: path.basename(packagePath), version: "未知版本" };
    }
  }
  
  /**
   * 保存工具包列表
   * 
   * @param {Array} packages - 要保存的工具包列表
   * @returns {Promise<void>}
   */
  async saveToolPackages(packages) {
    const userDataPath = path.join(os.homedir(), '.ut-framework');
    const packagesPathFile = path.join(userDataPath, 'tool_packages.json');
    
    try {
      if (!fs.existsSync(userDataPath)) {
        fs.mkdirSync(userDataPath, { recursive: true });
      }
      
      fs.writeFileSync(packagesPathFile, JSON.stringify({ packages }, null, 2));
    } catch (error) {
      console.log(`\x1b[31m保存工具包列表失败 - ${error.message}\x1b[0m`);
    }
  }
  
  /**
   * 获取工具包的根路径（规范化路径）
   * 
   * @param {string} packagePath - 工具包路径
   * @returns {string} 工具包根路径
   */
  getToolPackageRootPath(packagePath) {
    // 如果路径下有 menu.json，说明这是配置路径，返回父目录作为根路径
    if (fs.existsSync(path.join(packagePath, "menu.json"))) {
      return path.dirname(packagePath);
    } else {
      // 如果路径下有 config 目录，并且 config 目录下有 menu.json，返回当前路径作为根路径
      const configPath = path.join(packagePath, "config");
      if (fs.existsSync(path.join(configPath, "menu.json"))) {
        return packagePath;
      }
      // 否则假设当前路径就是根路径
      return packagePath;
    }
  }
  
  /**
   * 添加工具包到保存列表
   * 
   * @param {string} packagePath - 要添加的工具包路径
   * @param {string} packageName - 要添加的工具包名称
   * @returns {Promise<void>}
   */
  async addToolPackage(packagePath, packageName = null) {
    const packages = await this.getSavedToolPackages();
    
    // 生成名称，如果没提供则使用路径的最后部分
    const name = packageName || path.basename(packagePath);
    
    // 获取工具包根路径并规范化
    const rootPath = this.getToolPackageRootPath(packagePath);
    const normalizedRootPath = path.resolve(rootPath);
    
    // 检查是否已存在相同的根路径（规范化后），如果存在则更新名称
    const existingIndex = packages.findIndex(p => {
      const existingRootPath = this.getToolPackageRootPath(p.path);
      return path.resolve(existingRootPath) === normalizedRootPath;
    });
    
    if (existingIndex !== -1) {
      packages[existingIndex].name = name;
    } else {
      // 添加新的工具包
      packages.push({ path: packagePath, name, added: new Date().toISOString() });
    }
    
    await this.saveToolPackages(packages);
  }
  
  /**
   * 切换到指定的工具包
   * 
   * @param {string} packagePath - 要切换到的工具包路径
   * @returns {Promise<boolean>} 切换是否成功
   */
  async switchToToolPackage(packagePath) {
    // 验证路径是否有效
    let configDir;
    if (fs.existsSync(path.join(packagePath, "menu.json"))) {
      configDir = packagePath;
    } else {
      configDir = path.join(packagePath, "config");
    }
    
    // 验证路径
    if (!fs.existsSync(configDir) || !fs.statSync(configDir).isDirectory()) {
      console.log("\x1b[31m错误：指定路径下不存在 config 目录！\x1b[0m");
      return false;
    }
    
    // 验证 menu.json 是否存在
    const menuPath = path.join(configDir, "menu.json");
    if (!fs.existsSync(menuPath)) {
      console.log("\x1b[31m错误：config 目录中不存在 menu.json 文件！\x1b[0m");
      return false;
    }
    
    // 保存当前配置路径
    const userDataPath = path.join(os.homedir(), '.ut-framework');
    const configPathFile = path.join(userDataPath, 'config_path.json');
    
    try {
      const userDataDir = path.dirname(configPathFile);
      if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true });
      }
      fs.writeFileSync(configPathFile, JSON.stringify({ path: configDir }, null, 2));
    } catch (error) {
      console.log(`\x1b[31m警告：无法保存配置路径 - ${error.message}\x1b[0m`);
      return false;
    }
    
    // 重新初始化配置
    this.configDir = configDir;
    this.toolPackageDir = path.dirname(configDir);
    
    this.configHandler = new ConfigHandler(path.join(configDir, "menu.json"));
    this.config = this.configHandler.getConfig();

    // 加载设置配置
    try {
      const settingsConfigPath = path.join(configDir, "settings.json");
      const settingsConfigContent = fs.readFileSync(settingsConfigPath, "utf8");
      this.settingsConfig = JSON.parse(settingsConfigContent);
    } catch (error) {
      // 配置文件不存在或解析失败时使用默认值
      this.settingsConfig = {
        settings: {
          display_clear: true,
          arch_picker: true,
        },
      };
    }

    this.menuController = new MenuController(this.config, this.configDir);
    return true;
  }
  
  /**
   * 显示工具包选择菜单
   * 
   * @returns {Promise<string>} 用户选择的工具包路径
   */
  async showToolPackageSelector() {
    const packages = await this.getSavedToolPackages();
    const inputMethod = this.settingsConfig.settings?.input_method || 'num_input';
    
    if (inputMethod === 'arrow_input') {
      // 使用方向键选择工具包
      return await this.showToolPackageSelectorWithArrows(packages);
    } else {
      // 使用数字输入方式
      return await this.showToolPackageSelectorWithNumbers(packages);
    }
  }
  
  /**
   * 使用数字输入方式显示工具包选择菜单
   * 
   * @param {Array} packages - 工具包列表
   * @returns {Promise<string>} 用户选择的工具包路径
   */
  async showToolPackageSelectorWithNumbers(packages) {
    if (packages.length === 0) {
      console.log("\x1b[33m没有保存的工具包\x1b[0m");
      return null;
    }
    console.log("\n\x1b[36mUniversal Tool Framework - 工具包选择\x1b[0m\n");
    
    // 显示每个工具包的名称和版本
    for (let i = 0; i < packages.length; i++) {
      const pkg = packages[i];
      const pkgInfo = await this.getToolPackageInfo(pkg.path);
      console.log(`| ${i + 1} |→ ${pkgInfo.name} (版本: ${pkgInfo.version}) [${pkg.path}]`);
    }
    
    console.log(`| ${packages.length + 1} |→ 添加工具包`);
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise((resolve) => {
      rl.question("\n>>> ", (input) => {
        rl.close();
        resolve(input ? input.trim() : "");
      });
    });
    
    const choice = parseInt(answer);
    
    if (choice === packages.length + 1) {
      // 添加新工具包
      return await this.promptForConfigPath(
        path.join(path.join(os.homedir(), '.ut-framework'), 'config_path.json')
      );
    } else if (choice > 0 && choice <= packages.length) {
      return packages[choice - 1].path;
    } else {
      console.log("\x1b[31m无效的选择！\x1b[0m");
      await UIHandler.waitForEnter();
      return null;
    }
  }
  
  /**
   * 使用方向键显示工具包选择菜单
   * 
   * @param {Array} packages - 工具包列表
   * @returns {Promise<string>} 用户选择的工具包路径
   */
  async showToolPackageSelectorWithArrows(packages) {
    if (packages.length === 0) {
      console.log("\x1b[33m没有保存的工具包\x1b[0m");
      // 直接添加新工具包
      return await this.promptForConfigPath(
        path.join(path.join(os.homedir(), '.ut-framework'), 'config_path.json')
      );
    }
    
    // 创建菜单项用于方向键选择
    const menuItems = [];
    
    // 添加已保存的工具包
    for (let i = 0; i < packages.length; i++) {
      const pkg = packages[i];
      const pkgInfo = await this.getToolPackageInfo(pkg.path);
      menuItems.push({
        id: i + 1,
        name: `${pkgInfo.name} (版本: ${pkgInfo.version}) [${pkg.path}]`,
        path: pkg.path
      });
    }
    
    // 添加"添加新工具包"选项
    menuItems.push({
      id: packages.length + 1,
      name: "添加新工具包",
      action: 'add'
    });
    
    // 使用 UIHandler 的方向键选择功能
    const UIHandler = require('./uiHandler');
    const selectedId = await UIHandler.selectWithArrowKeys(menuItems, "\nUniversal Tool Framework - 工具包选择\n", this.configDir);
    
    if (selectedId === 'q' || selectedId === 'm') {
      return null; // 返回上级或主菜单时取消
    }
    
    const selectedItem = menuItems.find(item => item.id === selectedId);
    if (selectedItem) {
      if (selectedItem.action === 'add') {
        // 添加新工具包
        return await this.promptForConfigPath(
          path.join(path.join(os.homedir(), '.ut-framework'), 'config_path.json')
        );
      } else if (selectedItem.path) {
        return selectedItem.path; // 返回工具包路径
      }
    }
    
    return null;
  }
  
  /**
   * 提示用户输入配置路径
   * 
   * 询问用户工具包路径并进行验证
   * 
   * @param {string} configPathFile - 保存配置路径的文件
   * @returns {Promise<string>} 用户输入的配置目录路径
   */
  async promptForConfigPath(configPathFile) {
    console.log("\x1b[36m首次启动：请指定工具包路径\x1b[0m");
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const configPath = await new Promise((resolve) => {
      rl.question("请输入工具包路径: ", (input) => {
        rl.close();
        const pathInput = input.trim();
        if (!pathInput) {
          console.log("\x1b[31m路径不能为空！\x1b[0m");
          resolve(this.promptForConfigPath(configPathFile)); // 递归调用
          return;
        }
        
        const fullPath = path.resolve(pathInput);
        
        // 检查用户输入的是不是直接配置目录
        let configDir;
        if (fs.existsSync(path.join(fullPath, "menu.json"))) {
          configDir = fullPath;
        } else {
          // 用户输入的是工具包根目录，添加 config 子目录
          configDir = path.join(fullPath, "config");
        }
        
        // 验证路径
        if (!fs.existsSync(configDir) || !fs.statSync(configDir).isDirectory()) {
          console.log("\x1b[31m错误：指定路径下不存在 config 目录！\x1b[0m");
          resolve(this.promptForConfigPath(configPathFile)); // 递归调用
          return;
        }
        
        // 验证 menu.json 是否存在
        const menuPath = path.join(configDir, "menu.json");
        if (!fs.existsSync(menuPath)) {
          console.log("\x1b[31m错误：config 目录中不存在 menu.json 文件！\x1b[0m");
          resolve(this.promptForConfigPath(configPathFile)); // 递归调用
          return;
        }
        
        // 保存配置路径
        try {
          const userDataDir = path.dirname(configPathFile);
          if (!fs.existsSync(userDataDir)) {
            fs.mkdirSync(userDataDir, { recursive: true });
          }
          fs.writeFileSync(configPathFile, JSON.stringify({ path: configDir }, null, 2));
        } catch (error) {
          console.log(`\x1b[31m警告：无法保存配置路径 - ${error.message}\x1b[0m`);
        }
        
        console.log("\x1b[32m配置路径已保存！\x1b[0m");
        
        resolve(configDir);
      });
    });
    
    // 将工具包添加到列表（在 Promise 外部调用，使用 configPath）
    const packageName = path.basename(path.dirname(configPath)); // 使用工具包根目录名称作为包名
    await this.addToolPackage(path.dirname(configPath), packageName);
    
    return configPath;
  }

  /**
   * 初始化应用程序配置
   * 
   * 加载配置文件和相关组件
   */
  async initializeConfig() {
    const configDir = await this.getUserConfigPath();
    this.configDir = configDir;
    
    // 获取工具包根目录
    this.toolPackageDir = path.dirname(configDir);
    
    this.configHandler = new ConfigHandler(path.join(configDir, "menu.json"));
    this.config = this.configHandler.getConfig();

    // 加载设置配置
    try {
      const settingsConfigPath = path.join(configDir, "settings.json");
      const settingsConfigContent = fs.readFileSync(settingsConfigPath, "utf8");
      this.settingsConfig = JSON.parse(settingsConfigContent);
    } catch (error) {
      // 配置文件不存在或解析失败时使用默认值
      this.settingsConfig = {
        settings: {
          display_clear: true,
          arch_picker: true,
        },
      };
    }

    this.menuController = new MenuController(this.config, this.configDir);
    this.menuController.setSettingsConfig(this.settingsConfig);
  }

  /**
   * 启动应用程序
   * 
   * 初始化配置并开始主循环
   */
  async run() {
    // 初始化配置
    await this.initializeConfig();
    
    await this.showCurrentMenu();
  }
}

module.exports = ApplicationController;