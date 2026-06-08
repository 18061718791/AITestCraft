import { prisma } from '../utils/prisma';

interface Directory {
  id: string;
  name: string;
  project_id: string;
  parent_id: string;
  level: number;
  created_at?: Date;
  updated_at?: Date;
}

export const createDirectory = async (req: any, res: any) => {
  try {
    const { id, name, project_id, parent_id, level } = req.body;
    
    if (!name || !project_id || !parent_id || level === undefined || !id) {
      return res.status(400).json({ error: '目录名称、目录ID、项目ID、父目录ID和级别不能为空' });
    }
    
    // 创建目录，使用用户输入的ID作为业务ID，系统会自动生成UUID作为主键
    const newDirectory = await prisma.directories.create({
      data: {
        id,
        name,
        project_id,
        parent_id,
        level,
        updated_at: new Date() // 显式设置 updated_at 字段
      }
    });
    
    res.status(201).json(newDirectory);
  } catch (error: any) {
    
    if (error.code === 'P2003') {
      return res.status(404).json({ error: '项目不存在' });
    }
    
    res.status(500).json({ 
      error: '创建目录失败',
      details: error.message 
    });
  }
};

export const getDirectoriesByProjectId = async (req: any, res: any) => {
  try {
    const { projectId } = req.params;
    
    const directories = await prisma.directories.findMany({
      where: {
        project_id: projectId
      },
      orderBy: [
        { level: 'asc' },
        { created_at: 'asc' }
      ]
    });
    
    // 构建目录树结构
    const buildDirectoryTree = (directories: any[]) => {
      const directoryMap: { [key: string]: any } = {};
      const rootDirectories: any[] = [];
      
      // 先创建所有目录节点
      directories.forEach(dir => {
        directoryMap[dir.id] = {
          ...dir,
          children: []
        };
      });
      
      // 构建树结构
      directories.forEach(dir => {
        if (dir.parent_id === dir.project_id) {
          // 一级目录
          rootDirectories.push(directoryMap[dir.id]);
        } else {
          // 子目录
          if (directoryMap[dir.parent_id]) {
            directoryMap[dir.parent_id].children.push(directoryMap[dir.id]);
          }
        }
      });
      
      return rootDirectories;
    };
    
    const directoryTree = buildDirectoryTree(directories);
    res.status(200).json(directoryTree);
  } catch (error) {
    res.status(500).json({ error: '获取目录列表失败' });
  }
};

export const updateDirectory = async (req: any, res: any) => {
  try {
    const { id: paramsId } = req.params;
    const { name, id, parent_id, level } = req.body;
    
    const updateData: any = {};
    
    if (name !== undefined) {
      updateData.name = name;
    }
    
    if (id !== undefined) {
      // 检查ID是否已被其他目录使用
      const existingDirectory = await prisma.directories.findFirst({
        where: {
          id,
          NOT: {
            uuid: paramsId
          }
        }
      });
      
      if (existingDirectory) {
        return res.status(400).json({ error: '目录ID已存在，请使用其他ID' });
      }
      
      updateData.id = id;
    }
    
    if (parent_id !== undefined) {
      updateData.parent_id = parent_id;
    }
    
    if (level !== undefined) {
      updateData.level = level;
    }
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: '至少需要更新一个字段' });
    }
    
    const updatedDirectory = await prisma.directories.update({
      where: {
        uuid: paramsId
      },
      data: updateData
    });
    
    res.status(200).json(updatedDirectory);
  } catch (error: any) {
    if (error.code === 'P2025') {
      // 目录不存在
      return res.status(404).json({ error: '目录不存在' });
    }
    res.status(500).json({ error: '更新目录失败' });
  }
};

export const deleteDirectory = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    // 递归删除所有子目录
    const deleteSubdirectories = async (directoryId: string) => {
      // 获取所有子目录
      const subdirectories = await prisma.directories.findMany({
        where: {
          parent_id: directoryId
        },
        select: {
          uuid: true
        }
      });
      
      // 递归删除子目录
      for (const subdir of subdirectories) {
        await deleteSubdirectories(subdir.uuid);
      }
      
      // 删除当前目录
      await prisma.directories.delete({
        where: {
          uuid: directoryId
        }
      });
    };
    
    await deleteSubdirectories(id);
    
    res.status(200).json({ message: '目录删除成功' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      // 目录不存在
      return res.status(404).json({ error: '目录不存在' });
    }
    res.status(500).json({ error: '删除目录失败' });
  }
};