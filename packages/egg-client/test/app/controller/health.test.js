'use strict';

// 注意: egg-mock/bootstrap 在框架包内会因框架路径解析方式产生循环引用，
//       导致 integration test 无法直接在此运行。
//       集成测试需要在业务项目（如 egg-example）中通过 egg 框架加载。
//       框架包内只适合测试纯工具函数（unit test）。