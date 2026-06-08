import ExcelJS from 'exceljs';
import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { query } from '../utils/database';
import { calculateWorkDaysExcludingHolidays } from '../data/holidays';

// 计算已用时（排除周末和节假日，0.5为最低单位）
const calculateElapsedDays = (createdOn: Date): number => {
  const workDays = calculateWorkDaysExcludingHolidays(createdOn);

  // 获取小数部分（按小时比例）
  const created = new Date(createdOn);
  const now = new Date();
  const hours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
  const totalDays = hours / 24;

  // 计算非工作日天数（周末+节假日-调休）
  const nonWorkDays = Math.floor(totalDays) - workDays;
  const workDaysWithFraction = totalDays - nonWorkDays;

  // 0.5为最低单位
  let days: number;
  if (workDaysWithFraction <= 0.5) {
    days = 0.5;
  } else {
    days = Math.ceil(workDaysWithFraction * 2) / 2;
  }

  return days;
};

interface ExportParams {
  project_id?: string;
  system_id?: string;
  module_id?: string;
  userId?: number | undefined;
  isAdmin?: boolean | undefined;
}

interface DefectData {
  id: number;
  subject: string;
  status_name: string;
  priority_name: string;
  system_module_name: string;
  assigned_to_name: string;
  created_on: Date;
  elapsed_days: number;
  system_name: string;
}

export class UrgentIssueExportService {
  async exportToExcel(params: ExportParams, res: Response): Promise<void> {
    try {
      // 获取所有符合条件的数据
      const defects = await this.fetchDefects(params);

      if (defects.length === 0) {
        res.status(404).json({
          success: false,
          error: '没有数据可导出',
        });
        return;
      }

      // 按系统分组
      const groupedBySystem = new Map<string, DefectData[]>();
      defects.forEach(defect => {
        const systemName = defect.system_name || '未分类';
        if (!groupedBySystem.has(systemName)) {
          groupedBySystem.set(systemName, []);
        }
        groupedBySystem.get(systemName)!.push(defect);
      });

      // 创建工作簿
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('紧急问题跟踪');

      // 设置列宽
      worksheet.columns = [
        { width: 10 },  // ID
        { width: 40 },  // 主题
        { width: 12 },  // 状态
        { width: 12 },  // 优先级
        { width: 25 },  // 系统/模块
        { width: 15 },  // 分配给
        { width: 20 },  // 创建时间
        { width: 15 },  // 已用时(天)
      ];

      let currentRow = 1;
      const systems = Array.from(groupedBySystem.keys()).sort();

      systems.forEach((systemName, systemIndex) => {
        // 添加系统标题行（合并A到H列，灰色背景）
        const systemRow = worksheet.getRow(currentRow);
        systemRow.getCell(1).value = `系统：${systemName}`;
        systemRow.getCell(1).font = {
          name: '微软雅黑',
          size: 12,
          bold: true,
        };
        systemRow.getCell(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD9D9D9' }, // 灰色背景
        };
        systemRow.getCell(1).alignment = {
          vertical: 'middle',
          horizontal: 'left',
        };

        // 合并A到H列
        worksheet.mergeCells(currentRow, 1, currentRow, 8);
        currentRow++;

        // 添加表头（蓝色背景）
        const headerRow = worksheet.getRow(currentRow);
        const headers = ['ID', '主题', '状态', '优先级', '系统/模块', '分配给', '创建时间', '已用时(天)'];
        headers.forEach((header, index) => {
          const cell = headerRow.getCell(index + 1);
          cell.value = header;
          cell.font = {
            name: '微软雅黑',
            size: 11,
            bold: true,
            color: { argb: 'FFFFFFFF' }, // 白色字体
          };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' }, // 蓝色背景
          };
          cell.alignment = {
            vertical: 'middle',
            horizontal: 'center',
          };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } },
          };
        });
        currentRow++;

