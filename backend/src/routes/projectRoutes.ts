import express from 'express';
import { createProject, getProjects, getProjectById, updateProject, deleteProject } from '../services/projectService';
import { createDirectory, getDirectoriesByProjectId, updateDirectory, deleteDirectory } from '../services/directoryService';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

// 项目相关路由 - 需要认证
router.post('/projects', authMiddleware, createProject);
router.get('/projects', authMiddleware, getProjects);
router.get('/projects/:id', authMiddleware, getProjectById);
router.put('/projects/:id', authMiddleware, updateProject);
router.delete('/projects/:id', authMiddleware, deleteProject);

// 目录相关路由 - 需要认证
router.post('/directories', authMiddleware, createDirectory);
router.get('/directories/project/:projectId', authMiddleware, getDirectoriesByProjectId);
router.put('/directories/:id', authMiddleware, updateDirectory);
router.delete('/directories/:id', authMiddleware, deleteDirectory);

export default router;
