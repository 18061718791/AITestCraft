import { prisma } from '../../utils/prisma';
import logger from '../../utils/logger';

interface Directory {
  id: string;
  name: string;
  level: number;
  project_id: string;
  parent_id: string;
}

interface ProjectMapping {
  projectId: string;
  projectName: string;
  systems: Directory[];
}

class MySQLProjectMappingService {
  private static instance: MySQLProjectMappingService;
  private cache: Map<string, Directory> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000;

  private constructor() {
    logger.info('MySQLProjectMappingService initialized');
  }

  static getInstance(): MySQLProjectMappingService {
    if (!MySQLProjectMappingService.instance) {
      MySQLProjectMappingService.instance = new MySQLProjectMappingService();
    }
    return MySQLProjectMappingService.instance;
  }

  async getDirectoryByName(name: string, level: number): Promise<Directory | null> {
    try {
      const cacheKey = `${name}_${level}`;
      const cached = this.cache.get(cacheKey);
      const expiry = this.cacheExpiry.get(cacheKey);

      if (cached && expiry && Date.now() < expiry) {
        logger.debug(`Using cached directory for ${name}`);
        return cached;
      }

      const directory = await prisma.directories.findFirst({
        where: {
          name: { contains: name },
          level: level
        }
      });

      if (directory) {
        this.cache.set(cacheKey, directory);
        this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_TTL);
        logger.info(`Found directory: ${directory.name} (id: ${directory.id}, level: ${directory.level})`);
      }

      return directory;
    } catch (error) {
      logger.error(`Failed to get directory by name ${name}:`, error);
      return null;
    }
  }

  async getDirectoryById(id: string): Promise<Directory | null> {
    try {
      const cacheKey = `id_${id}`;
      const cached = this.cache.get(cacheKey);
      const expiry = this.cacheExpiry.get(cacheKey);

      if (cached && expiry && Date.now() < expiry) {
        logger.debug(`Using cached directory for id ${id}`);
        return cached;
      }

      const directory = await prisma.directories.findUnique({
        where: { uuid: id }
      });

      if (directory) {
        this.cache.set(cacheKey, directory);
        this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_TTL);
      }

      return directory;
    } catch (error) {
      logger.error(`Failed to get directory by id ${id}:`, error);
      return null;
    }
  }

  async getAllProjects(): Promise<Directory[]> {
    try {
      return await prisma.directories.findMany({
        where: { level: 0 }
      });
    } catch (error) {
      logger.error('Failed to get all projects:', error);
      return [];
    }
  }

  async getProjectMapping(projectId: string | number): Promise<ProjectMapping | null> {
    try {
      const projectIdStr = typeof projectId === 'number' ? projectId.toString() : projectId;
      const project = await prisma.projects.findUnique({
        where: { id: projectIdStr }
      });

      if (!project) {
        logger.warn(`Project not found: ${projectId}`);
        return null;
      }

      const directories = await prisma.directories.findMany({
        where: { project_id: projectIdStr }
      });

      const systems = directories.filter(dir => dir.level === 1);

      return {
        projectId: project.id,
        projectName: project.name,
        systems
      };
    } catch (error) {
      logger.error(`Failed to get project mapping for ${projectId}:`, error);
      return null;
    }
  }

  async getLLMProjectInfo(): Promise<string> {
    try {
      const projects = await this.getAllProjects();
      const mappings: ProjectMapping[] = [];

      for (const project of projects) {
        const mapping = await this.getProjectMapping(project.id);
        if (mapping) {
          mappings.push(mapping);
        }
      }

      if (mappings.length === 0) {
        return '';
      }

      let info = '\n### 项目和系统映射\n\n';

      for (const mapping of mappings) {
        info += `#### ${mapping.projectName} (项目ID: ${mapping.projectId})\n`;
        info += `包含系统：\n`;
        
        for (const system of mapping.systems) {
          info += `- 系统ID: ${system.id}, 系统名称: ${system.name}\n`;
        }
        
        info += '\n';
      }

      return info;
    } catch (error) {
      logger.error('Failed to get LLM project info:', error);
      return '';
    }
  }

  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
    logger.info('MySQLProjectMappingService cache cleared');
  }
}

export default MySQLProjectMappingService.getInstance();
