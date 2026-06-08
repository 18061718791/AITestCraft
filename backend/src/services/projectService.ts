import { prisma } from '../utils/prisma';
import logger from '../utils/logger';
import type { AuthRequest } from '../middleware/auth';
import type { Response } from 'express';

export const createProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id, name } = req.body;
    const userId = req.user?.userId;

    if (!name) {
      res.status(400).json({ error: '项目名称不能为空' });
      return;
    }

    const projectId = id || `proj_${Date.now()}`;

    const newProject = await prisma.projects.create({
      data: {
        id: projectId,
        name,
        created_by: userId ?? null,
      }
    });

    logger.info('【项目】创建成功', { projectId, name, createdBy: userId });
    res.status(201).json(newProject);
  } catch (error) {
    logger.error('【项目】创建失败', error);
    res.status(500).json({ error: '创建项目失败' });
  }
};

export const getProjects = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const isAdmin = req.user?.roles?.some((r: any) => r.code === 'admin');

    const projects = await prisma.projects.findMany({
      ...(isAdmin ? {} : { where: { created_by: userId ?? null } }),
      orderBy: {
        created_at: 'desc'
      }
    });
    res.status(200).json(projects);
  } catch (error) {
    logger.error('【项目】获取列表失败', error);
    res.status(500).json({ error: '获取项目列表失败' });
  }
};

export const getProjectById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const isAdmin = req.user?.roles?.some((r: any) => r.code === 'admin');

    if (!id) {
      res.status(400).json({ error: '项目ID不能为空' });
      return;
    }

    const project = await prisma.projects.findUnique({
      where: { id }
    });

    if (!project) {
      res.status(404).json({ error: '项目不存在' });
      return;
    }

    if (!isAdmin && project.created_by !== userId) {
      res.status(403).json({ error: '无权访问此项目' });
      return;
    }

    res.status(200).json(project);
  } catch (error) {
    logger.error('【项目】获取详情失败', error);
    res.status(500).json({ error: '获取项目详情失败' });
  }
};

export const updateProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const userId = req.user?.userId;
    const isAdmin = req.user?.roles?.some((r: any) => r.code === 'admin');

    if (!id) {
      res.status(400).json({ error: '项目ID不能为空' });
      return;
    }

    if (!name) {
      res.status(400).json({ error: '项目名称不能为空' });
      return;
    }

    const project = await prisma.projects.findUnique({ where: { id } });
    if (!project) {
      res.status(404).json({ error: '项目不存在' });
      return;
    }

    if (!isAdmin && project.created_by !== userId) {
      res.status(403).json({ error: '无权修改此项目' });
      return;
    }

    const updatedProject = await prisma.projects.update({
      where: { id },
      data: { name }
    });

    res.status(200).json(updatedProject);
  } catch (error) {
    logger.error('【项目】更新失败', error);
    res.status(500).json({ error: '更新项目失败' });
  }
};

export const deleteProject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const isAdmin = req.user?.roles?.some((r: any) => r.code === 'admin');

    if (!id) {
      res.status(400).json({ error: '项目ID不能为空' });
      return;
    }

    const project = await prisma.projects.findUnique({ where: { id } });
    if (!project) {
      res.status(404).json({ error: '项目不存在' });
      return;
    }

    if (!isAdmin && project.created_by !== userId) {
      res.status(403).json({ error: '无权删除此项目' });
      return;
    }

    await prisma.projects.delete({ where: { id } });

    res.status(200).json({ message: '项目删除成功' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: '项目不存在' });
      return;
    }
    logger.error('【项目】删除失败', error);
    res.status(500).json({ error: '删除项目失败' });
  }
};
