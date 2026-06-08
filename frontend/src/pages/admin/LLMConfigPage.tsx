import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, message, Space, Typography, Select, Divider, Tag, Alert } from 'antd';
import axios from 'axios';

const { Text, Title } = Typography;
const { Password } = Input;
const { Option } = Select;

interface ProviderInfo {
  name: string;
  label: string;
  description: string;
  defaultBaseURL: string;
  defaultModel: string;
  models: string[];
}

const PROVIDERS: ProviderInfo[] = [
  {
    name: 'deepseek',
    label: 'DeepSeek',
    description: '深度求索大模型',
    defaultBaseURL: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-v4-flash',
    models: ['deepseek-v4-flash', 'deepseek-v4-pro', 'deepseek-chat', 'deepseek-coder'],
  },
  {
    name: 'volcano-coding',
    label: '火山引擎 Coding Plan',
    description: '字节跳动火山方舟代码模型',
    defaultBaseURL: 'https://ark.cn-beijing.volces.com/api/coding/v3',
    defaultModel: 'ark-code-latest',
    models: ['ark-code-latest', 'doubao-seed-code', 'deepseek-v3.2', 'kimi-k2.5', 'glm-4.7'],
  },
];

const LLMConfigPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>('deepseek');
  const [currentProvider, setCurrentProvider] = useState<string>('deepseek');
  const [, setAvailableProviders] = useState<string[]>([]);

  // 获取可用Provider列表和当前配置
  const fetchLLMConfig = async () => {
    setLoading(true);
    try {
      // 获取可用Provider列表
      const providersRes = await axios.get('/api/llm/providers');
      if (providersRes.data.success) {
        setAvailableProviders(providersRes.data.data);
      }

      // 获取当前配置
      const configRes = await axios.get('/api/llm/config');
      if (configRes.data.success) {
        const config = configRes.data.data;
        const provider = config.provider || 'deepseek';
        setSelectedProvider(provider);
        setCurrentProvider(provider);

        const providerInfo = PROVIDERS.find((p) => p.name === provider);

        form.setFieldsValue({
          provider,
          model: config.model || providerInfo?.defaultModel,
          baseURL: config.baseURL || providerInfo?.defaultBaseURL,
          apiKey: '', // API密钥不回显
          temperature: config.temperature ?? 0.7,
          timeout: config.timeout ?? 120000,
          maxRetries: config.maxRetries ?? 3,
          retryDelay: config.retryDelay ?? 2000,
          batchSize: config.batchSize ?? 5,
        });
      }
    } catch (error: any) {
      message.error(error.response?.data?.error?.message || '获取配置失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLLMConfig();
  }, []);

  // Provider切换时更新默认值
  const handleProviderChange = (provider: string) => {
    setSelectedProvider(provider);
    const providerInfo = PROVIDERS.find((p) => p.name === provider);
    if (providerInfo) {
      form.setFieldsValue({
        model: providerInfo.defaultModel,
        baseURL: providerInfo.defaultBaseURL,
      });
    }
  };

  // 保存配置
  const handleSave = async (values: any) => {
    setLoading(true);
    try {
      const response = await axios.post('/api/llm/config', {
        provider: values.provider,
        apiKey: values.apiKey || undefined,
        baseURL: values.baseURL,
        model: values.model,
        temperature: parseFloat(values.temperature),
        timeout: parseInt(values.timeout),
        maxRetries: parseInt(values.maxRetries),
        retryDelay: parseInt(values.retryDelay),
        batchSize: parseInt(values.batchSize),
      });

      if (response.data.success) {
        message.success('配置保存成功，新配置已生效');
        setCurrentProvider(values.provider);
      } else {
        message.error(response.data.error?.message || '保存配置失败');
      }
    } catch (error: any) {
      message.error(error.response?.data?.error?.message || '保存配置失败');
    } finally {
      setLoading(false);
    }
  };

  const currentProviderInfo = PROVIDERS.find((p) => p.name === currentProvider);
  const selectedProviderInfo = PROVIDERS.find((p) => p.name === selectedProvider);

  return (
    <div>
      <Card title="大模型配置" style={{ marginBottom: 24 }}>
        <Text type="secondary">
          配置AI测试用例生成所使用的LLM Provider。切换Provider后，新配置会立即生效，无需重启服务。
        </Text>
        {currentProvider && (
          <div style={{ marginTop: 12 }}>
            <Tag color="blue">当前Provider: {currentProviderInfo?.label || currentProvider}</Tag>
            <Tag color="green">当前模型: {form.getFieldValue('model')}</Tag>
          </div>
        )}
      </Card>

      <Card loading={loading}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Title level={5}>Provider选择</Title>
          <Form.Item
            name="provider"
            label="LLM Provider"
            rules={[{ required: true, message: '请选择Provider' }]}
          >
            <Select placeholder="请选择Provider" onChange={handleProviderChange} style={{ width: '100%' }}>
              {PROVIDERS.map((p) => (
                <Option key={p.name} value={p.name}>
                  <div>
                    <strong>{p.label}</strong>
                    <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                      {p.description}
                    </Text>
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="model"
            label="模型"
            rules={[{ required: true, message: '请选择模型' }]}
          >
            <Select placeholder="请选择模型" style={{ width: '100%' }}>
              {selectedProviderInfo?.models.map((model) => (
                <Option key={model} value={model}>
                  {model}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Divider />
          <Title level={5}>API配置</Title>

          <Form.Item
            name="baseURL"
            label="API基础URL"
            rules={[{ required: true, message: '请输入API基础URL' }]}
          >
            <Input placeholder="请输入API基础URL" />
          </Form.Item>

          <Form.Item
            name="apiKey"
            label="API密钥"
            rules={[{ required: false }]}
          >
            <Password placeholder="请输入API密钥（留空则保持现有密钥不变）" allowClear />
          </Form.Item>

          <Divider />
          <Title level={5}>生成参数</Title>

          <Space direction="vertical" style={{ width: '100%' }}>
            <Form.Item
              name="temperature"
              label="温度参数"
              rules={[{ required: true, message: '请输入温度参数' }]}
            >
              <Input type="number" min={0} max={2} step={0.1} placeholder="0-2之间，建议0.3-0.7" />
            </Form.Item>

            <Form.Item
              name="timeout"
              label="超时时间（毫秒）"
              rules={[{ required: true, message: '请输入超时时间' }]}
            >
              <Input type="number" min={1000} step={1000} placeholder="建议120000" />
            </Form.Item>

            <Form.Item
              name="maxRetries"
              label="最大重试次数"
              rules={[{ required: true, message: '请输入最大重试次数' }]}
            >
              <Input type="number" min={0} max={10} step={1} placeholder="建议3" />
            </Form.Item>

            <Form.Item
              name="retryDelay"
              label="重试延迟（毫秒）"
              rules={[{ required: true, message: '请输入重试延迟' }]}
            >
              <Input type="number" min={100} step={100} placeholder="建议2000" />
            </Form.Item>

            <Form.Item
              name="batchSize"
              label="批处理大小"
              rules={[{ required: true, message: '请输入批处理大小' }]}
            >
              <Input type="number" min={1} max={20} step={1} placeholder="DeepSeek建议5，火山引擎建议10" />
            </Form.Item>
          </Space>

          <Alert
            message="配置说明"
            description={
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                <li>切换Provider后，新配置会立即生效</li>
                <li>API密钥留空时，将保持现有密钥不变</li>
                <li>火山引擎Coding Plan使用代码优化模型，温度参数建议0.3</li>
                <li>批处理大小影响生成效率，火山引擎支持更大的批次</li>
              </ul>
            }
            type="info"
            showIcon
            style={{ marginTop: 16, marginBottom: 16 }}
          />

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              保存配置
            </Button>
            <Button style={{ marginLeft: 8 }} onClick={fetchLLMConfig} loading={loading}>
              刷新
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default LLMConfigPage;
