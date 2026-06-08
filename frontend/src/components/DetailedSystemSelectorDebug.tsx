import React, { useState } from 'react';
import { Select, Space, Form, Button, Card, Alert } from 'antd';
import { System, Module, Scenario } from '../types';
import { systemApi } from '../services/systemApi';

const { Option } = Select;

const DetailedSystemSelectorDebug: React.FC = () => {
  const [systems, setSystems] = useState<System[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  
  const [loading, setLoading] = useState({
    systems: false,
    modules: false,
    scenarios: false,
  });
  
  const [selectedSystem, setSelectedSystem] = useState<number | undefined>();
  const [selectedModule, setSelectedModule] = useState<number | undefined>();
  const [selectedScenario, setSelectedScenario] = useState<number | undefined>();
  
  const [errors, setErrors] = useState<string[]>([]);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const addDebugInfo = (info: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugInfo(prev => [...prev, `[${timestamp}] ${info}`]);
  };

  const addError = (error: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setErrors(prev => [...prev, `[${timestamp}] ${error}`]);
  };

  // 加载系统列表
  const loadSystems = async () => {
    try {
      addDebugInfo('开始加载系统列表...');
      setLoading(prev => ({ ...prev, systems: true }));
      
      const response = await systemApi.getSystems();
      addDebugInfo(`系统列表加载成功，共获取到 ${response.length} 个系统`);
      addDebugInfo(`系统数据: ${JSON.stringify(response)}`);
      
      setSystems(response);
      
      if (response.length === 0) {
        addError('警告：没有获取到任何系统数据');
      }
    } catch (error) {
      const errorMsg = `加载系统列表失败: ${error}`;
      addError(errorMsg);
      console.error(errorMsg);
    } finally {
      setLoading(prev => ({ ...prev, systems: false }));
    }
  };

  // 加载模块列表
  const loadModules = async (systemId: number) => {
    try {
      addDebugInfo(`开始加载系统 ${systemId} 的模块列表...`);
      setLoading(prev => ({ ...prev, modules: true }));
      
      const response = await systemApi.getModules(systemId);
      addDebugInfo(`模块列表加载成功，共获取到 ${response.length} 个模块`);
      addDebugInfo(`模块数据: ${JSON.stringify(response)}`);
      
      setModules(response);
      
      if (response.length === 0) {
        addDebugInfo('当前系统下没有模块数据');
      }
    } catch (error) {
      const errorMsg = `加载模块列表失败: ${error}`;
      addError(errorMsg);
      console.error(errorMsg);
    } finally {
      setLoading(prev => ({ ...prev, modules: false }));
    }
  };

  // 加载场景列表
  const loadScenarios = async (moduleId: number) => {
    try {
      addDebugInfo(`开始加载模块 ${moduleId} 的场景列表...`);
      setLoading(prev => ({ ...prev, scenarios: true }));
      
      const response = await systemApi.getScenarios(moduleId);
      addDebugInfo(`场景列表加载成功，共获取到 ${response.length} 个场景`);
      addDebugInfo(`场景数据: ${JSON.stringify(response)}`);
      
      setScenarios(response);
      
      if (response.length === 0) {
        addDebugInfo('当前模块下没有场景数据');
      }
    } catch (error) {
      const errorMsg = `加载场景列表失败: ${error}`;
      addError(errorMsg);
      console.error(errorMsg);
    } finally {
      setLoading(prev => ({ ...prev, scenarios: false }));
    }
  };

  const handleSystemChange = async (systemId: number | undefined) => {
    addDebugInfo(`系统选择变更: ${systemId}`);
    setSelectedSystem(systemId);
    setSelectedModule(undefined);
    setSelectedScenario(undefined);
    setModules([]);
    setScenarios([]);
    
    if (systemId) {
      await loadModules(systemId);
    }
  };

  const handleModuleChange = async (moduleId: number | undefined) => {
    addDebugInfo(`模块选择变更: ${moduleId}`);
    setSelectedModule(moduleId);
    setSelectedScenario(undefined);
    setScenarios([]);
    
    if (moduleId) {
      await loadScenarios(moduleId);
    }
  };

  const handleScenarioChange = (scenarioId: number | undefined) => {
    addDebugInfo(`场景选择变更: ${scenarioId}`);
    setSelectedScenario(scenarioId);
  };

  const clearDebugInfo = () => {
    setDebugInfo([]);
    setErrors([]);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px' }}>
      <h2>系统选择器详细调试</h2>
      
      <Card title="调试控制" style={{ marginBottom: 16 }}>
        <Space>
          <Button type="primary" onClick={loadSystems} loading={loading.systems}>
            重新加载系统
          </Button>
          <Button onClick={clearDebugInfo}>
            清空调试信息
          </Button>
        </Space>
      </Card>

      <Card title="选择器" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Form layout="vertical">
            <Space direction="horizontal" size="middle" style={{ width: '100%' }}>
              <Form.Item label="系统" style={{ flex: 1, minWidth: 200 }}>
                <Select
                  placeholder="请选择系统"
                  value={selectedSystem}
                  onChange={handleSystemChange}
                  loading={loading.systems}
                  style={{ width: '100%' }}
                >
                  {systems.map(system => (
                    <Option key={system.id} value={system.id}>
                      {system.name} (ID: {system.id})
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item label="功能模块" style={{ flex: 1, minWidth: 200 }}>
                <Select
                  placeholder={selectedSystem ? "请选择功能模块" : "请先选择系统"}
                  value={selectedModule}
                  onChange={handleModuleChange}
                  loading={loading.modules}
                  disabled={!selectedSystem || modules.length === 0}
                  style={{ width: '100%' }}
                >
                  {modules.map(module => (
                    <Option key={module.id} value={module.id}>
                      {module.name} (ID: {module.id})
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item label="功能场景" style={{ flex: 1, minWidth: 200 }}>
                <Select
                  placeholder={selectedModule ? "请选择功能场景" : "请先选择功能模块"}
                  value={selectedScenario}
                  onChange={handleScenarioChange}
                  loading={loading.scenarios}
                  disabled={!selectedModule || loading.scenarios}
                  style={{ width: '100%' }}
                >
                  {scenarios.map(scenario => (
                    <Option key={scenario.id} value={scenario.id}>
                      {scenario.name} (ID: {scenario.id})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Space>
          </Form>
        </Space>
      </Card>

      {errors.length > 0 && (
        <Card title="错误信息" style={{ marginBottom: 16 }}>
          {errors.map((error, index) => (
            <Alert
              key={index}
              message={error}
              type="error"
              style={{ marginBottom: 8 }}
            />
          ))}
        </Card>
      )}

      <Card title="调试信息">
        <div style={{ 
          maxHeight: '400px', 
          overflow: 'auto', 
          background: '#f5f5f5', 
          padding: '10px',
          fontFamily: 'monospace',
          fontSize: '12px'
        }}>
          {debugInfo.length === 0 ? (
            <div style={{ color: '#999' }}>暂无调试信息</div>
          ) : (
            debugInfo.map((info, index) => (
              <div key={index} style={{ marginBottom: 4 }}>
                {info}
              </div>
            ))
          )}
        </div>
      </Card>

      <Card title="数据状态" style={{ marginTop: 16 }}>
        <Space direction="vertical">
          <div>系统数量: {systems.length}</div>
          <div>模块数量: {modules.length}</div>
          <div>场景数量: {scenarios.length}</div>
        </Space>
      </Card>
    </div>
  );
};

export default DetailedSystemSelectorDebug;