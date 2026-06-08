import { readFileSync, readdirSync, statSync } from 'fs';
import { join, basename, extname } from 'path';
import logger from '../utils/logger';

export interface PromptTemplate {
  name: string;
  version: string;
  content: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
}

export interface PromptVersion {
  version: string;
  content: string;
  updatedAt: Date;
  changeLog: string;
}

class PromptService {
  private promptsDir: string;
  private templateCache: Map<string, PromptTemplate> = new Map();
  private versionHistory: Map<string, PromptVersion[]> = new Map();

  constructor() {
    this.promptsDir = join(process.cwd(), '..', 'prompts');
    this.loadTemplates();
  }

  private loadTemplates(): void {
    try {
      const files = readdirSync(this.promptsDir);
      for (const file of files) {
        if (extname(file) === '.md') {
          this.loadTemplate(file);
        }
      }
      logger.info('prompt_service', 'templates_loaded', {
        count: this.templateCache.size,
      });
    } catch (error) {
      logger.error('prompt_service', 'load_templates_failed', error);
    }
  }

  private loadTemplate(filename: string): void {
    try {
      const filepath = join(this.promptsDir, filename);
      const stats = statSync(filepath);
      const content = readFileSync(filepath, 'utf-8');
      const name = basename(filename, '.md');

      const template: PromptTemplate = {
        name,
        version: this.extractVersion(content) || '1.0.0',
        content,
        description: this.extractDescription(content),
        createdAt: stats.birthtime,
        updatedAt: stats.mtime,
        tags: this.extractTags(content),
      };

      this.templateCache.set(name, template);
    } catch (error) {
      logger.error('prompt_service', 'load_template_failed', error, { filename });
    }
  }

  getTemplate(name: string): PromptTemplate | undefined {
    return this.templateCache.get(name);
  }

  getAllTemplates(): PromptTemplate[] {
    return Array.from(this.templateCache.values());
  }

  getTemplatesByTag(tag: string): PromptTemplate[] {
    return this.getAllTemplates().filter((t) => t.tags.includes(tag));
  }

  reloadTemplate(name: string): void {
    this.loadTemplate(`${name}.md`);
  }

  reloadAll(): void {
    this.templateCache.clear();
    this.loadTemplates();
  }

  getTemplateContent(name: string, params?: Record<string, string>): string {
    const template = this.getTemplate(name);
    if (!template) {
      throw new Error(`Template not found: ${name}`);
    }

    let content = template.content;
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        content = content.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
      }
    }

    return content;
  }

  addVersionHistory(templateName: string, version: PromptVersion): void {
    const history = this.versionHistory.get(templateName) || [];
    history.push(version);
    this.versionHistory.set(templateName, history);
  }

  getVersionHistory(templateName: string): PromptVersion[] {
    return this.versionHistory.get(templateName) || [];
  }

  compareVersions(templateName: string, v1: string, v2: string): string {
    const history = this.getVersionHistory(templateName);
    const version1 = history.find((v) => v.version === v1);
    const version2 = history.find((v) => v.version === v2);

    if (!version1 || !version2) {
      return 'Version not found';
    }

    const lines1 = version1.content.split('\n');
    const lines2 = version2.content.split('\n');

    const diff: string[] = [];
    const maxLen = Math.max(lines1.length, lines2.length);

    for (let i = 0; i < maxLen; i++) {
      if (lines1[i] !== lines2[i]) {
        if (lines1[i]) diff.push(`- ${lines1[i]}`);
        if (lines2[i]) diff.push(`+ ${lines2[i]}`);
      }
    }

    return diff.join('\n');
  }

  private extractVersion(content: string): string | undefined {
    const match = content.match(/version:\s*(\d+\.\d+\.\d+)/i);
    return match?.[1];
  }

  private extractDescription(content: string): string {
    const match = content.match(/description:\s*(.+)/i);
    return match?.[1] || '';
  }

  private extractTags(content: string): string[] {
    const match = content.match(/tags:\s*(.+)/i);
    return match?.[1]?.split(',').map((t) => t.trim()) || [];
  }
}

export const promptService = new PromptService();
