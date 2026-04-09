import type { AdminConfigBundle, SystemSettings } from './adminConfigTypes';

/** 与种子默认合并，补齐缺失的 basic / timeouts / notices / ai（兼容旧版持久化） */
export function mergePartialSystemSettings(s: SystemSettings): SystemSettings {
  const d = seedSystemSettings();
  return {
    basic: { ...d.basic, ...(s.basic ?? {}) },
    timeouts: { ...d.timeouts, ...(s.timeouts ?? {}) },
    notices: { ...d.notices, ...(s.notices ?? {}) },
    ai: { ...d.ai, ...(s.ai ?? {}) },
  };
}

export function seedSystemSettings(): SystemSettings {
  return {
    basic: {
      platformName: '接诉即办平台',
      schoolName: '×××大学',
      slogan: '便捷高效，诉求直达',
      logoDataUrl: '',
    },
    timeouts: {
      urgeTimeoutHours: 24,
      superviseTimeoutHours: 48,
      autoCloseDays: 7,
      smsReminder: false,
      emailReminder: false,
    },
    notices: {
      enabled: true,
      requireAudit: false,
      pinTopCount: 3,
    },
    ai: {
      smartDispatch: true,
      smartRecommend: true,
      assistWrite: true,
      translation: true,
      modelLabel: '',
      dailyTokenBudget: 10000,
    },
  };
}

