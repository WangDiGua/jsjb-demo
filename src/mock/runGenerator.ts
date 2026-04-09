/**
 * Mock数据生成脚本
 * 运行: npx tsx src/mock/runGenerator.ts
 */

import { generateUsers } from './dataGenerator';
import { generateAppeals } from './dataGenerator';
import { generateReplies } from './dataGenerator';
import { generateNotices } from './dataGenerator';
import { generateFlowRecords } from './dataGenerator';
import { departmentTemplates, enrichDepartmentsFromAppeals, mockUsers as existingUsers, mockAppeals as existingAppeals } from './data';
import type { User, Department, Appeal, Reply, Notice, FlowRecord } from './types';
import * as fs from 'fs';
import * as path from 'path';

console.log('开始生成Mock数据...');

const newUsers = generateUsers(50, existingUsers.length);
const allUsers: User[] = [...existingUsers, ...newUsers];
console.log(`用户数据生成完成: ${allUsers.length} 个用户 (原有 ${existingUsers.length} 个，新增 ${newUsers.length} 个)`);

const allDepartments: Department[] = enrichDepartmentsFromAppeals(departmentTemplates, []);
console.log(`部门数据生成完成: ${allDepartments.length} 个部门`);

const newAppeals = generateAppeals(200, existingAppeals.length, allUsers, allDepartments);
const allAppeals: Appeal[] = [...existingAppeals, ...newAppeals];
console.log(`诉求数据生成完成: ${allAppeals.length} 条诉求 (原有 ${existingAppeals.length} 条，新增 ${newAppeals.length} 条)`);

const handlers = allUsers.filter(u => u.role === 'handler' || u.role === 'admin');
const newReplies = generateReplies(allAppeals, handlers);
console.log(`答复数据生成完成: ${newReplies.length} 条答复`);

const newNotices = generateNotices(20, 0);
console.log(`公告通知数据生成完成: ${newNotices.length} 条公告`);

const newFlowRecords = generateFlowRecords(allAppeals, allUsers);
console.log(`流程记录数据生成完成: ${newFlowRecords.length} 条记录`);

console.log('\n数据生成完成！');
console.log('==================');
console.log(`用户总数: ${allUsers.length}`);
console.log(`部门总数: ${allDepartments.length}`);
console.log(`诉求总数: ${allAppeals.length}`);
console.log(`答复总数: ${newReplies.length}`);
console.log(`公告总数: ${newNotices.length}`);
console.log(`流程记录总数: ${newFlowRecords.length}`);

const dataContent = `/**
 * 自动生成的Mock数据
 * 生成时间: ${new Date().toISOString()}
 */

import type { User, Department, Appeal, Reply, Notice, FlowRecord } from './types';

export const generatedUsers: User[] = ${JSON.stringify(newUsers, null, 2)};

export const generatedAppeals: Appeal[] = ${JSON.stringify(newAppeals, null, 2)};

export const generatedReplies: Reply[] = ${JSON.stringify(newReplies, null, 2)};

export const generatedNotices: Notice[] = ${JSON.stringify(newNotices, null, 2)};

export const generatedFlowRecords: FlowRecord[] = ${JSON.stringify(newFlowRecords, null, 2)};
`;

const outputPath = path.join(__dirname, 'generatedData.ts');
fs.writeFileSync(outputPath, dataContent, 'utf-8');

console.log(`\n数据已保存到: ${outputPath}`);
console.log('\n请在 data.ts 中导入并使用生成的数据');
