import React, { useState, useMemo } from 'react';
import { Card, Checkbox, Button, Space, Typography, Alert, Input, Progress, Tag, Collapse, Select } from 'antd';
import { ArrowLeftOutlined, ArrowRightOutlined, PlusOutlined, DownloadOutlined } from '@ant-design/icons';
import { useGenerateCases } from '../hooks/useGenerateCases';
import { useAppContext } from '../contexts/AppContext';
import { useTheme } from '../contexts/ThemeContext';
import BreadcrumbDisplay from './BreadcrumbDisplay';
import { TestPoint } from '../types';
import MindMapModal from './MindMapModal';

const { Title, Text } = Typography;
const { Panel } = Collapse;

const DESIGN_METHODS = [
  '等价类划分',
  '边界值分析',
  '场景法',
  '错误推测法',
  '因果图法',
  '判定表驱动法',
  '正交试验法',
  '功能分解法',
  '状态迁移法',
  '探索式测试',
];

interface TreeNode {
  key: string;
  name: string;
  type: 'category' | 'subcategory';
  count: number;
  selectedCount: number;
  testPoints: TestPoint[];
  children?: TreeNode[];
}

function buildCategoryTree(testPoints: TestPoint[], showDesignMethod: boolean = true): TreeNode[] {
  const categoryMap = new Map<string, Map<string, TestPoint[]>>();
  for (let i = 0; i < testPoints.length; i++) {
    const point = { ...testPoints[i], _index: i };
    const cat = point.pointCategory || '其他功能';
    const method = showDesignMethod ? (point.designMethod || '其他方法') : '';
    if (!categoryMap.has(cat)) categoryMap.set(cat, new Map());
    const methodMap = categoryMap.get(cat)!;
    if (!methodMap.has(method)) methodMap.set(method, []);
    methodMap.get(method)!.push(point);
  }

  const nodes: TreeNode[] = [];
  let catIdx = 0;
  for (const [catName, methodMap] of categoryMap) {
    const children: TreeNode[] = [];
    let subIdx = 0;
    let catTotal = 0;
    let catSelected = 0;
    for (const [methodName, points] of methodMap) {
      const selectedCount = points.filter((p) => p.selected).length;
      children.push({
        key: `subcat-${catIdx}-${subIdx}`,
        name: methodName,
        type: 'subcategory',
        count: points.length,
        selectedCount,
        testPoints: points,
      });
      catTotal += points.length;
      catSelected += selectedCount;
      subIdx++;
    }
    nodes.push({
      key: `cat-${catIdx}`,
      name: catName,
      type: 'category',
      count: catTotal,
      selectedCount: catSelected,
      testPoints: [],
      children,
    });
    catIdx++;
  }
  return nodes;
}

interface TestPointsSelectorProps {
  onNext?: () => void;
  onBack?: () => void;
}

