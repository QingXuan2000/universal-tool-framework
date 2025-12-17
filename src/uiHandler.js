const readline = require('readline');
const fs = require('fs');
const path = require('path');

/**
 * 用户界面处理器
 * 
 * 处理用户输入和界面交互，包括架构选择器和等待输入功能
 * 基于配置文件提供本地化的用户界面
 */

class UIHandler {
  /**
   * 等待用户按Enter键
   * 
   * 显示提示信息并等待用户按Enter键继续
   * 
   * @returns {Promise<void>} 当用户按Enter键后的Promise
   */
  static waitForEnter() {
    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.question('\x1b[32m按Enter键继续...\x1b[0m', () => {
        rl.close();
        resolve();
      });
    });
  }

  /**
   * 等待用户按Enter键返回菜单
   * 
   * 显示返回菜单的提示信息并等待用户按Enter键
   * 
   * @returns {Promise<void>} 当用户按Enter键后的Promise
   */
  static waitForEnterReturnMenu() {
    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      rl.question('\x1b[32m按Enter键返回菜单...\x1b[0m', () => {
        rl.close();
        resolve();
      });
    });
  }

  /**
   * 架构选择器
   * 
   * 显示架构选择界面，允许用户选择要使用的系统架构
   * 
   * @param {string} configDir - 配置文件目录路径
   * @param {object} settingsConfig - 应用设置配置
   * @returns {Promise<string>} 用户选择的架构字符串
   */
  static async architecturePicker(configDir = './config', settingsConfig = null) {
    // 获取输入方法设置
    const inputMethod = settingsConfig?.settings?.input_method || 'num_input';
    
    if (inputMethod === 'arrow_input') {
      // 使用方向键选择
      return await this.architecturePickerWithArrows(configDir);
    } else {
      // 使用数字输入
      return await this.architecturePickerWithNumbers(configDir, settingsConfig);
    }
  }

  /**
   * 使用方向键的架构选择器
   * 
   * @param {string} configDir - 配置文件目录路径
   * @returns {Promise<string>} 用户选择的架构字符串
   */
  static async architecturePickerWithArrows(configDir = './config') {
    // 从 config/arch_picker.json 文件读取界面配置
    const archPickerConfigPath = path.join(configDir, 'arch_picker.json');

    let config;
    try {
      const configContent = fs.readFileSync(archPickerConfigPath, 'utf8');
      config = JSON.parse(configContent);
    } catch (error) {
      console.error('\x1b[31m配置文件不存在，请检查软件配置！\x1b[0m');
      throw error;
    }

    // 清屏
    process.stdout.write('\u001b[2J\u001b[0;0H');

    // 将配置选项转换为菜单项格式
    const menuItems = config.options.map(option => ({
      id: option.id,
      name: option.display,
      value: option.value
    }));

    // 使用方向键选择菜单项，传递配置目录
    const selectedId = await UIHandler.selectWithArrowKeys(menuItems, config.title, configDir);
    
    // 根据选中的ID找到对应的值
    if (selectedId && selectedId !== 'q' && selectedId !== 'm' && selectedId !== 't') {
      const selectedOption = config.options.find(option => option.id === selectedId);
      if (selectedOption) {
        return selectedOption.value;
      }
    } else if (selectedId === 'q') {
      // 用户按左箭头返回上级菜单
      throw new Error('BACK_TO_PARENT_MENU');
    } else if (selectedId === 'm') {
      // 用户按右箭头返回主菜单
      throw new Error('BACK_TO_MAIN_MENU');
    } else if (selectedId === 'p') {
      // 用户按p键切换工具包 - 在架构选择器中不处理
      throw new Error('BACK_TO_PARENT_MENU');
    }
    
    // 如果没有选择，重新显示架构选择器
    return await UIHandler.architecturePickerWithArrows(configDir);
  }

    /**

     * 显示带方向键选择的菜单

     * 

     * @param {Array} menuItems - 菜单项数组

     * @param {string} title - 菜单标题

     * @returns {Promise<number>} 用户选择的菜单项ID

     */

    static async selectWithArrowKeys(menuItems, title, configDir = './config') {

      return new Promise((resolve) => {

        let selectedIndex = 0;

        

                    // 从配置文件读取箭头指示符

        

                    let arrowIndicator = undefined;

        

                    try {

        

                      const settingsConfigPath = path.join(configDir, 'settings.json');

        

                      const settingsConfigContent = fs.readFileSync(settingsConfigPath, 'utf8');

        

                      const settingsConfig = JSON.parse(settingsConfigContent);

        

                      arrowIndicator = settingsConfig.settings?.arrow_indicator;

        

                    } catch (error) {

        

                      // 如果配置文件不存在或解析失败，使用 undefined

        

                      arrowIndicator = undefined;

        

                    }

        

        const rl = readline.createInterface({

          input: process.stdin,

          output: process.stdout,

          terminal: true

        });

  

        // 检查是否支持 raw mode

        try {

          process.stdin.setRawMode(true);

        } catch (err) {

          // 如果不支持 raw mode，使用数字输入方式

          rl.question('请输入选项编号: ', (answer) => {

            rl.close();

            const choice = parseInt(answer);

            if (isNaN(choice)) {

              if (answer.toLowerCase() === 't') {

                resolve('t');

              } else {

                resolve(null);

              }

            } else {

              resolve(choice);

            }

          });

          return;

        }

  

        // 设置输入为原始模式以捕获箭头键

        process.stdin.setRawMode(true);

        process.stdin.resume();

  

        // 显示菜单

        const displayMenu = () => {

          // 清屏

          process.stdout.write('\u001b[2J\u001b[0;0H');

          

                  // 显示logo

          

                  try {

          

                    const logoPath = path.join(configDir, 'logo');

          

                    const logoContent = fs.readFileSync(logoPath, 'utf-8');

          

                    console.log(logoContent); // 直接显示 logo，不添加颜色

          

                  } catch (error) {

          

                    // 如果logo文件不存在，显示默认标题

          

                    console.log('\x1b[35m');

          

                    console.log('---------------------------------');

          

                    console.log('    Universal Tool Framework    ');

          

                    console.log('---------------------------------\x1b[0m');

          

                  }

          

          // 显示菜单标题

          console.log(`\x1b[36m${title}\x1b[0m`);

          

                              // 显示菜单项

          

                              menuItems.forEach((item, index) => {

          

                                                        if (index === selectedIndex) {

          

                                                          // 使用反色高亮选中项

          

                                                          if (arrowIndicator) {

          

                                                            console.log(`\x1b[7m${arrowIndicator}${item.name}\x1b[0m`); // 反色显示，带箭头

          

                                                          } else {

          

                                                            console.log(`\x1b[7m  ${item.name}\x1b[0m`); // 反色显示，添加2个空格前缀

          

                                                          }

          

                                                        } else {

          

                                                          // 非选中项：如果arrow_indicator为空字符串，也添加2个空格以与选中项对齐

          

                                                          if (arrowIndicator) {

          

                                                            console.log(`  ${item.name}`); // 添加空格以与箭头对齐

          

                                                          } else {

          

                                                            console.log(`  ${item.name}`); // 添加2个空格以与选中项对齐

          

                                                          }

          

                                                        }

          

                              });

        };

  

        displayMenu();

  

        const onKeyPress = (chunk) => {

          const input = chunk.toString();

          

          // 检查方向键

          if (input === '\u001b[A') { // 上箭头

            selectedIndex = (selectedIndex - 1 + menuItems.length) % menuItems.length;

            displayMenu();

          } else if (input === '\u001b[B') { // 下箭头

            selectedIndex = (selectedIndex + 1) % menuItems.length;

            displayMenu();

                          } else if (input === '\u001b[D') { // 左箭头 返回上级菜单

                              // 恢复标准模式

                              if (process.stdin.setRawMode) {

                                process.stdin.setRawMode(false);

                              }

                              rl.close();

                              process.stdin.removeListener('data', onKeyPress);

                              // 返回到上一级菜单，使用'q'表示返回上级

                              resolve('q');

                            } else if (input === '\u001b[C') { // 右箭头 返回主菜单

                              // 恢复标准模式

                              if (process.stdin.setRawMode) {

                                process.stdin.setRawMode(false);

                              }

                              rl.close();

                              process.stdin.removeListener('data', onKeyPress);

                              // 返回主菜单，使用'm'表示返回主菜单

                              resolve('m');

          } else if (input.toLowerCase() === 'p') { // 'p' 键切换工具包

            // 恢复标准模式

            if (process.stdin.setRawMode) {

              process.stdin.setRawMode(false);

            }

            rl.close();

            process.stdin.removeListener('data', onKeyPress);

            // 切换工具包，使用'p'表示切换工具包

            resolve('p');

          } else if (input === '\r' || input === '\n') { // 回车

            // 恢复标准模式

            if (process.stdin.setRawMode) {

              process.stdin.setRawMode(false);

            }

            rl.close();

            process.stdin.removeListener('data', onKeyPress);

            resolve(menuItems[selectedIndex].id);

          }

        };

  

        process.stdin.on('data', onKeyPress);

      });

    }
}

module.exports = UIHandler;