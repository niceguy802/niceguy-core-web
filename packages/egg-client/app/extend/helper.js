// 视图渲染、接口返回、业务常用格式化等函数
const dayjs = require('dayjs');

module.exports = {
  formatTime(time = new Date()) {
    return dayjs(time).format('YYYY-MM-DD HH:mm:ss');
  },
  formDateExp(start, end = new Date()) {
    if (!start || !end) return false;
    return dayjs(end).isAfter(dayjs(start));
  },
  timeUtil() {
    return {
      now: () => Date.now(),
      addMs: (ms) => Date.now() + ms,
      addSec: (s) => Date.now() + s * 1000,
      addMin: (m) => Date.now() + m * 60 * 1000,
      addHour: (h) => Date.now() + h * 3600 * 1000,
      addDay: (d) => Date.now() + d * 86400 * 1000,
    };
  },
  snakeToCamel(str) { return str.replace(/_(\w)/g, (_, letter) => letter.toUpperCase()); },
  camelToSnake(str) { return str.replace(/[A-Z]/g, (match) => '_' + match.toLowerCase()); },
};
