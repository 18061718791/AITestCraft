import { Router } from 'express';
import { PrismaClient } from '../generated/prisma';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// 定义Prisma错误类型
interface PrismaError extends Error {
  code?: string;
}

// 获取所有系统
router.get('/systems', async (_req, res) => {
  try {
    const systems = await prisma.system.findMany({
      orderBy: { createdAt: 'asc' },
    });
    
    res.json({
      success: true,
      data: systems,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching systems:', error);
    res.status(500).json({
      success: false,
      error: '获取系统列表失败',
      timestamp: new Date().toISOString(),
    });
    return;
  }
});

// 获取完整树形结构
router.get('/systems/tree', async (_req, res) => {
  try {
    const systems = await prisma.system.findMany({
      include: {
        modules: {
          include: {
            scenarios: {
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // 转换为树形结构
    const treeData = systems.map(system => ({
      key: `system-${system.id}`,
      title: system.name,
      description: system.description,
      type: 'system',
      id: system.id,
      children: system.modules.map(module => ({
        key: `module-${module.id}`,
        title: module.name,
        description: module.description,
        type: 'module',
        id: module.id,
        systemId: system.id,
        children: module.scenarios.map(scenario => ({
          key: `scenario-${scenario.id}`,
          title: scenario.name,
          description: scenario.description,
          content: scenario.content,
          type: 'scenario',
          id: scenario.id,
          moduleId: module.id,
        })),
      })),
    }));

    res.json({
      success: true,
      data: treeData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching tree data:', error);
    res.status(500).json({
      success: false,
      error: '获取树形数据失败',
      timestamp: new Date().toISOString(),
    });
    return;
  }
});

// 获取单个系统详情
router.get('/systems/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const systemId = parseInt(id);

    if (isNaN(systemId)) {
      res.status(400).json({
        success: false,
        error: '无效的系统ID',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const system = await prisma.system.findUnique({
      where: { id: systemId },
      include: {
        modules: {
          include: {
            scenarios: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!system) {
      res.status(404).json({
        success: false,
        error: '系统不存在',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.json({
      success: true,
      data: system,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching system:', error);
    res.status(500).json({
      success: false,
      error: '获取系统详情失败',
      timestamp: new Date().toISOString(),
    });
    return;
  }
});

// 创建新系统
router.post('/systems', async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      res.status(400).json({
        success: false,
        error: '系统名称不能为空',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (name.length > 100) {
      res.status(400).json({
        success: false,
        error: '系统名称不能超过100个字符',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const system = await prisma.system.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
      },
    });

    logger.info(`Created new system: ${system.name} (ID: ${system.id})`);

    res.json({
      success: true,
      data: system,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error creating system:', error);
    res.status(500).json({
      success: false,
      error: '创建系统失败',
      timestamp: new Date().toISOString(),
    });
    return;
  }
});

// 更新系统信息
router.put('/systems/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const systemId = parseInt(id);
    const { name, description } = req.body;

    if (isNaN(systemId)) {
      res.status(400).json({
        success: false,
        error: '无效的系统ID',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (name && (typeof name !== 'string' || name.trim() === '')) {
      res.status(400).json({
        success: false,
        error: '系统名称不能为空',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (name && name.length > 100) {
      res.status(400).json({
        success: false,
        error: '系统名称不能超过100个字符',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const system = await prisma.system.update({
      where: { id: systemId },
      data: {
        name: name?.trim(),
        description: description?.trim() || null,
      },
    });

    logger.info(`Updated system: ${system.name} (ID: ${system.id})`);

    res.json({
      success: true,
      data: system,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error updating system:', error);
    const prismaError = error as PrismaError;
    if (prismaError.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: '系统不存在',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: '更新系统失败',
      timestamp: new Date().toISOString(),
    });
    return;
  }
});

// 删除系统（带删除前检查）

router.delete('/systems/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const systemId = parseInt(id);

    if (isNaN(systemId)) {
      res.status(400).json({
        success: false,
        error: '无效的系统ID',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // 检查系统是否可以删除
    const moduleCount = await prisma.module.count({
      where: { systemId },
    });

    if (moduleCount > 0) {
      res.status(409).json({
        success: false,
        message: `无法删除系统：该系统包含${moduleCount}个模块，请先删除所有模块后再尝试删除系统`,
        data: {
          childCount: moduleCount,
          childType: 'modules',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const system = await prisma.system.delete({
      where: { id: systemId },
    });

    logger.info(`Deleted system: ${system.name} (ID: ${system.id})`);

    res.json({
      success: true,
      message: '系统删除成功',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error deleting system:', error);
    const prismaError = error as PrismaError;
    if (prismaError.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: '系统不存在',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: '删除系统失败',
      timestamp: new Date().toISOString(),
    });
    return;
  }
});

// 获取系统的所有模块
router.get('/systems/:systemId/modules', async (req, res) => {
  try {
    const { systemId } = req.params;
    const systemIdNum = parseInt(systemId);

    if (isNaN(systemIdNum)) {
      res.status(400).json({
        success: false,
        error: '无效的系统ID',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const modules = await prisma.module.findMany({
      where: { systemId: systemIdNum },
      include: {
        scenarios: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    res.json({
      success: true,
      data: modules,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching modules:', error);
    res.status(500).json({
      success: false,
      error: '获取模块列表失败',
      timestamp: new Date().toISOString(),
    });
    return;
  }
});

// 模块相关API

// 创建新模块
router.post('/systems/:systemId/modules', async (req, res) => {
  try {
    const { systemId } = req.params;
    const { name, description, sortOrder = 0 } = req.body;

    const systemIdNum = parseInt(systemId);
    if (isNaN(systemIdNum)) {
      res.status(400).json({
        success: false,
        error: '无效的系统ID',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (!name || typeof name !== 'string' || name.trim() === '') {
      res.status(400).json({
        success: false,
        error: '模块名称不能为空',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (name.length > 100) {
      res.status(400).json({
        success: false,
        error: '模块名称不能超过100个字符',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const module = await prisma.module.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        sortOrder: sortOrder || 0,
        systemId: systemIdNum,
      },
    });

    logger.info(`Created new module: ${module.name} (ID: ${module.id})`);

    res.json({
      success: true,
      data: module,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error creating module:', error);
    const prismaError = error as PrismaError;
    if (prismaError.code === 'P2003') {
      res.status(404).json({
        success: false,
        error: '系统不存在',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: '创建模块失败',
      timestamp: new Date().toISOString(),
    });
    return;
  }
});

// 更新模块信息
router.put('/modules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, sortOrder } = req.body;

    const moduleId = parseInt(id);
    if (isNaN(moduleId)) {
      res.status(400).json({
        success: false,
        error: '无效的模块ID',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (name && (typeof name !== 'string' || name.trim() === '')) {
      res.status(400).json({
        success: false,
        error: '模块名称不能为空',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (name && name.length > 100) {
      res.status(400).json({
        success: false,
        error: '模块名称不能超过100个字符',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const module = await prisma.module.update({
      where: { id: moduleId },
      data: {
        name: name?.trim(),
        description: description?.trim() || null,
        sortOrder: sortOrder ?? undefined,
      },
    });

    logger.info(`Updated module: ${module.name} (ID: ${module.id})`);

    res.json({
      success: true,
      data: module,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error updating module:', error);
    const prismaError = error as PrismaError;
    if (prismaError.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: '模块不存在',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: '更新模块失败',
      timestamp: new Date().toISOString(),
    });
    return;
  }
});

// 删除模块（带删除前检查）
router.delete('/modules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const moduleId = parseInt(id);

    if (isNaN(moduleId)) {
      res.status(400).json({
        success: false,
        error: '无效的模块ID',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // 检查模块是否可以删除
    const scenarioCount = await prisma.scenario.count({
      where: { moduleId },
    });

    if (scenarioCount > 0) {
      res.status(409).json({
        success: false,
        message: '该模块下存在场景，无法删除',
        data: {
          childCount: scenarioCount,
          childType: 'scenario',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const module = await prisma.module.delete({
      where: { id: moduleId },
    });

    logger.info(`Deleted module: ${module.name} (ID: ${module.id})`);

    res.json({
      success: true,
      message: '模块删除成功',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error deleting module:', error);
    const prismaError = error as PrismaError;
    if (prismaError.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: '模块不存在',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: '删除模块失败',
      timestamp: new Date().toISOString(),
    });
    return;
  }
});

// 场景相关API

// 获取模块下的所有场景
router.get('/modules/:moduleId/scenarios', async (req, res) => {
  try {
    const { moduleId } = req.params;
    const moduleIdNum = parseInt(moduleId);

    if (isNaN(moduleIdNum)) {
      res.status(400).json({
        success: false,
        error: '无效的模块ID',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const scenarios = await prisma.scenario.findMany({
      where: { moduleId: moduleIdNum },
      orderBy: { sortOrder: 'asc' },
    });

    res.json({
      success: true,
      data: scenarios,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error fetching scenarios:', error);
    res.status(500).json({
      success: false,
      error: '获取场景列表失败',
      timestamp: new Date().toISOString(),
    });
    return;
  }
});

// 创建新场景
router.post('/modules/:moduleId/scenarios', async (req, res) => {
  try {
    const { moduleId } = req.params;
    const { name, description, content, sortOrder = 0 } = req.body;

    const moduleIdNum = parseInt(moduleId);
    if (isNaN(moduleIdNum)) {
      res.status(400).json({
        success: false,
        error: '无效的模块ID',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (!name || typeof name !== 'string' || name.trim() === '') {
      res.status(400).json({
        success: false,
        error: '场景名称不能为空',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (name.length > 100) {
      res.status(400).json({
        success: false,
        error: '场景名称不能超过100个字符',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const scenario = await prisma.scenario.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        content: content?.trim() || null,
        sortOrder: sortOrder || 0,
        moduleId: moduleIdNum,
      },
    });

    logger.info(`Created new scenario: ${scenario.name} (ID: ${scenario.id})`);

    res.json({
      success: true,
      data: scenario,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error creating scenario:', error);
    const prismaError = error as PrismaError;
    if (prismaError.code === 'P2003') {
      res.status(404).json({
        success: false,
        error: '模块不存在',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: '创建场景失败',
      timestamp: new Date().toISOString(),
    });
    return;
  }
});

// 更新场景信息
router.put('/scenarios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, content, sortOrder } = req.body;

    const scenarioId = parseInt(id);
    if (isNaN(scenarioId)) {
      res.status(400).json({
        success: false,
        error: '无效的场景ID',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (name && (typeof name !== 'string' || name.trim() === '')) {
      res.status(400).json({
        success: false,
        error: '场景名称不能为空',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (name && name.length > 100) {
      res.status(400).json({
        success: false,
        error: '场景名称不能超过100个字符',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const scenario = await prisma.scenario.update({
      where: { id: scenarioId },
      data: {
        name: name?.trim(),
        description: description?.trim() || null,
        content: content?.trim() || null,
        sortOrder: sortOrder ?? undefined,
      },
    });

    logger.info(`Updated scenario: ${scenario.name} (ID: ${scenario.id})`);

    res.json({
      success: true,
      data: scenario,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error updating scenario:', error);
    const prismaError = error as PrismaError;
    if (prismaError.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: '场景不存在',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: '更新场景失败',
      timestamp: new Date().toISOString(),
    });
    return;
  }
});

// 删除场景
router.delete('/scenarios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const scenarioId = parseInt(id);

    if (isNaN(scenarioId)) {
      res.status(400).json({
        success: false,
        error: '无效的场景ID',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const scenario = await prisma.scenario.delete({
      where: { id: scenarioId },
    });

    logger.info(`Deleted scenario: ${scenario.name} (ID: ${scenario.id})`);

    res.json({
      success: true,
      message: '场景删除成功',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error deleting scenario:', error);
    const prismaError = error as PrismaError;
    if (prismaError.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: '场景不存在',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: '删除场景失败',
      timestamp: new Date().toISOString(),
    });
    return;
  }
});

export default router;