export function seedAdminConfigDefaults(): AdminConfigBundle {
  return {
    formFields: [
      {
        id: 'ff_title',
        label: '标题',
        fieldKey: 'title',
        type: 'text',
        required: true,
        order: 1,
        placeholder: '简要概括问题',
      },
      {
        id: 'ff_type',
        label: '问题类型',
        fieldKey: 'type',
        type: 'select',
        required: true,
        order: 2,
        options: [],
      },
      {
        id: 'ff_dept',
        label: '归口部门',
        fieldKey: 'departmentId',
        type: 'select',
        required: true,
        order: 3,
      },
      {
        id: 'ff_content',
        label: '详细描述',
        fieldKey: 'content',
        type: 'textarea',
        required: true,
        order: 4,
        placeholder: '可粘贴图片链接或说明已上传附件',
      },
      {
        id: 'ff_attach',
        label: '附件/多媒体',
        fieldKey: 'media',
        type: 'image',
        required: false,
        order: 5,
      },
    ],
    workflowNodes: [
      {
        id: 'wf_start',
        name: '师生提交',
        kind: 'start',
        nextIds: ['wf_triage'],
        slaHours: 0,
        remark: '入口统一编号',
      },
      {
        id: 'wf_triage',
        name: '自动/人工分派',
        kind: 'triage',
        nextIds: ['wf_accept'],
        slaHours: 4,
        remark: '可触发智能转派',
      },
      {
        id: 'wf_accept',
        name: '部门受理',
        kind: 'accept',
        nextIds: ['wf_reply', 'wf_sup'],
        slaHours: 24,
      },
      {
        id: 'wf_reply',
        name: '正式答复',
        kind: 'reply',
        nextIds: ['wf_end'],
        slaHours: 72,
      },
      {
        id: 'wf_sup',
        name: '督办/校办介入',
        kind: 'supervise',
        nextIds: ['wf_reply'],
        slaHours: 48,
        remark: '领导批示后回承办链',
      },
      { id: 'wf_end', name: '办结归档', kind: 'end', nextIds: [], slaHours: 0 },
    ],
    businessRoles: [
      {
        id: 'br_admin',
        code: 'admin',
        name: '系统管理员',
        description: '全量配置、用户与审计',
        permissions: ['*'],
      },
      {
        id: 'br_leader',
        code: 'leader',
        name: '校办/督办',
        description: '全局转派、督办、领导批示',
        permissions: ['appeal.all', 'dispatch.global', 'supervise'],
      },
      {
        id: 'br_handler',
        code: 'handler',
        name: '二级单位处理员',
        description: '本部门工单受理与答复',
        permissions: ['appeal.dept', 'reply', 'transfer.dept'],
      },
      {
        id: 'br_student',
        code: 'student',
        name: '学生用户',
        description: '门户提交与评价',
        permissions: ['appeal.create', 'appeal.mine'],
      },
    ],
    deptShowcaseExtras: [
      {
        departmentId: 'dept1',
        heroTitle: '教务处 · 教学运行与学籍服务',
        linkTel: '010-12345601',
        shortcuts: [
          { label: '选课系统', href: '#' },
          { label: '考试安排', href: '#' },
        ],
      },
      {
        departmentId: 'dept2',
        heroTitle: '后勤保障 · 报修 24h',
        linkTel: '010-12345602',
        shortcuts: [
          { label: '一站式报修', href: '#' },
          { label: '餐饮服务', href: '#' },
        ],
      },
      {
        departmentId: 'dept4',
        heroTitle: '图书馆 · 文献与空间',
        linkTel: '010-12345604',
        shortcuts: [
          { label: '座位预约', href: '#' },
          { label: '文献传递', href: '#' },
        ],
      },
    ],
    portalBranding: {
      loginWelcome: '欢迎来到接诉即办',
      loginSubtitle: '校园共治门户 · 阳光受理',
      homeMotto: '明德至善 · 笃学敏行',
      channels:  [
        { name: '学校官网', channel: 'Web/H5' },
        { name: '智慧校园 App', channel: '原生 / 壳 Web' },
        { name: '企业微信', channel: '应用工作台' },
        { name: '微信服务号', channel: '菜单 + 模板消息' },
      ],
    },
    systemSettings: seedSystemSettings(),
    auditLogs: [
      {
        id: 'log_seed_1',
        time: '2026-03-28 09:12:00',
        operator: '系统管理员',
        module: '问题类型',
        action: '调整排序',
        detail: '将「后勤报修」前移',
      },
      {
        id: 'log_seed_2',
        time: '2026-03-29 15:40:00',
        operator: '王老师',
        module: '诉求',
        action: '转派',
        detail: 'appeal006 → 后勤牵头联合处置',
      },
    ],
    scheduledJobs: [
      {
        id: 'job_1',
        name: '超时催办扫描',
        cron: '0 */4 * * *',
        enabled: true,
        lastRun: '2026-04-02 08:00:00',
        status: 'success',
      },
      {
        id: 'job_2',
        name: '满意度抽样回访',
        cron: '15 9 * * 1',
        enabled: true,
        lastRun: '2026-04-01 09:15:00',
        status: 'idle',
      },
      {
        id: 'job_3',
        name: '统计报表预聚合',
        cron: '30 0 * * *',
        enabled: true,
        status: 'success',
      },
      {
        id: 'job_4',
        name: '知识库增量同步',
        cron: '0 3 * * *',
        enabled: false,
        status: 'idle',
      },
    ],
    kbDocuments: [
      {
        id: 'kb1',
        title: '选课异常排查清单（2026）',
        category: '教学运行',
        source: '教务处运营平台',
        visibility: 'public',
        updatedAt: '2026-03-20',
        snippet: '第一轮熔断、年级错峰、容量释放策略…',
      },
      {
        id: 'kb2',
        title: '宿舍报修 SLA 与验收口径',
        category: '后勤',
        source: '后勤中台',
        visibility: 'handlers',
        updatedAt: '2026-03-18',
        snippet: '水电 4h 响应、家具 24h 到场…',
      },
      {
        id: 'kb3',
        title: '心理健康危机上报红线',
        category: '学生工作',
        source: '学工部',
        visibility: 'internal',
        updatedAt: '2026-02-10',
        snippet: '法定报告情形与院系协同…',
      },
    ],
    chatbotProfiles: [
      {
        id: 'bot_main',
        name: '接诉即办引导机器人',
        environment: 'production',
        intentCount: 42,
        linkedKbIds: ['kb1', 'kb2'],
        enabled: true,
      },
      {
        id: 'bot_lab',
        name: '实验环境·意图回归',
        environment: 'staging',
        intentCount: 12,
        linkedKbIds: ['kb1'],
        enabled: false,
      },
    ],
    userRiskMarks: [
      {
        userId: '99',
        username: 'spam_demo',
        displayName: '异常行为观察账号',
        flags: ['短时高频 12 条', '重复 tema'],
        appealCount30d: 12,
        status: 'throttle',
        note: '限流观察中',
        updatedAt: '2026-03-30',
      },
    ],
  };
}