        // 添加数据行（灰白交替）
        const systemDefects = groupedBySystem.get(systemName)!;
        systemDefects.forEach((defect, defectIndex) => {
          const dataRow = worksheet.getRow(currentRow);
          const isEvenRow = defectIndex % 2 === 0;

          dataRow.getCell(1).value = defect.id;
          dataRow.getCell(2).value = defect.subject;
          dataRow.getCell(3).value = defect.status_name;
          dataRow.getCell(4).value = defect.priority_name;
          dataRow.getCell(5).value = defect.system_module_name;
          dataRow.getCell(6).value = defect.assigned_to_name;
          dataRow.getCell(7).value = new Date(defect.created_on).toLocaleString('zh-CN');
          dataRow.getCell(8).value = defect.elapsed_days;

          // 设置单元格样式
          for (let col = 1; col <= 8; col++) {
            const cell = dataRow.getCell(col);
            cell.font = {
              name: '微软雅黑',
              size: 11,
            };
            cell.alignment = {
              vertical: 'middle',
              horizontal: col === 2 ? 'left' : 'center', // 主题左对齐，其他居中
            };
            cell.border = {
              top: { style: 'thin', color: { argb: 'FF000000' } },
              left: { style: 'thin', color: { argb: 'FF000000' } },
              bottom: { style: 'thin', color: { argb: 'FF000000' } },
              right: { style: 'thin', color: { argb: 'FF000000' } },
            };

            // 灰白交替背景
            if (isEvenRow) {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF2F2F2' }, // 浅灰色
              };
            } else {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFFFFF' }, // 白色
              };
            }
          }

