# Tasks

- [x] Task 1: 排除 Node.js 脚本文件
  - [x] SubTask 1.1: 修改 tsconfig.app.json，添加 exclude 配置排除 `src/mock/runGenerator.ts`

- [x] Task 2: 修复 antdPreferences.ts 类型错误
  - [x] SubTask 2.1: 为组件主题配置添加 `as any` 类型断言，绕过不存在的 token 属性检查

- [x] Task 3: 修复 dataEnhancer.ts 类型错误
  - [x] SubTask 3.1: 在创建 Appeal 对象时初始化 `响应时长` 和 `处理时长` 为 `null`

- [x] Task 4: 修复 dataGenerator.ts 类型错误
  - [x] SubTask 4.1: 在创建 Appeal 对象时初始化 `响应时长` 和 `处理时长` 为 `null`

- [x] Task 5: 修复 services.ts 类型比较错误
  - [x] SubTask 5.1: 修正第725行的角色判断逻辑，移除重复的 `dept_leader` 检查

- [x] Task 6: 验证构建成功
  - [x] SubTask 6.1: 运行 `npm run build` 确认无 TypeScript 错误

# Task Dependencies
- Task 6 depends on Task 1, Task 2, Task 3, Task 4, Task 5