export const TestPointsSelector: React.FC<TestPointsSelectorProps> = ({ onNext, onBack }) => {
  const { state, dispatch } = useAppContext();
  const { isDark } = useTheme();
  const { generateCases, loading, progress, progressMessage } = useGenerateCases();
  const [mindMapVisible, setMindMapVisible] = useState(false);

  const primaryColor = isDark ? '#00d4ff' : '#3b82f6';
  const treeData = useMemo(() => buildCategoryTree(state.testPoints, state.showDesignMethod), [state.testPoints, state.showDesignMethod]);
  const totalCount = state.testPoints.length;
  const selectedCount = state.testPoints.filter((p) => p.selected).length;

  const handleGenerate = async () => {
    const selectedPoints = state.testPoints.filter((point) => point.selected);
    if (selectedPoints.length === 0) {
      dispatch({ type: 'SET_ERROR', payload: '请至少选择一个测试点' });
      return;
    }
    dispatch({ type: 'SET_ERROR', payload: null });
    const selectedPointContents = selectedPoints.map((point) => point.content);
    dispatch({ type: 'SET_SELECTED_TEST_POINTS', payload: selectedPointContents });
    await generateCases(selectedPointContents);
    onNext?.();
  };

  const handleTogglePoint = (pointId: string) => {
    const updatedPoints = state.testPoints.map((point) =>
      point.id === pointId ? { ...point, selected: !point.selected } : point
    );
    dispatch({ type: 'SET_TEST_POINTS', payload: updatedPoints });
  };

  const handleToggleAll = () => {
    const allSelected = state.testPoints.every((point) => point.selected);
    const updatedPoints = state.testPoints.map((point) => ({ ...point, selected: !allSelected }));
    dispatch({ type: 'SET_TEST_POINTS', payload: updatedPoints });
  };

  const handleToggleCategory = (node: TreeNode, selected: boolean) => {
    const collectIds = (n: TreeNode): string[] => {
      const ids: string[] = [];
      for (const child of n.children || []) {
        for (const p of child.testPoints) ids.push(p.id);
      }
      return ids;
    };
    const targetIds = new Set(collectIds(node));
    const updatedPoints = state.testPoints.map((point) =>
      targetIds.has(point.id) ? { ...point, selected } : point
    );
    dispatch({ type: 'SET_TEST_POINTS', payload: updatedPoints });
  };

  const handleToggleSubCategory = (subNode: TreeNode, selected: boolean) => {
    const targetIds = new Set(subNode.testPoints.map((p) => p.id));
    const updatedPoints = state.testPoints.map((point) =>
      targetIds.has(point.id) ? { ...point, selected } : point
    );
    dispatch({ type: 'SET_TEST_POINTS', payload: updatedPoints });
  };

  const handleAddPointToSubCategory = (pointCategory: string, designMethod: string) => {
    const newPoint: TestPoint = {
      id: `custom-${Date.now()}`,
      content: '',
      selected: true,
      isCustom: true,
      isEditing: true,
      designMethod,
      pointCategory,
    };
    dispatch({ type: 'ADD_CUSTOM_TEST_POINT', payload: newPoint });
  };

  const handleChangeDesignMethod = (pointId: string, designMethod: string) => {
    const updatedPoints = state.testPoints.map((point) =>
      point.id === pointId ? { ...point, designMethod } : point
    );
    dispatch({ type: 'SET_TEST_POINTS', payload: updatedPoints });
  };

  const handleEditPoint = (pointId: string, content: string) => {
    const index = state.testPoints.findIndex((p) => p.id === pointId);
    if (index >= 0) {
      dispatch({ type: 'UPDATE_TEST_POINT', payload: { index, content } });
    }
  };

  const handleStartEdit = (pointId: string) => {
    const updatedPoints = state.testPoints.map((point) =>
      point.id === pointId ? { ...point, isEditing: true } : point
    );
    dispatch({ type: 'SET_TEST_POINTS', payload: updatedPoints });
  };

  const shouldShowBreadcrumb = state.selectedSystem && state.selectedModule;

  const renderPointRow = (point: TestPoint) => (
    <div
      key={point.id}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '5px 8px',
        borderBottom: `1px solid ${isDark ? '#1e293b' : '#f1f5f9'}`,
        gap: 8,
      }}
    >
      <Checkbox
        checked={point.selected}
        onChange={() => handleTogglePoint(point.id)}
      />
      <span style={{ flex: 1, fontSize: 13, color: isDark ? '#cbd5e1' : '#334155' }}>
        {point.isEditing ? (
          <Input
            defaultValue={point.content}
            autoFocus
            size="small"
            onPressEnter={(e) => handleEditPoint(point.id, e.currentTarget.value)}
            onBlur={(e) => handleEditPoint(point.id, e.currentTarget.value)}
            placeholder="请输入自定义测试点"
          />
        ) : (
          <>
            <span>{point.content}</span>
            {point.isCustom && (
              <Button
                type="link"
                size="small"
                onClick={() => handleStartEdit(point.id)}
                style={{ marginLeft: 8, padding: 0, color: primaryColor }}
              >
                编辑
              </Button>
            )}
          </>
        )}
      </span>
      {point.isCustom && (
        <Select
          size="small"
          style={{ width: 120, flexShrink: 0 }}
          value={point.designMethod || '等价类划分'}
          onChange={(value) => handleChangeDesignMethod(point.id, value)}
          dropdownStyle={{ zIndex: 2000 }}
        >
          {DESIGN_METHODS.map((method) => (
            <Select.Option key={method} value={method}>
              {method}
            </Select.Option>
          ))}
        </Select>
      )}
    </div>
  );

  const renderSubCategory = (subNode: TreeNode, parentCategoryName: string) => {
    const allSelected = subNode.testPoints.every((p) => p.selected);
    const indeterminate = subNode.testPoints.some((p) => p.selected) && !allSelected;
    // 当隐藏设计方法时，子分类名称为空，不渲染标题栏，直接显示测试点
    if (!state.showDesignMethod && !subNode.name) {
      return (
        <div key={subNode.key}>
          {subNode.testPoints.map((point) => renderPointRow(point))}
        </div>
      );
    }
    return (
      <div key={subNode.key}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '6px 12px',
            background: isDark ? 'rgba(0, 212, 255, 0.06)' : '#eff6ff',
            borderRadius: 6,
            marginBottom: 4,
            border: isDark ? `1px solid ${primaryColor}15` : undefined,
          }}
        >
          <Checkbox
            checked={allSelected}
            indeterminate={indeterminate}
            onChange={() => handleToggleSubCategory(subNode, !allSelected)}
          >
            <Text strong style={{ fontSize: 13, color: isDark ? '#e2e8f0' : '#1e293b' }}>
              {subNode.name}（{subNode.count} 个）
            </Text>
          </Checkbox>
          <Button
            type="primary"
            size="small"
            ghost
            icon={<PlusOutlined />}
            style={{ marginLeft: 'auto', fontSize: 12 }}
            onClick={(e) => {
              e.stopPropagation();
              handleAddPointToSubCategory(parentCategoryName, subNode.name);
            }}
          >
            新增
          </Button>
        </div>
        <div style={{ paddingLeft: 24 }}>
          {subNode.testPoints.map((point) => renderPointRow(point))}
        </div>
      </div>
    );
  };

  const renderCategory = (node: TreeNode) => {
    const allSelected = node.children!.every((child) =>
      child.testPoints.every((p) => p.selected)
    );
    const indeterminate =
      node.children!.some((child) => child.testPoints.some((p) => p.selected)) && !allSelected;

    const header = (
      <div style={{ display: 'flex', alignItems: 'center', width: '100%' }} onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={allSelected}
          indeterminate={indeterminate}
          onChange={() => handleToggleCategory(node, !allSelected)}
          style={{ marginRight: 8 }}
        >
          <Text strong style={{ fontSize: 14, color: isDark ? '#f1f5f9' : '#0f172a' }}>
            {node.name}
          </Text>
        </Checkbox>
        <Tag style={{ marginLeft: 8, background: isDark ? `${primaryColor}15` : undefined, borderColor: isDark ? `${primaryColor}30` : undefined, color: isDark ? primaryColor : undefined }}>
          {node.count} 个测试点
        </Tag>
        {/* 隐藏方法时，在场景标题右边显示新增按钮 */}
        {!state.showDesignMethod && (
          <Button
            type="primary"
            size="small"
            ghost
            icon={<PlusOutlined />}
            style={{ marginLeft: 'auto', fontSize: 12 }}
            onClick={(e) => {
              e.stopPropagation();
              // 隐藏方法时，使用第一个子分类的设计方法，或默认方法
              const firstChild = node.children?.[0];
              handleAddPointToSubCategory(node.name, firstChild?.name || '等价类划分');
            }}
          >
            新增
          </Button>
        )}
      </div>
    );

    return (
      <Panel key={node.key} header={header}>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          {node.children!.map((child) => renderSubCategory(child, node.name))}
        </Space>
      </Panel>
    );
  };

  return (
    <Card
      title={
        <span style={{ color: isDark ? '#f1f5f9' : 'inherit' }}>
          步骤 2：选择测试点
        </span>
      }
      style={{
        width: '100%',
        height: '100%',
        background: isDark ? 'transparent' : undefined,
        border: 'none',
        boxShadow: 'none',
      }}
      bodyStyle={{ height: 'calc(100% - 57px)', overflow: 'auto', padding: '16px 12px' }}
    >
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        {shouldShowBreadcrumb && (
          <BreadcrumbDisplay
            system={state.selectedSystem?.name}
            module={state.selectedModule?.name}
            scenario={state.selectedScenario?.name}
          />
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={5} style={{ marginBottom: 8, fontSize: 15, color: isDark ? '#e2e8f0' : '#1e293b' }}>
            请选择要生成测试用例的测试点
          </Title>
          <Space>
            <Button
              size="small"
              onClick={() => dispatch({ type: 'SET_SHOW_DESIGN_METHOD', payload: !state.showDesignMethod })}
              style={{
                fontSize: 12,
                height: 24,
                padding: '0 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 4,
              }}
            >
              {state.showDesignMethod ? '隐藏方法' : '显示方法'}
            </Button>
            <Button
              icon={<DownloadOutlined />}
              size="small"
              onClick={() => setMindMapVisible(true)}
              disabled={state.testPoints.length === 0}
            >
              思维导图
            </Button>
          </Space>
        </div>

        {state.error && (
          <Alert
            message="错误"
            description={state.error}
            type="error"
            showIcon
            closable
            onClose={() => dispatch({ type: 'SET_ERROR', payload: null })}
          />
        )}

        {state.isVisionFallback && (
          <Alert
            message="图片解析回退提醒"
            description="您上传的图片未能被当前AI模型正确识别和解析，当前测试点仅基于您输入的需求文本生成，未包含图片内容分析。建议切换到其他支持视觉的模型后重试，或继续使用纯文本模式生成测试点。"
            type="warning"
            showIcon
            closable
            onClose={() => dispatch({ type: 'SET_VISION_FALLBACK', payload: false })}
          />
        )}

        {loading && (
          <Card size="small" style={{
            backgroundColor: isDark ? 'rgba(0, 255, 136, 0.06)' : '#f6ffed',
            borderColor: isDark ? 'rgba(0, 255, 136, 0.2)' : '#b7eb8f',
          }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong style={{ color: isDark ? '#00ff88' : '#52c41a' }}>
                {progressMessage || '正在生成测试用例...'}
              </Text>
              <Progress
                percent={progress}
                status="active"
                strokeColor={isDark ? { from: primaryColor, to: '#00ff88' } : { from: '#108ee9', to: '#87d068' }}
              />
              <Text type="secondary" style={{ fontSize: 12, color: isDark ? '#64748b' : undefined }}>
                已选择 {selectedCount} 个测试点，正在分批处理中...
              </Text>
            </Space>
          </Card>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Checkbox
            checked={totalCount > 0 && state.testPoints.every((point) => point.selected)}
            indeterminate={
              state.testPoints.some((point) => point.selected) &&
              !state.testPoints.every((point) => point.selected)
            }
            onChange={handleToggleAll}
          >
            <span style={{ color: isDark ? '#e2e8f0' : undefined }}>全选/取消全选</span>
          </Checkbox>
          <Text style={{ fontSize: 12, color: isDark ? '#64748b' : '#94a3b8' }}>
            共 {totalCount} 个 · 已选 {selectedCount} 个
          </Text>
        </div>

        <div style={{ maxHeight: 'calc(100vh - 520px)', overflow: 'auto' }}>
          {treeData.length > 0 ? (
            <Collapse
              defaultActiveKey={treeData.map((node) => node.key)}
              expandIconPosition="start"
            >
              {treeData.map((node) => renderCategory(node))}
            </Collapse>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: 32,
              color: isDark ? '#475569' : '#999',
              fontSize: 14,
            }}>
              暂无测试点，请先在步骤1中生成测试点
            </div>
          )}
        </div>

        <Space style={{ width: '100%', justifyContent: 'space-between', marginTop: 8, marginBottom: 12 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => {
              dispatch({ type: 'SET_CURRENT_STEP', payload: 1 });
              onBack?.();
            }}
          >
            返回
          </Button>
          <Button
            type="primary"
            icon={<ArrowRightOutlined />}
            loading={loading}
            onClick={handleGenerate}
            disabled={!state.testPoints.some((point) => point.selected)}
            style={{
              width: 200,
              boxShadow: isDark ? `0 0 16px ${primaryColor}40` : undefined,
            }}
          >
            生成测试用例
          </Button>
        </Space>
      </Space>

      <MindMapModal
        visible={mindMapVisible}
        treeData={treeData}
        onClose={() => setMindMapVisible(false)}
      />
    </Card>
  );
};

export default TestPointsSelector;
