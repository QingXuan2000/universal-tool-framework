#!/usr/bin/env node
const ApplicationController = require("./src/applicationController");

/**
 * Universal Tool Framework - 通用工具框架
 * 
 * 程序入口点
 * 
 * 这个项目为各类系统诊断和测试工具提供了一个统一的命令行界面。
 * 用户可以通过菜单选择运行不同的工具，比如CPU、内存、显卡等测试工具。
 * 
 * 项目特点：
 * - 配置驱动：所有菜单结构和工具路径都通过配置文件定义
 * - 多架构支持：能自动检测系统架构并选择合适的工具版本
 * - 菜单导航：支持多级菜单，用数字选择功能
 * - 跨平台：基于Node.js，可以在不同操作系统上运行
 */

// 当直接运行此文件时启动应用程序
if (require.main === module) {
  const app = new ApplicationController();
  app.run().catch(console.error);
}

// 导出主控制器类，供其他模块使用
module.exports = ApplicationController;