          currentRow++;
        });

        // 系统之间添加空行（最后一个系统除外）
        if (systemIndex < systems.length - 1) {
          currentRow++;
        }
      });

      // 设置响应头
      const fileName = `紧急问题跟踪_${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);

      // 写入响应
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error('导出Excel失败:', error);
      res.status(500).json({
        success: false,
        error: '导出Excel失败',
      });
    }
  }

  private async fetchDefects(params: ExportParams): Promise<DefectData[]> {
    const { project_id, system_id, module_id, userId, isAdmin } = params;

    // 用户数据隔离：构建项目过滤条件
    let projectFilter: any = {};
    if (!isAdmin && userId) {
      const userProjects = await prisma.projects.findMany({
        where: { created_by: userId },
        select: { id: true }
      });
      const userProjectIds = userProjects.map(p => p.id);
      if (userProjectIds.length === 0) {
        return []; // 用户没有创建任何项目，返回空
      }
      projectFilter.project_id = { in: userProjectIds };
    }

    // 构建查询参数
    const queryParams: any[] = [];
    let whereClause = `WHERE 1=1`;

    // 固定查询紧急问题（priority_id = 4）
    whereClause += ` AND i.priority_id = 4`;

    // 固定排除已关闭（status_id = 5）
    whereClause += ` AND i.status_id != 5`;

    // 处理system_id和module_id 或 project_id
    // 注意：当只有project_id时，通过parent_id筛选，不直接筛选project_id
    // 因为issues表中的project_id可能与directories表中的project_id不一致
    let parentIds: number[] = [];

    if (system_id && system_id !== '') {
      const systemId = parseInt(system_id);
      const moduleId = module_id && module_id !== '' ? parseInt(module_id) : undefined;

      if (!isNaN(systemId)) {
        // 查询系统下的所有子目录（带用户数据隔离）
        const subdirectories = await prisma.directories.findMany({
          where: {
            parent_id: systemId.toString(),
            level: 2,
            ...projectFilter
          },
        });

        if (subdirectories.length > 0) {
          if (moduleId && !isNaN(moduleId)) {
            parentIds = [moduleId];
          } else {
            parentIds = subdirectories.map(dir => parseInt(dir.id));
          }
        } else {
          parentIds = [systemId];
        }
      }
    } else if (project_id && project_id !== '') {
      // 只有project_id时，查询项目下的所有二级和三级目录
      const projectId = parseInt(project_id);
      if (!isNaN(projectId)) {
        // 检查用户是否有权限访问该项目
        if (!isAdmin && userId) {
          const project = await prisma.projects.findFirst({
            where: { id: projectId.toString(), created_by: userId }
          });
          if (!project) {
            return []; // 无权访问该项目
          }
        }

        const directories = await prisma.directories.findMany({
          where: {
            project_id: projectId.toString(),
          },
        });

        const level1Dirs = directories.filter(dir => dir.level === 1);
        const level2Dirs = directories.filter(dir => dir.level === 2);

        for (const dir of level1Dirs) {
          const childModules = level2Dirs.filter(l2Dir => l2Dir.parent_id === dir.id);
          if (childModules.length > 0) {
            parentIds.push(...childModules.map(m => parseInt(m.id)));
          } else {
            parentIds.push(parseInt(dir.id));
          }
        }
      }
    } else {
      // 没有提供参数，查询所有二级和三级目录（带用户数据隔离）
      const allDirectories = await prisma.directories.findMany({
        where: {
          level: {
            in: [1, 2]
          },
          ...projectFilter
        }
      });
      
      const level1Dirs = allDirectories.filter(dir => dir.level === 1);
      const level2Dirs = allDirectories.filter(dir => dir.level === 2);
      
      for (const dir of level1Dirs) {
        const childModules = level2Dirs.filter(l2Dir => l2Dir.parent_id === dir.id);
        if (childModules.length > 0) {
          parentIds.push(...childModules.map(m => parseInt(m.id)));
        } else {
          parentIds.push(parseInt(dir.id));
        }
      }
    }

    // 应用parent_id筛选条件
    if (parentIds.length > 0) {
      if (parentIds.length === 1) {
        whereClause += ` AND i.parent_id = $${queryParams.length + 1}`;
        queryParams.push(parentIds[0]);
      } else {
        whereClause += ` AND i.parent_id = ANY($${queryParams.length + 1})`;
        queryParams.push(parentIds);
      }
    }

    // 构建查询SQL
    const selectSql = `
      SELECT
        i.id,
        i.subject,
        i.created_on,
        ps.name as status_name,
        pp.name as priority_name,
        u.lastname as assigned_to_name,
        i.parent_id
      FROM issues i
      LEFT JOIN issue_statuses ps ON i.status_id = ps.id
      LEFT JOIN enumerations pp ON i.priority_id = pp.id
      LEFT JOIN users u ON i.assigned_to_id = u.id
      ${whereClause}
      ORDER BY i.created_on DESC
    `;

    // 查询数据
    const dataResult = await query(selectSql, queryParams);

    // 查询所有需要的目录信息
    const directoryIds = dataResult.rows.map((row: any) => row.parent_id).filter((id: any) => id && !isNaN(id));
    const directoriesMap: Record<number, any> = {};

    if (directoryIds.length > 0) {
      const uniqueDirectoryIds = [...new Set(directoryIds)];
      const directories = await prisma.directories.findMany({
        where: {
          id: {
            in: uniqueDirectoryIds.map(id => id.toString()),
          },
        },
      });

      directories.forEach(dir => {
        directoriesMap[parseInt(dir.id)] = dir;
      });

      // 如果有三级目录，需要查询其父目录（二级目录）信息
      const moduleIds = directories
        .filter(dir => dir.level === 3)
        .map(dir => dir.parent_id)
        .filter((id: any) => id && !isNaN(id));

      if (moduleIds.length > 0) {
        const uniqueModuleIds = [...new Set(moduleIds)];
        const parentDirectories = await prisma.directories.findMany({
          where: {
            id: {
              in: uniqueModuleIds,
            },
          },
        });

        parentDirectories.forEach(dir => {
          directoriesMap[parseInt(dir.id)] = dir;
        });
      }
    }

    // 格式化数据
    return dataResult.rows.map((row: any) => {
      let system_module_name = '其他';
      let system_name = '未分类';

      // 根据parent_id生成系统/模块名称
      if (row.parent_id) {
        const directory = directoriesMap[row.parent_id];
        if (directory) {
          if (directory.level === 1) {
            // 二级目录（系统级别）
            system_module_name = directory.name;
            system_name = directory.name;
          } else if (directory.level === 2) {
            // 三级目录（模块级别），需要显示系统名称 - 模块名称
            const parentDirectory = directoriesMap[parseInt(directory.parent_id)];
            if (parentDirectory) {
              system_module_name = `${parentDirectory.name} - ${directory.name}`;
              system_name = parentDirectory.name;
            } else {
              system_module_name = directory.name;
              system_name = directory.name;
            }
          }
        }
      }

      return {
        id: row.id,
        subject: row.subject,
        status_name: row.status_name || '未知',
        priority_name: row.priority_name || '未知',
        system_module_name,
        assigned_to_name: row.assigned_to_name || '',
        created_on: row.created_on,
        elapsed_days: calculateElapsedDays(row.created_on),
        system_name,
      };
    });
  }
}

export const urgentIssueExportService = new UrgentIssueExportService();
