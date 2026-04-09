/**
 * Mock数据生成脚本
 * 运行此脚本生成充足的测试数据
 */

import {
  generateUsers,
  generateAppeals,
  generateReplies,
  generateNotices,
  generateFlowRecords
} from './dataGenerator';
import type { User, Department, Appeal, Reply, Notice, FlowRecord } from './types';
import { departmentTemplates, enrichDepartmentsFromAppeals } from './data';

console.log('开始生成Mock数据...');

const existingUsers: User[] = [];
const existingAppeals: Appeal[] = [];
const existingReplies: Reply[] = [];
const existingNotices: Notice[] = [];
const existingFlowRecords: FlowRecord[] = [];

console.log('生成用户数据...');
const newUsers = generateUsers(50, 0);
const allUsers = [...existingUsers, ...newUsers];
console.log(`用户数据生成完成: ${allUsers.length} 个用户`);

console.log('生成部门数据...');
const allDepartments: Department[] = enrichDepartmentsFromAppeals(departmentTemplates, []);
console.log(`部门数据生成完成: ${allDepartments.length} 个部门`);

console.log('生成诉求数据...');
const newAppeals = generateAppeals(200, 0, allUsers, allDepartments);
const allAppeals = [...existingAppeals, ...newAppeals];
console.log(`诉求数据生成完成: ${allAppeals.length} 条诉求`);

console.log('生成答复数据...');
const handlers = allUsers.filter(u => u.role === 'handler' || u.role === 'admin');
const newReplies = generateReplies(allAppeals, handlers);
const allReplies = [...existingReplies, ...newReplies];
console.log(`答复数据生成完成: ${allReplies.length} 条答复`);

console.log('生成公告通知数据...');
const newNotices = generateNotices(20, 0);
const allNotices = [...existingNotices, ...newNotices];
console.log(`公告通知数据生成完成: ${allNotices.length} 条公告`);

console.log('生成流程记录数据...');
const newFlowRecords = generateFlowRecords(allAppeals, allUsers);
const allFlowRecords = [...existingFlowRecords, ...newFlowRecords];
console.log(`流程记录数据生成完成: ${allFlowRecords.length} 条记录`);

console.log('\n数据生成完成！');
console.log('==================');
console.log(`用户总数: ${allUsers.length}`);
console.log(`部门总数: ${allDepartments.length}`);
console.log(`诉求总数: ${allAppeals.length}`);
console.log(`答复总数: ${allReplies.length}`);
console.log(`公告总数: ${allNotices.length}`);
console.log(`流程记录总数: ${allFlowRecords.length}`);

export {
  allUsers,
  allDepartments,
  allAppeals,
  allReplies,
  allNotices,
  allFlowRecords
};
