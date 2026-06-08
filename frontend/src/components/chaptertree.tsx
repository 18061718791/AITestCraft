import React, { useState, useEffect } from 'react';
import { Tree, Button, Space, Card, Typography, Radio, Alert, Tag } from 'antd';
import { FileTextOutlined, BookOutlined, FolderOutlined, FileOutlined } from '@ant-design/icons';
import { useAppContext } from '../contexts/AppContext';
import type { DataNode } from 'antd/es/tree';

const { Text } = Typography;

interface Chapter {
  id: string;
  title: string;
  level: number;
  children?: Chapter[];
}

interface ChapterTreeProps {
  chapters?: Chapter[];
  onGeneratePoints?: () => void;
  isGenerating?: boolean;
}

const ChapterTree: React.FC<ChapterTreeProps> = ({ 
  chapters: propChapters, 
  onGeneratePoints, 
  isGenerating 
}) => {
  const { state, dispatch } = useAppContext();
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [checkedKeys, setCheckedKeys] = useState<string[]>([]);
  const [localChapters, setLocalChapters] = useState<Chapter[]>([]);

  // 使用传入的章节或默认章节
  useEffect(() => {
    if (propChapters && propChapters.length > 0) {
      setLocalChapters(propChapters);
      // 默认展开所有章节
      const allKeys = getAllKeys(propChapters);
      setExpandedKeys(allKeys);
    }
  }, [propChapters]);

  // 同步选中的章节到全局状态
  useEffect(() => {
    dispatch({ type: 'SET_SELECTED_CHAPTERS', payload: checkedKeys });
  }, [checkedKeys, dispatch]);

  const getAllKeys = (chapters: Chapter[]): string[] => {
    const keys: string[] = [];
    chapters.forEach(chapter => {
      keys.push(chapter.id);
      if (chapter.children) {
        keys.push(...getAllKeys(chapter.children));
      }
    });
    return keys;
  };

  // 递归转换章节为树形数据，保持层级结构
  const convertToTreeData = (chapters: Chapter[]): DataNode[] => {
    return chapters.map(chapter => {
      const hasChildren = chapter.children && chapter.children.length > 0;
      
      return {
        key: chapter.id,
        title: (
          <Space>
            {hasChildren ? <FolderOutlined style={{ color: '#1890ff' }} /> : <FileOutlined style={{ color: '#52c41a' }} />}
            <Text style={{ 
              fontWeight: chapter.level === 1 ? 'bold' : chapter.level === 2 ? 500 : 'normal',
              fontSize: chapter.level === 1 ? 14 : chapter.level === 2 ? 13 : 12,
            }}>
              {chapter.title}
            </Text>
            <Tag color={chapter.level === 1 ? 'blue' : chapter.level === 2 ? 'green' : 'default'}>
              {chapter.level === 1 ? '一级' : chapter.level === 2 ? '二级' : '三级+'}
            </Tag>
          </Space>
        ),
        children: hasChildren ? convertToTreeData(chapter.children!) : undefined,
        selectable: false,
      };
    });
  };

  const handleCheck = (checked: any) => {
    setCheckedKeys(checked as string[]);
    
    // 显示选中的章节名称
    const selectedTitles: string[] = [];
    const findTitles = (chapters: Chapter[], ids: string[]) => {
      chapters.forEach(chapter => {
        if (ids.includes(chapter.id)) {
          selectedTitles.push(chapter.title);
        }
        if (chapter.children) {
          findTitles(chapter.children, ids);
        }
      });
    };
    findTitles(localChapters, checked as string[]);
    
    if (selectedTitles.length > 0) {
      console.log('选中的章节:', selectedTitles);
    }
  };

  const handleExpand = (expanded: any) => {
    setExpandedKeys(expanded as string[]);
  };

  const handleParseModeChange = (e: any) => {
    dispatch({ type: 'SET_PARSE_MODE', payload: e.target.value });
    if (e.target.value === 'full') {
      setCheckedKeys([]);
    }
  };

  const treeData = convertToTreeData(localChapters);
  const hasChapters = localChapters.length > 0;

  // 获取选中的章节标题
  const getSelectedChapterTitles = (): string[] => {
    const titles: string[] = [];
    const findTitles = (chapters: Chapter[], ids: string[]) => {
      chapters.forEach(chapter => {
        if (ids.includes(chapter.id)) {
          titles.push(chapter.title);
        }
        if (chapter.children) {
          findTitles(chapter.children, ids);
        }
      });
    };
    findTitles(localChapters, checkedKeys);
    return titles;
  };

  const selectedTitles = getSelectedChapterTitles();

  return (
    <Card 
      title={
        <Space>
          <BookOutlined />
          <span>文档章节结构</span>
          {hasChapters && (
            <Tag color="blue">共 {localChapters.length} 个一级章节</Tag>
          )}
        </Space>
      }
      style={{ marginTop: 16 }}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        {/* 解析模式选择 */}
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">生成测试点范围：</Text>
          <Radio.Group 
            value={state.parseMode} 
            onChange={handleParseModeChange}
            style={{ marginLeft: 8 }}
          >
            <Radio value="full">全文生成</Radio>
            <Radio value="chapters">指定章节</Radio>
          </Radio.Group>
        </div>

        {state.parseMode === 'chapters' && (
          <Alert
            message="请选择要生成测试点的章节"
            description={
              <div>
                <div>勾选左侧复选框选择章节，支持多选</div>
                <div style={{ marginTop: 4, color: '#1890ff' }}>
                  <FolderOutlined /> 文件夹图标表示有子章节
                  <FileOutlined style={{ marginLeft: 12 }} /> 文件图标表示叶子章节
                </div>
              </div>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {hasChapters ? (
          <>
            {state.parseMode === 'chapters' && (
              <div style={{
                background: 'var(--bg-secondary)',
                padding: 12,
                borderRadius: 4,
                maxHeight: 400,
                overflow: 'auto',
                border: '1px solid var(--border-color)'
              }}>
                <Tree
                  checkable
                  checkedKeys={checkedKeys}
                  expandedKeys={expandedKeys}
                  onCheck={handleCheck}
                  onExpand={handleExpand}
                  treeData={treeData}
                  defaultExpandAll
                />
              </div>
            )}

            {state.parseMode === 'chapters' && selectedTitles.length > 0 && (
              <div style={{
                background: 'var(--bg-secondary)',
                padding: 12,
                borderRadius: 4,
                border: '1px solid var(--border-color)'
              }}>
                <Text strong style={{ color: 'var(--primary-color)' }}>
                  已选择 {selectedTitles.length} 个章节：
                </Text>
                <div style={{ marginTop: 8 }}>
                  {selectedTitles.map((title, index) => (
                    <Tag key={index} color="blue" style={{ marginBottom: 4 }}>
                      {title}
                    </Tag>
                  ))}
                </div>
              </div>
            )}

            {state.parseMode === 'full' && (
              <div style={{
                background: 'var(--bg-secondary)',
                padding: 16,
                borderRadius: 4,
                border: '1px solid var(--border-color)'
              }}>
                <Space>
                  <FileTextOutlined style={{ color: 'var(--success-color)' }} />
                  <Text style={{ color: 'var(--text-primary)' }}>将基于全文内容生成测试点</Text>
                  <Tag color="green">预计字数：{state.currentDocument?.size ? Math.round(state.currentDocument.size / 3) : '未知'}</Tag>
                </Space>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16, marginBottom: 12 }}>
              <Button
                type="primary"
                icon={<FileTextOutlined />}
                loading={isGenerating}
                onClick={onGeneratePoints}
                disabled={state.parseMode === 'chapters' && checkedKeys.length === 0}
                size="large"
                style={{ width: '80%', maxWidth: 420 }}
              >
                {state.parseMode === 'full' 
                  ? '基于全文生成测试点' 
                  : `基于选中章节生成测试点 (${checkedKeys.length}个章节)`}
              </Button>
            </div>
          </>
        ) : (
          <Alert
            message="暂无章节数据"
            description="请上传文档后系统将自动解析章节结构"
            type="warning"
            showIcon
          />
        )}
      </Space>
    </Card>
  );
};

export default ChapterTree;
