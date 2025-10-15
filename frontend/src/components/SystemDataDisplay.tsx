import React, { useState, useEffect } from 'react';
import { Card, Select, Button, Space, Alert, Typography } from 'antd';
import { systemApi } from '../services/systemApi';

const { Text } = Typography;
const { Option } = Select;

const SystemDataDisplay: React.FC = () => {
  const [systems, setSystems] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [scenarios, setScenarios] = useState<any[]>([]);
  
  const [loading, setLoading] = useState({
    systems: false,
    modules: false,
    scenarios: false
  });
  
  const [error, setError] = useState<string | null>(null);
  const [selectedSystem, setSelectedSystem] = useState<number | null>(null);
  const [selectedModule, setSelectedModule] = useState<number | null>(null);

  const loadSystems = async () => {
    try {
      setLoading(prev => ({ ...prev, systems: true }));
      setError(null);
      
      const data = await systemApi.getSystems();
      
      setSystems(data);
      
      if (data.length === 0) {
        setError('没有找到系统数据');
      }
    } catch (error: any) {
      console.error('加载系统数据失败:', error);
      setError(`加载系统数据失败: ${error.message || '未知错误'}`);
    } finally {
      setLoading(prev => ({ ...prev, systems: false }));
    }
  };

  const loadModules = async (systemId: number) => {
    try {
      setLoading(prev => ({ ...prev, modules: true }));
      
      const data = await systemApi.getModules(systemId);
      
      setModules(data);
    } catch (error: any) {
      console.error('加载模块数据失败:', error);
      setError(`加载模块数据失败: ${error.message || '未知错误'}`);
    } finally {
      setLoading(prev => ({ ...prev, modules: false }));
    }
  };

  const loadScenarios = async (moduleId: number) => {
    try {
      setLoading(prev => ({ ...prev, scenarios: true }));
      
      const data = await systemApi.getScenarios(moduleId);
      
      setScenarios(data);
    } catch (error: any) {
      console.error('加载场景数据失败:', error);
      setError(`加载场景数据失败: ${error.message || '未知错误'}`);
    } finally {
      setLoading(prev => ({ ...prev, scenarios: false }));
    }
  };

  useEffect(() => {
    loadSystems();
  }, []);

  const handleSystemChange = (systemId: number) => {
    setSelectedSystem(systemId);
    setSelectedModule(null);
    setModules([]);
    setScenarios([]);
    loadModules(systemId);
  };

  const handleModuleChange = (moduleId: number) => {
    setSelectedModule(moduleId);
    setScenarios([]);
    loadScenarios(moduleId);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px' }}>
      <Card title="系统数据测试" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button onClick={loadSystems} loading={loading.systems}>
            重新加载系统
          </Button>
          
          {error && (
            <Alert message="错误" description={error} type="error" />
          )}
          
          <div>
            <h4>系统 ({systems.length}个):</h4>
            <Select
              placeholder="请选择系统"
              value={selectedSystem || undefined}
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
          </div>

          {selectedSystem && (
            <div>
              <h4>模块 ({modules.length}个):</h4>
              <Select
                placeholder="请选择模块"
                value={selectedModule || undefined}
                onChange={handleModuleChange}
                loading={loading.modules}
                style={{ width: '100%' }}
              >
                {modules.map(module => (
                  <Option key={module.id} value={module.id}>
                    {module.name} (ID: {module.id})
                  </Option>
                ))}
              </Select>
            </div>
          )}

          {selectedModule && (
            <div>
              <h4>场景 ({scenarios.length}个):</h4>
              <Select
                placeholder="请选择场景"
                style={{ width: '100%' }}
                loading={loading.scenarios}
              >
                {scenarios.map(scenario => (
                  <Option key={scenario.id} value={scenario.id}>
                    {scenario.name} (ID: {scenario.id})
                  </Option>
                ))}
              </Select>
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <h4>数据详情:</h4>
            <div>
              <Text strong>系统数据:</Text>
              <pre style={{ background: '#f5f5f5', padding: '10px', fontSize: '12px', maxHeight: '200px', overflow: 'auto' }}>
                {JSON.stringify(systems, null, 2)}
              </pre>
            </div>
            
            {modules.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <Text strong>模块数据:</Text>
                <pre style={{ background: '#f5f5f5', padding: '10px', fontSize: '12px', maxHeight: '200px', overflow: 'auto' }}>
                  {JSON.stringify(modules, null, 2)}
                </pre>
              </div>
            )}
            
            {scenarios.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <Text strong>场景数据:</Text>
                <pre style={{ background: '#f5f5f5', padding: '10px', fontSize: '12px', maxHeight: '200px', overflow: 'auto' }}>
                  {JSON.stringify(scenarios, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default SystemDataDisplay;