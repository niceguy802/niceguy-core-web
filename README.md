# niceguy-core-web
前端框架封装学习

## 版本发布命令说明
### 构建
npm run build

### 测试
npm test

### 只升版本号（不发布）
npm run version:patch    # 0.1.0 → 0.1.1
npm run version:minor    # 0.1.0 → 0.2.0
npm run version:major    # 0.1.0 → 1.0.0

### 🚀 一条龙：测试 → 构建 → 升版本 → 打 tag → 推 git → 发布 npm
npm run release:patch    # 小改
npm run release:minor    # 加功能
npm run release:major    # 不兼容改