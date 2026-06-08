const dayjs = require("dayjs");

module.exports = {
  /**
   * 格式化时间为 YYYY-MM-DD HH:mm:ss
   * @param {Date|string|number} [time=new Date()]
   * @returns {string}
   */
  formatTime(time = new Date()) {
    return dayjs(time).format("YYYY-MM-DD HH:mm:ss");
  },

  /**
   * 判断结束时间是否大于开始时间（true=未过期）
   * @param {Date|string} start
   * @param {Date|string} [end=new Date()]
   * @returns {boolean}
   */
  formDateExp(start, end = new Date()) {
    if (!start || !end) return false;
    return dayjs(end).isAfter(dayjs(start));
  },

  /**
   * 时间工具函数
   * @returns {{ now: function, addMs: function, addSec: function, addMin: function, addHour: function, addDay: function }}
   */
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

  /**
   * 下划线命名转驼峰命名
   * @param {string} str
   * @returns {string}
   * @example snakeToCamel("user_name") => "userName"
   */
  snakeToCamel(str) {
    return str.replace(/_(\w)/g, (_, letter) => letter.toUpperCase());
  },

  /**
   * 驼峰命名转下划线命名
   * @param {string} str
   * @returns {string}
   * @example camelToSnake("userName") => "user_name"
   */
  camelToSnake(str) {
    return str.replace(/[A-Z]/g, (match) => "_" + match.toLowerCase());
  },
};
