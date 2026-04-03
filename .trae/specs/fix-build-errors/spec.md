# 修复 TypeScript 构建错误 Spec

## Why
项目打包时存在多个 TypeScript 类型错误，导致构建失败。需要在不影响现有样式和功能的前提下修复这些错误。

## What Changes
- 排除 Node.js 脚本文件 `runGenerator.ts` 不参与前端构建
- 修复 `antdPreferences.ts` 中 antd 主题 token 类型兼容问题
- 修复 `dataEnhancer.ts` 和 `dataGenerator.ts` 中 Appeal 类型缺少必需属性问题
- 修复 `services.ts` 中类型比较逻辑问题

## Impact
- Affected code: 
  - `tsconfig.app.json`
  - `src/theme/antdPreferences.ts`
  - `src/mock/dataEnhancer.ts`
  - `src/mock/dataGenerator.ts`
  - `src/mock/services.ts`

## ADDED Requirements

### Requirement: Node.js 脚本排除构建
构建系统 SHALL 排除仅用于 Node.js 环境的脚本文件，避免浏览器环境类型冲突。

#### Scenario: 排除 runGenerator.ts
- **WHEN** 执行 TypeScript 构建
- **THEN** `src/mock/runGenerator.ts` 不参与类型检查

### Requirement: Antd 主题配置类型兼容
主题配置 SHALL 使用类型断言绕过 antd 6.x 不存在的 token 属性检查，保持样式效果不变。

#### Scenario: 主题 token 配置
- **WHEN** 配置 antd 组件主题
- **THEN** 使用 `as any` 类型断言允许自定义 token 属性

### Requirement: Appeal 类型完整性
生成 Appeal 对象时 SHALL 包含所有必需属性。

#### Scenario: 初始化响应时长和处理时长
- **WHEN** 创建 Appeal 对象
- **THEN** `响应时长` 和 `处理时长` 属性初始化为 `null`

### Requirement: 类型比较逻辑正确性
条件判断 SHALL 避免不可能的类型比较。

#### Scenario: 角色权限检查
- **WHEN** 检查用户角色权限
- **THEN** 条件逻辑正确反映业务意图
