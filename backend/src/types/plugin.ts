import { Skill, SkillResult } from './intelligentQa';

export interface PluginConfig {
  enabled: boolean;
  priority: number;
  permissions: string[];
  settings: Record<string, any>;
}

export interface PluginResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

export interface PluginVersion {
  version: string;
  installedAt: Date;
  isActive: boolean;
}

export interface PluginDependency {
  pluginId: string;
  minVersion?: string;
  maxVersion?: string;
}

export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  dependencies: PluginDependency[];
  permissions: string[];
}

export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  config: PluginConfig;

  initialize(): Promise<void>;
  execute(params: Record<string, any>): Promise<PluginResult>;
  destroy(): Promise<void>;

  getIntents(): string[];
  getSkills(): Skill[];
  getDependencies(): string[];
  getMetadata(): PluginMetadata;
}

export interface PluginLoadOptions {
  autoEnable?: boolean;
  validateDependencies?: boolean;
  skipVersionCheck?: boolean;
}

export interface PluginLoadResult {
  success: boolean;
  pluginId?: string;
  message: string;
  errors?: string[];
}

export interface PluginUnloadResult {
  success: boolean;
  message: string;
  errors?: string[];
}

export interface PluginExecuteResult {
  success: boolean;
  result?: PluginResult;
  message: string;
  executionTime?: number;
}
