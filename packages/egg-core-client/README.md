# @sisin/egg-core-client

Egg.js core framework — 封装数据层、认证、日志、Redis 等基础设施。

## 安装

```bash
npm install @sisin/egg-core-client --save
```

## 使用

在应用的 `package.json` 中配置 framework：

```json
{
  "name": "my-app",
  "egg": {
    "framework": "@sisin/egg-core-client"
  }
}
```

## 发布

```bash
# 补丁版本
npm run publish:patch

# 次要版本
npm run publish:minor

# 主版本
npm run publish:major
```

## 测试

```bash
npm install
npm test
```
