// WebSocket 初始化
const WebSocketServer = require('ws');

module.exports = (app) => {
  const config = app.config.websocket;
  if (!config || !config.enable) return;
  const wss = new WebSocketServer.Server({ server: app.server, path: '/ws' });
  wss.on('connection', (ws) => { console.log('WebSocket connected'); });
  app.websocket = wss;
};
