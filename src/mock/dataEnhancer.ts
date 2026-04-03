/**
 * Mock数据增强工具
 * 用于在运行时动态生成更多的测试数据
 */

import type { User, Department, Appeal, Reply, Notice, FlowRecord } from './types';
import { mockUsers, mockAppeals, mockReplies, mockNotices, mockFlowRecords, departmentTemplates, enrichDepartmentsFromAppeals } from './data';

const problemTypes = [
  '教学管理', '后勤服务', '学生事务', '校园设施', '财务相关', '网络技术', '图书资源', '其他咨询'
];

const appealStatuses: Appeal['status'][] = ['pending', 'accepted', 'processing', 'replied', 'returned', 'withdrawn'];

const surnames = ['张', '李', '王', '刘', '陈', '杨', '赵', '黄', '周', '吴', '徐', '孙', '胡', '朱', '高', '林', '何', '郭', '马', '罗', '梁', '宋', '郑', '谢', '韩', '唐', '冯', '于', '董', '萧'];
const names = ['伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '娟', '涛', '明', '超', '秀兰', '霞', '平', '刚', '桂英', '文', '华', '建国', '建军', '晓明', '小红', '小芳'];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(start: Date, end: Date): string {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

function generateId(prefix: string, index: number): string {
  return `${prefix}${String(index).padStart(3, '0')}`;
}

export function generateAdditionalUsers(count: number): User[] {
  const users: User[] = [];
  const roles: User['role'][] = ['student', 'teacher', 'handler', 'admin', 'dept_leader', 'leader'];
  const roleDistribution = { student: 0.55, teacher: 0.2, handler: 0.1, admin: 0.05, dept_leader: 0.05, leader: 0.05 };
  const startIndex = mockUsers.length;
  
  for (let i = 0; i < count; i++) {
    const rand = Math.random();
    let role: User['role'] = 'student';
    let cumProb = 0;
    for (const [r, prob] of Object.entries(roleDistribution)) {
      cumProb += prob;
      if (rand < cumProb) {
        role = r as User['role'];
        break;
      }
    }
    void roles;
    
    const surname = randomItem(surnames);
    const name = randomItem(names);
    const fullName = surname + name;
    
    users.push({
      id: String(startIndex + i + 1),
      username: `${role}${String(startIndex + i + 1).padStart(3, '0')}`,
      nickname: fullName,
      phone: `1${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
      email: `${fullName.toLowerCase()}@university.edu.cn`,
      role,
      department: role !== 'admin' && role !== 'leader' ? randomItem(['计算机学院', '数学学院', '物理学院', '化学学院', '文学院', '外国语学院']) : undefined,
      departmentId: role === 'handler' || role === 'dept_leader' ? randomItem(departmentTemplates).id : undefined,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${fullName}${i}`,
      status: 'active',
      createTime: randomDate(new Date(2020, 0, 1), new Date(2026, 3, 1)),
    });
  }
  
  return users;
}

export function generateAdditionalAppeals(count: number, users: User[], depts: Department[]): Appeal[] {
  const appeals: Appeal[] = [];
  const titles = [
    '关于{type}问题的反映', '{type}服务改进建议', '{type}相关问题咨询',
    '{type}工作建议', '{type}设施维护申请', '{type}流程优化建议',
    '{type}体验反馈', '{type}政策咨询', '{type}投诉建议'
  ];
  const startIndex = mockAppeals.length;
  
  for (let i = 0; i < count; i++) {
    const type = randomItem(problemTypes);
    const dept = randomItem(depts);
    const user = randomItem(users.filter(u => u.role === 'student' || u.role === 'teacher'));
    const status = randomItem(appealStatuses);
    const createTime = randomDate(new Date(2026, 0, 1), new Date(2026, 3, 15));
    const updateTime = new Date(createTime);
    updateTime.setHours(updateTime.getHours() + Math.floor(Math.random() * 72));
    
    const appeal: Appeal = {
      id: generateId('appeal', startIndex + i + 100),
      title: randomItem(titles).replace('{type}', type),
      content: `这是一条关于${type}的测试诉求内容，诉求详情描述了具体的问题和改进建议。问题发生在${randomItem(['教学楼', '图书馆', '宿舍', '食堂', '实验室', '操场'])}，希望相关部门能够尽快处理。`,
      type,
      departmentId: dept.id,
      departmentName: dept.name,
      userId: user.id,
      userName: user.nickname,
      status,
      isPublic: Math.random() > 0.2,
      isAnonymous: Math.random() > 0.7,
      createTime,
      updateTime: updateTime.toISOString().replace('T', ' ').substring(0, 19),
      响应时长: null,
      处理时长: null,
      浏览量: Math.floor(Math.random() * 200),
    };
    
    if (status !== 'pending' && status !== 'withdrawn') {
      appeal.响应时长 = Math.round(Math.random() * 24 * 10) / 10;
    }
    
    if (status === 'replied') {
      appeal.处理时长 = Math.round(Math.random() * 48 * 10) / 10;
      if (Math.random() > 0.3) {
        appeal.评价 = {
          rating: Math.floor(Math.random() * 2) + 4,
          comment: randomItem(['处理及时，感谢！', '服务态度好', '问题已解决', '效率很高', '满意']),
          time: randomDate(updateTime, new Date(2026, 3, 15))
        };
      }
    }
    
    appeals.push(appeal);
  }
  
  return appeals;
}

export function generateAdditionalReplies(appeals: Appeal[], handlers: User[]): Reply[] {
  const replies: Reply[] = [];
  const repliedAppeals = appeals.filter(a => a.status === 'replied');
  const startIndex = mockReplies.length;
  
  repliedAppeals.forEach((appeal, index) => {
    const handler = randomItem(handlers);
    replies.push({
      id: generateId('reply', startIndex + index + 100),
      appealId: appeal.id,
      handlerId: handler.id,
      handlerName: handler.nickname,
      content: randomItem([
        '已收到您的诉求，我们已安排相关人员处理。具体措施包括：1. 问题排查；2. 制定解决方案；3. 落实整改措施。如有疑问请随时联系我们。',
        '感谢您的反馈，我们已将问题转交给相关部门处理，预计3-5个工作日内完成整改。',
        '您反映的问题我们已经核实，正在积极处理中。我们会持续跟进，确保问题得到妥善解决。',
        '已安排专人负责处理，预计本周内完成。如有进展我们会及时通知您。',
        '问题已解决，感谢您的监督和建议。我们会继续改进服务质量。'
      ]),
      createTime: appeal.updateTime,
      isPublic: appeal.isPublic,
      publishStatus: 'published',
    });
  });
  
  return replies;
}

export function generateAdditionalNotices(count: number): Notice[] {
  const notices: Notice[] = [];
  const titles = [
    '关于{topic}的通知', '{topic}工作安排', '{topic}调整公告',
    '{topic}重要通知', '{topic}服务升级公告'
  ];
  const topics = ['选课', '考试', '放假', '后勤服务', '图书馆', '网络', '财务', '人事', '科研', '教学', '招生', '就业', '军训', '运动会', '校庆'];
  const publishers = ['教务处', '后勤保障部', '学生工作部', '图书馆', '财务处', '信息技术中心', '人事处', '科研处', '研究生院', '国际合作处'];
  const startIndex = mockNotices.length;
  
  for (let i = 0; i < count; i++) {
    const topic = randomItem(topics);
    notices.push({
      id: generateId('notice', startIndex + i + 10),
      title: randomItem(titles).replace('{topic}', topic),
      content: `各位师生：\n\n关于${topic}的相关事项通知如下：\n\n一、时间安排\n具体时间请查看详细安排。\n\n二、注意事项\n请各位师生注意相关事项，如有疑问请联系相关部门。\n\n特此通知。`,
      createTime: randomDate(new Date(2026, 0, 1), new Date(2026, 3, 15)),
      publisher: randomItem(publishers),
    });
  }
  
  return notices;
}

export function generateAdditionalFlowRecords(appeals: Appeal[], users: User[]): FlowRecord[] {
  const records: FlowRecord[] = [];
  let recordIndex = mockFlowRecords.length;
  
  appeals.forEach(appeal => {
    records.push({
      id: generateId('flow', recordIndex++),
      appealId: appeal.id,
      action: 'submit',
      operatorId: appeal.userId,
      operatorName: appeal.userName,
      createTime: appeal.createTime,
    });
    
    if (appeal.status !== 'pending' && appeal.status !== 'withdrawn') {
      const handler = randomItem(users.filter(u => u.role === 'handler' || u.role === 'admin'));
      const acceptTime = new Date(appeal.createTime);
      acceptTime.setHours(acceptTime.getHours() + Math.floor(Math.random() * 12));
      
      records.push({
        id: generateId('flow', recordIndex++),
        appealId: appeal.id,
        action: 'accept',
        operatorId: handler.id,
        operatorName: handler.nickname,
        createTime: acceptTime.toISOString().replace('T', ' ').substring(0, 19),
      });
      
      if (appeal.status === 'replied') {
        records.push({
          id: generateId('flow', recordIndex++),
          appealId: appeal.id,
          action: 'reply',
          operatorId: handler.id,
          operatorName: handler.nickname,
          content: randomItem(['已处理并答复', '问题已解决', '正在处理中', '已安排专人处理']),
          createTime: appeal.updateTime,
        });
        
        if (appeal.评价) {
          records.push({
            id: generateId('flow', recordIndex++),
            appealId: appeal.id,
            action: 'evaluate',
            operatorId: appeal.userId,
            operatorName: appeal.userName,
            content: appeal.评价.comment,
            createTime: appeal.评价.time,
          });
        }
      }
    }
  });
  
  return records;
}

export function enrichMockData() {
  const additionalUsers = generateAdditionalUsers(45);
  const allUsers = [...mockUsers, ...additionalUsers];
  
  const allDepartments = enrichDepartmentsFromAppeals(mockAppeals);
  
  const additionalAppeals = generateAdditionalAppeals(177, allUsers, allDepartments);
  const allAppeals = [...mockAppeals, ...additionalAppeals];
  
  const handlers = allUsers.filter(u => u.role === 'handler' || u.role === 'admin');
  const additionalReplies = generateAdditionalReplies(allAppeals.filter(a => a.status === 'replied'), handlers);
  const allReplies = [...mockReplies, ...additionalReplies];
  
  const additionalNotices = generateAdditionalNotices(17);
  const allNotices = [...mockNotices, ...additionalNotices];
  
  const additionalFlowRecords = generateAdditionalFlowRecords(additionalAppeals, allUsers);
  const allFlowRecords = [...mockFlowRecords, ...additionalFlowRecords];
  
  return {
    users: allUsers,
    departments: allDepartments,
    appeals: allAppeals,
    replies: allReplies,
    notices: allNotices,
    flowRecords: allFlowRecords,
  };
}
