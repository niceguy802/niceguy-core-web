// 初始化websocket
const WebSocketServer = require("ws");
module.exports = (app) => {
  const config = app.config.websocket;
  if (!config.enable) return;
  // 创建WebSocket服务器，复用app的http服务器
  // 前端调用 const ws = new WebSocket('ws://localhost:7001/ws');
  const wss = new WebSocketServer.Server({
    server: app.server, // 复用app的http服务器，或作为独立服务配置端口，前端用统一后端端口使用nginx根据/ws路径做地址转发
    path: "/ws",
  });

  wss.on("connection", (ws) => {
    console.log("WebSocket connected");
  });
  // 挂载在app上，供全局使用，如 app.websocket.broadcast(...);app.websocket.on('connection', ws => {...});
  app.websocket = wss;
};
