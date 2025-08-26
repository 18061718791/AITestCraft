import React, { useState, useEffect } from 'react';
import { Select, Space, Form } from 'antd';
import { System, Module, Scenario } from '../types';
import { systemApi } from '../services/systemApi';
import { useAppContext } from '../contexts/AppContext';

const { Option } = Select;

interface SystemModuleScenarioSelectorProps {
  onSelectionChange?: (system?: System, module?: Module, scenario?: Scenario) => void;
}

const SystemModuleScenarioSelector: React.FC<SystemModuleScenarioSelectorProps> = ({
  onSelectionChange,
}) => {
  const { state, dispatch } = useAppContext();
  const [systems, setSystems] = useState<System[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState<{
    systems: boolean;
    modules: boolean;
    scenarios: boolean;
  }>({
    systems: false,
    modules: false,
    scenarios: false,
  });

  // 加载系统列表
  useEffect(() => {
    const loadSystems = async () => {
      try {
        setLoading(prev => ({ ...prev, systems: true }));
        const data = await systemApi.getSystems();
        setSystems(data);
      } catch (error) {
        console.error('Failed to load systems:', error);
      } finally {
        setLoading(prev => ({ ...prev, systems: false }));
      }
    };

    loadSystems();
  }, []);

  // 加载模块列表（当系统选择变化时）
  useEffect(() => {
    const loadModules = async () => {
      if (!state.selectedSystem) {
        setModules([]);
        setScenarios([]);
        return;
      }

      try {
        setLoading(prev => ({ ...prev, modules: true }));
        const data = await systemApi.getModules(state.selectedSystem.id);
        setModules(data);
      } catch (error) {
        console.error('Failed to load modules:', error);
      } finally {
        setLoading(prev => ({ ...prev, modules: false }));
      }
    };

    loadModules();
  }, [state.selectedSystem]);

  // 加载场景列表（当模块选择变化时）
  useEffect(() => {
    const loadScenarios = async () => {
      if (!state.selectedModule) {
        setScenarios([]);
        return;
      }

      try {
        setLoading(prev => ({ ...prev, scenarios: true }));
        const data = await systemApi.getScenarios(state.selectedModule.id);
        setScenarios(data);
      } catch (error) {
        console.error('Failed to load scenarios:', error);
      } finally {
        setLoading(prev => ({ ...prev, scenarios: false }));
      }
    };

    loadScenarios();
  }, [state.selectedModule]);

  const handleSystemChange = (systemId: number | undefined) => {
    const system = systems.find(s => s.id === systemId);
    dispatch({ type: 'SET_SELECTED_SYSTEM', payload: system ? { id: system.id, name: system.name } : null });
    dispatch({ type: 'SET_SELECTED_MODULE', payload: null });
    dispatch({ type: 'SET_SELECTED_SCENARIO', payload: null });
    
    if (onSelectionChange) {
      onSelectionChange(system, undefined, undefined);
    }
  };

  const handleModuleChange = (moduleId: number | undefined) => {
    const module = modules.find(m => m.id === moduleId);
    dispatch({ type: 'SET_SELECTED_MODULE', payload: module ? { id: module.id, name: module.name } : null });
    dispatch({ type: 'SET_SELECTED_SCENARIO', payload: null });
    
    if (onSelectionChange) {
      const selectedSystemObj = systems.find(s => s.id === state.selectedSystem?.id);
      onSelectionChange(selectedSystemObj, module, undefined);
    }
  };

  const handleScenarioChange = (scenarioId: number | undefined) => {
    const scenario = scenarios.find(s => s.id === scenarioId);
    dispatch({ type: 'SET_SELECTED_SCENARIO', payload: scenario ? { id: scenario.id, name: scenario.name } : null });
    
    if (onSelectionChange) {
      const selectedSystemObj = systems.find(s => s.id === state.selectedSystem?.id);
      const selectedModuleObj = modules.find(m => m.id === state.selectedModule?.id);
      onSelectionChange(selectedSystemObj, selectedModuleObj, scenario);
    }
  };

  return (
    <Form layout="vertical">
      <Space 
        direction="horizontal" 
        size="middle" 
        style={{ width: '100%' }}
        wrap={true}
      >
        <Form.Item label="系统" required style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
          <Select
            placeholder="请选择系统"
            value={state.selectedSystem?.id}
            onChange={handleSystemChange}
            loading={loading.systems}
            allowClear
            style={{ width: '100%' }}
          >
            {systems.map(system => (
              <Option key={system.id} value={system.id}>
                {system.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="功能模块" required={!!state.selectedSystem} style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
          <Select
            placeholder={state.selectedSystem ? "请选择功能模块" : "请先选择系统"}
            value={state.selectedModule?.id}
            onChange={handleModuleChange}
            loading={loading.modules}
            disabled={!state.selectedSystem || modules.length === 0}
            allowClear
            style={{ width: '100%' }}
          >
            {modules.map(module => (
              <Option key={module.id} value={module.id}>
                {module.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="功能场景" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
          <Select
            placeholder={
              loading.scenarios ? "加载中..." :
              !state.selectedModule ? "请先选择功能模块" :
              scenarios.length === 0 ? "该模块暂无功能场景" :
              "请选择功能场景（可选）"
            }
            value={state.selectedScenario?.id}
            onChange={handleScenarioChange}
            loading={loading.scenarios}
            disabled={!state.selectedModule || loading.scenarios}
            allowClear
            style={{ width: '100%' }}
          >
            {scenarios.length === 0 && !loading.scenarios ? (
              <Option value="empty" disabled style={{ color: '#999' }}>
                该模块暂无功能场景
              </Option>
            ) : (
              scenarios.map(scenario => (
                <Option key={scenario.id} value={scenario.id}>
                  {scenario.name}
                </Option>
              ))
            )}
          </Select>
        </Form.Item>
      </Space>
    </Form>
  );
};

export default SystemModuleScenarioSelector;