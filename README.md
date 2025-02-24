# Web德扑游戏

这是一个基于React和TypeScript的单机德州扑克游戏。游戏支持一个人类玩家和七个AI对手进行对战。

## 功能特点

- 8人桌德扑游戏
- 每个玩家初始筹码200BB
- AI对手使用基于GTO的策略
- 支持基本的德扑动作：加注、跟注、弃牌
- 玩家筹码耗尽时自动补充到200BB

## 技术栈

- React.js
- TypeScript
- Chakra UI
- Vite

## 安装和运行

1. 克隆项目：
```bash
git clone [项目地址]
cd poker
```

2. 安装依赖：
```bash
npm install
```

3. 运行开发服务器：
```bash
npm run dev
```

4. 在浏览器中访问：
```
http://localhost:5173
```

## 游戏规则

1. 游戏开始时，每个玩家获得200BB的筹码
2. 玩家可以选择：
   - 弃牌：放弃当前手牌
   - 跟注：跟随当前最大注额
   - 加注：将注额提高到当前注额的2倍

3. 当玩家筹码耗尽时，将自动获得200BB的新筹码继续游戏

## 项目结构

```
src/
├── components/         # 游戏组件
│   ├── Table/         # 牌桌组件
│   ├── Player/        # 玩家组件
│   └── Cards/         # 扑克牌组件
├── utils/             # 工具函数
│   ├── poker/         # 德扑逻辑
│   └── ai/            # AI策略
├── types/             # TypeScript类型定义
└── App.tsx            # 主应用组件
```

## 贡献

欢迎提交Issue和Pull Request来改进这个项目。

## 许可证

MIT
