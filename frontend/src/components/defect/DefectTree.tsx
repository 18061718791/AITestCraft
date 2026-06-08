import React, { useState, useEffect } from 'react';
import { Tree, Spin, Alert } from 'antd';
import { FolderOutlined, FileOutlined, LoadingOutlined } from '@ant-design/icons';
import defectApi from '../../services/defect/defectApi';
import { DefectTreeNode } from '../../types/defect';

interface DefectTreeProps {
  onNodeSelect?: (nodeId: number) => void;
  onNodeNameChange?: (nodeName: string) => void;
  onTreeLoad?: (tree: DefectTreeNode) => void;
  selectedNodeId?: number;
}

const { TreeNode } = Tree;

const DefectTree: React.FC<DefectTreeProps> = ({ onNodeSelect, onNodeNameChange, onTreeLoad, selectedNodeId: propSelectedNodeId }) => {
  const [treeData, setTreeData] = useState<DefectTreeNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [nodeNames, setNodeNames] = useState<{ [key: number]: string }>({});

  useEffect(() => {
    fetchTreeData();
  }, []);

  // 监听propSelectedNodeId的变化，更新选中状态
  useEffect(() => {
    if (propSelectedNodeId) {
      setSelectedKeys([propSelectedNodeId.toString()]);
    }
  }, [propSelectedNodeId]);

  // 递归获取所有节点的ID，用于默认展开所有节点
  const getAllNodeIds = (node: DefectTreeNode): number[] => {
    let ids: number[] = [node.id];
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => {
        ids = [...ids, ...getAllNodeIds(child)];
      });
    }
    return ids;
  };

  const fetchTreeData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await defectApi.getTree();
      if (response.success && response.data) {
        setTreeData(response.data);
        // 默认展开所有节点
        const allIds = getAllNodeIds(response.data);
        setExpandedKeys(allIds.map(id => id.toString()));
        // 构建节点名称映射
        const buildNodeNames = (node: DefectTreeNode): { [key: number]: string } => {
          const names: { [key: number]: string } = {};
          names[node.id] = node.name;
          if (node.children && node.children.length > 0) {
            node.children.forEach(child => {
              const childNames = buildNodeNames(child);
              Object.assign(names, childNames);
            });
          }
          return names;
        };
        setNodeNames(buildNodeNames(response.data));
        // 通知父组件树已加载
        if (onTreeLoad) {
          onTreeLoad(response.data);
        }
      } else {
        setError(response.error || '获取目录树失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      console.error('Error fetching tree data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (selectedKeys: React.Key[], info: any) => {
    setSelectedKeys(selectedKeys);
    if (info.node && info.node.props && selectedKeys.length > 0) {
      // 确保将选中的key转换为数字类型
      const nodeIdStr = selectedKeys[0] as string;
      const nodeId = parseInt(nodeIdStr);
      // 通知父组件节点已选择
      if (onNodeSelect && !isNaN(nodeId)) {
        onNodeSelect(nodeId);
      }
      // 通知父组件节点名称已变化
      if (onNodeNameChange && !isNaN(nodeId) && nodeNames[nodeId]) {
        onNodeNameChange(nodeNames[nodeId]);
      }
    }
  };

  const handleExpand = (expandedKeys: React.Key[]) => {
    setExpandedKeys(expandedKeys);
  };

  const renderTreeNode = (node: DefectTreeNode) => {
    // 确保类型匹配，将node.id转换为字符串后再检查
    const isSelected = selectedKeys.includes(node.id.toString());
    const title = (
      <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>
          {node.children ? <FolderOutlined /> : <FileOutlined />}
          <span style={{ marginLeft: 8 }}>{node.name}</span>
        </span>
        {node.issueCount !== undefined && (
          <span style={{ fontSize: '12px', color: '#999' }}>
            ({node.issueCount})
          </span>
        )}
      </span>
    );

    if (node.children && node.children.length > 0) {
      return (
        <TreeNode key={node.id.toString()} title={title} selected={isSelected}>
          {node.children.map(child => renderTreeNode(child))}
        </TreeNode>
      );
    }

    return <TreeNode key={node.id.toString()} title={title} selected={isSelected} />;
  };

  if (loading) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <div style={{ marginBottom: 8 }}>加载目录树...</div>
        <Spin indicator={<LoadingOutlined spin />} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 20 }}>
        <Alert
          message="错误"
          description={error}
          type="error"
          showIcon
          action={
            <button
              onClick={fetchTreeData}
              style={{
                border: 'none',
                background: 'none',
                color: '#1890ff',
                cursor: 'pointer',
              }}
            >
              重试
            </button>
          }
        />
      </div>
    );
  }

  if (!treeData) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <Alert message="暂无目录数据" type="info" showIcon />
      </div>
    );
  }

  return (
    <div style={{ height: '100%' }}>
      <Tree
        onSelect={handleSelect}
        onExpand={handleExpand}
        expandedKeys={expandedKeys}
        selectedKeys={selectedKeys}
        showIcon
        style={{ width: '100%' }}
      >
        {renderTreeNode(treeData)}
      </Tree>
    </div>
  );
};

export default DefectTree;