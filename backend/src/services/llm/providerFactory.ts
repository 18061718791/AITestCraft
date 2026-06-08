import { BaseLLMProvider } from './baseProvider';
import { LLMConfig } from './types';
import { DeepSeekProvider } from './deepseekProvider';
import { VolcanoCodingPlanProvider } from './volcanoProvider';

export class LLMProviderFactory {
  private static providers: Map<string, new (config: LLMConfig) => BaseLLMProvider> = new Map();
  private static instances: Map<string, BaseLLMProvider> = new Map();
  private static capabilityCache: Map<string, { supportsVision: boolean; visionModels: string[] }> = new Map();

  static register(
    name: string,
    ProviderClass: new (config: LLMConfig) => BaseLLMProvider
  ): void {
    this.providers.set(name, ProviderClass);
  }

  static getProvider(config: LLMConfig): BaseLLMProvider {
    const { provider } = config;

    if (!this.providers.has(provider)) {
      throw new Error(
        `Unknown LLM provider: ${provider}. Available: ${this.getAvailableProviders().join(', ')}`
      );
    }

    const cacheKey = `${provider}-${config.model}`;

    if (!this.instances.has(cacheKey)) {
      const ProviderClass = this.providers.get(provider)!;
      const instance = new ProviderClass(config);
      this.instances.set(cacheKey, instance);

      if (!this.capabilityCache.has(provider)) {
        this.capabilityCache.set(provider, {
          supportsVision: instance.getCapability().supportsVision,
          visionModels: instance.getCapability().visionModels,
        });
      }
    }

    return this.instances.get(cacheKey)!;
  }

  static supportsVision(providerName: string, model: string): boolean {
    const cached = this.capabilityCache.get(providerName);
    if (cached) {
      return cached.supportsVision && cached.visionModels.includes(model);
    }

    if (!this.providers.has(providerName)) {
      return false;
    }

    const ProviderClass = this.providers.get(providerName)!;
    const tempConfig: LLMConfig = {
      provider: providerName,
      apiKey: '',
      baseURL: '',
      model,
    };
    const instance = new ProviderClass(tempConfig);
    const capability = instance.getCapability();

    this.capabilityCache.set(providerName, {
      supportsVision: capability.supportsVision,
      visionModels: capability.visionModels,
    });

    return capability.supportsVision && capability.visionModels.includes(model);
  }

  static getVisionModels(providerName: string): string[] {
    const cached = this.capabilityCache.get(providerName);
    if (cached) {
      return cached.supportsVision ? cached.visionModels : [];
    }

    if (!this.providers.has(providerName)) {
      return [];
    }

    const ProviderClass = this.providers.get(providerName)!;
    const tempConfig: LLMConfig = {
      provider: providerName,
      apiKey: '',
      baseURL: '',
      model: 'unknown',
    };
    const instance = new ProviderClass(tempConfig);
    const capability = instance.getCapability();

    this.capabilityCache.set(providerName, {
      supportsVision: capability.supportsVision,
      visionModels: capability.visionModels,
    });

    return capability.supportsVision ? capability.visionModels : [];
  }

  static getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  static clearCache(): void {
    this.instances.clear();
    this.capabilityCache.clear();
  }

  static initialize(): void {
    this.register('deepseek', DeepSeekProvider);
    this.register('volcano-coding', VolcanoCodingPlanProvider);
  }
}
