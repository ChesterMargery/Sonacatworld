# Sonacatworld (索纳猫世界)

[English](#english) | [中文](#chinese)

---

<a name="chinese"></a>
## 🌟 项目简介

**Sonacatworld (索纳猫世界)** 是一个基于 **LLM (大语言模型) + WebGPU** 技术栈的多智能体社会模拟系统。通过先进的人工智能技术，在虚拟小镇中创造具有独立人格、自主决策能力的AI居民，构建一个真实感的动态社会生态系统。

### 核心特性

- 🤖 **LLM 驱动的多智能体系统**：每个 AI 居民拥有独立的人格和记忆
- 🎮 **WebGPU 高性能渲染**：利用现代GPU技术实现流畅的视觉体验
- 💰 **完整的经济生态**：包含农业、钓鱼、挖矿等多元化生产系统
- 🎭 **复杂社交互动**：礼堂活动、对话系统、关系记忆网络
- 🧠 **异步决策引擎**：基于状态的智能行为决策系统
- 🌾 **多元化生产系统**：农业、钓鱼、挖矿等真实感模拟

---

## 🏗️ 核心技术栈

- **前端渲染**: WebGPU (无游戏引擎，原生图形API)
- **AI决策**: 大语言模型 (LLM) 多人格分裂系统
- **开发语言**: TypeScript
- **构建工具**: Vite
- **类型系统**: 严格模式 TypeScript

---

## 📐 系统架构概览

```
┌─────────────────────────────────────────────────────┐
│                   用户界面层                         │
│              (WebGPU 渲染 + 交互)                   │
└─────────────────┬───────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────┐
│                  核心系统层                          │
│  ┌──────────┬──────────┬──────────┬──────────┐     │
│  │ 经济系统 │ 人物系统 │ 时间系统 │ 决策引擎 │     │
│  └──────────┴──────────┴──────────┴──────────┘     │
└─────────────────┬───────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────┐
│                 功能模块层                           │
│  ┌──────────┬──────────┬──────────┬──────────┐     │
│  │ 农业系统 │ 钓鱼系统 │ 挖矿系统 │ 社交系统 │     │
│  └──────────┴──────────┴──────────┴──────────┘     │
└─────────────────┬───────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────┐
│               LLM 智能层                             │
│        (多人格异步决策 + 记忆系统)                   │
└─────────────────────────────────────────────────────┘
```

---

## 🎯 功能模块列表

### 1. 经济系统 (Economy System)
- 杂货铺作为唯一交易中心
- 物品买卖：农作物、鱼类、矿物
- 动态价格系统

### 2. 农业系统 (Farming System)
- 4种作物：小麦、大米、萝卜、甜菜
- 完整流程：种子 → 播种 → 生长 → 收获
- 作物属性：生长时间、饥饿恢复值、市场售价

### 3. 钓鱼系统 (Fishing System)
- 5种鱼类，不同稀有度
- 饥饿恢复梯度（5等级）
- 可食用或出售

### 4. 挖矿系统 (Mining System)
- 4种矿物资源
- 矿场资源池机制
- 纯经济价值（可出售）

### 5. 人物系统 (Character System)
- **属性系统**：饥饿值、金钱、年龄
- **行为系统**：睡觉、起床、行走、钓鱼、挖矿、买卖、进食、对话
- **LLM决策**：基于状态的智能行为选择

### 6. 社交系统 (Social System)
- **礼堂活动**：狼人杀、剧本杀、讨论
- **关系记忆**：信任、怀疑、敌对关系网络
- **对话系统**：基于记忆的个性化互动

### 7. LLM 多人格系统 (LLM Multi-Personality System)
- 单一大模型，多角色人格Prompt分裂
- 独立上下文与记忆管理
- 异步调用行为决策

---

## 🚀 快速开始指南

### 前置要求

- Node.js >= 18.0.0
- 支持 WebGPU 的现代浏览器 (Chrome 113+, Edge 113+)
- npm 或 yarn 包管理器

### 安装

```bash
# 克隆仓库
git clone https://github.com/ChesterMargery/Sonacatworld.git
cd Sonacatworld

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 开发命令

```bash
npm run dev      # 启动开发服务器
npm run build    # 构建生产版本
npm run preview  # 预览生产构建
npm run test     # 运行测试
npm run lint     # 代码检查
npm run format   # 代码格式化
```

---

## 📊 开发路线图

### Phase 1: 基础架构 (当前阶段)
- [x] 项目初始化与目录结构
- [x] 核心文档编写
- [ ] TypeScript 类型定义
- [ ] WebGPU 渲染基础

### Phase 2: 核心系统
- [ ] 人物属性系统实现
- [ ] 经济系统基础
- [ ] 时间系统与事件循环

### Phase 3: 功能模块
- [ ] 农业系统实现
- [ ] 钓鱼系统实现
- [ ] 挖矿系统实现

### Phase 4: AI 智能层
- [ ] LLM 集成与多人格系统
- [ ] 决策引擎实现
- [ ] 记忆与关系网络

### Phase 5: 社交互动
- [ ] 对话系统
- [ ] 礼堂活动系统
- [ ] 社交关系可视化

### Phase 6: 优化与发布
- [ ] 性能优化
- [ ] 用户界面完善
- [ ] 文档补充
- [ ] 正式发布

---

## 📖 文档

详细文档位于 `docs/` 目录：

- [完整策划案](docs/design.md) - 系统详细设计
- [技术架构](docs/architecture.md) - 架构设计文档
- [经济系统](docs/systems/economy.md) - 经济系统设计
- [农业系统](docs/systems/farming.md) - 农业系统设计
- [钓鱼系统](docs/systems/fishing.md) - 钓鱼系统设计
- [挖矿系统](docs/systems/mining.md) - 挖矿系统设计
- [人物系统](docs/systems/characters.md) - 人物系统设计
- [社交系统](docs/systems/social.md) - 社交系统设计
- [LLM系统](docs/systems/llm.md) - LLM多人格系统设计
- [API文档](docs/api.md) - API接口文档

---

## 🤝 贡献指南

我们欢迎所有形式的贡献！

### 如何贡献

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 开发规范

- 遵循 TypeScript 严格模式
- 使用 ESLint 和 Prettier 保持代码风格一致
- 为新功能编写测试
- 更新相关文档

### 代码审查流程

所有提交的代码都需要经过代码审查才能合并到主分支。请确保：
- 代码符合项目规范
- 通过所有测试
- 包含必要的文档更新

---

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

---

## 👥 作者

- **ChesterMargery** - *初始开发* - [GitHub](https://github.com/ChesterMargery)

---

## 🙏 致谢

- 感谢所有贡献者的支持
- 灵感来源于《星露谷物语》等生活模拟游戏
- 使用 WebGPU 和 LLM 技术探索游戏开发的新可能

---

<a name="english"></a>
## 🌟 Project Overview

**Sonacatworld** is a multi-agent social simulation system based on **LLM (Large Language Model) + WebGPU** technology stack. Through advanced artificial intelligence technology, it creates AI residents with independent personalities and autonomous decision-making abilities in a virtual town, building a realistic dynamic social ecosystem.

### Key Features

- 🤖 **LLM-Driven Multi-Agent System**: Each AI resident has independent personality and memory
- 🎮 **WebGPU High-Performance Rendering**: Utilizing modern GPU technology for smooth visual experience
- 💰 **Complete Economic Ecosystem**: Including agriculture, fishing, mining and other diversified production systems
- 🎭 **Complex Social Interactions**: Hall activities, dialogue system, relationship memory network
- 🧠 **Asynchronous Decision Engine**: State-based intelligent behavior decision system
- 🌾 **Diversified Production Systems**: Realistic simulation of agriculture, fishing, mining, etc.

---

## 🏗️ Tech Stack

- **Frontend Rendering**: WebGPU (No game engine, native graphics API)
- **AI Decision**: Large Language Model (LLM) multi-personality split system
- **Development Language**: TypeScript
- **Build Tool**: Vite
- **Type System**: Strict mode TypeScript

---

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- Modern browser with WebGPU support (Chrome 113+, Edge 113+)
- npm or yarn package manager

### Installation

```bash
# Clone repository
git clone https://github.com/ChesterMargery/Sonacatworld.git
cd Sonacatworld

# Install dependencies
npm install

# Start development server
npm run dev
```

### Development Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run test     # Run tests
npm run lint     # Lint code
npm run format   # Format code
```

---

## 📖 Documentation

Detailed documentation is located in the `docs/` directory:

- [Complete Design Document](docs/design.md)
- [Technical Architecture](docs/architecture.md)
- [System Designs](docs/systems/)
- [API Documentation](docs/api.md)

---

## 🤝 Contributing

We welcome all forms of contribution!

Please see our contributing guidelines for details on how to submit pull requests, report issues, and contribute to the project.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details

---

## 👥 Authors

- **ChesterMargery** - *Initial Development* - [GitHub](https://github.com/ChesterMargery)