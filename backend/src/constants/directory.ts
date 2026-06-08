// 目录 ID 定义
export const DIRECTORY_IDS = {
  ROOT: 2980,
  SECONDARY: {
    LOW_CODE_RD: 2981,
    IOT_APP: 2982,
    IOT_PLATFORM: 2983,
    BIG_DATA: 2984,
  },
  TERTIARY: {
    LOW_CODE_TOOLS: 2989,
    RD_MANAGEMENT: 2990,
    CUSTOMER_ISSUES: 3334,
  }
};

// 系统名称映射
export const SYSTEM_NAMES: Record<number, string> = {
  2981: '低代码&研发管理平台',
  2982: '物联应用',
  2983: '物联平台',
  2984: '大数据平台',
};

// 三级目录名称映射
export const TERTIARY_NAMES: Record<number, string> = {
  2989: '低代码工具',
  2990: '研发管理平台',
  3334: '客户问题',
};

// 排除的目录 ID 列表
export const EXCLUDED_IDS = [
  2981, 2982, 2983, 2984, // 二级目录
  2989, 2990, 3334         // 三级目录
];

// 目录树结构
export const DIRECTORY_TREE = {
  id: DIRECTORY_IDS.ROOT,
  name: '智能物联',
  children: [
    {
      id: DIRECTORY_IDS.SECONDARY.LOW_CODE_RD,
      name: SYSTEM_NAMES[DIRECTORY_IDS.SECONDARY.LOW_CODE_RD],
      children: [
        {
          id: DIRECTORY_IDS.TERTIARY.LOW_CODE_TOOLS,
          name: TERTIARY_NAMES[DIRECTORY_IDS.TERTIARY.LOW_CODE_TOOLS],
        },
        {
          id: DIRECTORY_IDS.TERTIARY.RD_MANAGEMENT,
          name: TERTIARY_NAMES[DIRECTORY_IDS.TERTIARY.RD_MANAGEMENT],
        },
        {
          id: DIRECTORY_IDS.TERTIARY.CUSTOMER_ISSUES,
          name: TERTIARY_NAMES[DIRECTORY_IDS.TERTIARY.CUSTOMER_ISSUES],
        },
      ],
    },
    {
      id: DIRECTORY_IDS.SECONDARY.IOT_APP,
      name: SYSTEM_NAMES[DIRECTORY_IDS.SECONDARY.IOT_APP],
    },
    {
      id: DIRECTORY_IDS.SECONDARY.IOT_PLATFORM,
      name: SYSTEM_NAMES[DIRECTORY_IDS.SECONDARY.IOT_PLATFORM],
    },
    {
      id: DIRECTORY_IDS.SECONDARY.BIG_DATA,
      name: SYSTEM_NAMES[DIRECTORY_IDS.SECONDARY.BIG_DATA],
    },
  ],
};