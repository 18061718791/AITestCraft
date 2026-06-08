import React, { useState } from 'react';
import { Upload, Button, message, Progress, Radio, Space, Typography } from 'antd';
import { UploadOutlined, FileTextOutlined } from '@ant-design/icons';
import { useAppContext } from '../contexts/AppContext';
import { useProcessingLogs } from '../hooks/useProcessingLogs';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';

const { Text } = Typography;

interface Chapter {
  id: string;
  title: string;
  level: number;
  children?: Chapter[];
}

interface DocumentUploaderProps {
  onUploadSuccess?: (documentId: string, chapters: Chapter[]) => void;
}

const DocumentUploader: React.FC<DocumentUploaderProps> = ({ onUploadSuccess }) => {
  const { state, dispatch } = useAppContext();
  const processing = useProcessingLogs();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isParsing, setIsParsing] = useState(false);

  const handleParseModeChange = (e: any) => {
    dispatch({ type: 'SET_PARSE_MODE', payload: e.target.value });
  };

  const props: UploadProps = {
    name: 'file',
    action: '/api/document/upload',
    headers: {
      authorization: 'authorization-text',
    },
    fileList,
    accept: '.pdf,.docx,.doc,.md,.txt',
    data: () => ({
      sessionId: state.sessionId || undefined,
    }),
    beforeUpload: (file) => {
      const allowedTypes = ['.pdf', '.docx', '.doc', '.md', '.txt'];
      const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
      if (!allowedTypes.includes(ext)) {
        message.error('不支持的文件格式，请上传 PDF、Word 或 Markdown 文件');
        return Upload.LIST_IGNORE;
      }
      if (file.size > 10 * 1024 * 1024) {
        message.error('文件大小不能超过 10MB');
        return Upload.LIST_IGNORE;
      }
      // 清空之前的处理日志，开始新的文档解析流程
      processing.clearLogs();
      processing.startProcessing('文档上传与解析');
      return true;
    },
    onChange: (info) => {
      setFileList(info.fileList.slice(-1)); // 只保留最后一个文件

      if (info.file.status === 'uploading') {
        setUploadProgress(info.file.percent || 0);
      }

      if (info.file.status === 'done') {
        setUploadProgress(100);
        const response = info.file.response;
        if (response.success) {
          message.success(`${info.file.name} 上传并解析成功`);
          
          // 保存文档信息到状态
          dispatch({
            type: 'SET_CURRENT_DOCUMENT',
            payload: {
              documentId: response.data.documentId,
              filename: response.data.filename,
              originalName: response.data.originalName,
              size: response.data.size,
              title: response.data.title,
              totalWordCount: response.data.totalWordCount,
              chapters: response.data.chapters,
              message: response.data.message,
            },
          });

          // 使用后端返回的真实章节数据
          const chapters: Chapter[] = response.data.chapters || [];
          
          if (chapters.length === 0) {
            message.warning('文档未识别到章节结构，将使用全文生成');
            dispatch({ type: 'SET_PARSE_MODE', payload: 'full' });
          }

          onUploadSuccess?.(response.data.documentId, chapters);
        } else {
          message.error(response.error?.message || '上传失败');
        }
        setIsParsing(false);
      } else if (info.file.status === 'error') {
        message.error(`${info.file.name} 上传失败`);
        setUploadProgress(0);
        setIsParsing(false);
      } else if (info.file.status === 'uploading') {
        setIsParsing(true);
      }
    },
    onRemove: () => {
      dispatch({ type: 'CLEAR_DOCUMENT' });
      setUploadProgress(0);
      setIsParsing(false);
      return true;
    },
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <div>
        <Text type="secondary">选择解析模式：</Text>
        <Radio.Group 
          value={state.parseMode} 
          onChange={handleParseModeChange}
          style={{ marginLeft: 8 }}
        >
          <Radio value="full">全文解析</Radio>
          <Radio value="chapters">指定章节</Radio>
        </Radio.Group>
      </div>

      <Upload {...props}>
        <Button icon={<UploadOutlined />} loading={isParsing}>
          {state.currentDocument ? '重新上传' : '点击上传文档'}
        </Button>
      </Upload>

      {uploadProgress > 0 && uploadProgress < 100 && (
        <Progress percent={uploadProgress} size="small" />
      )}

      {isParsing && (
        <Text type="secondary" style={{ fontSize: 12 }}>
          正在解析文档章节结构，请稍候...
        </Text>
      )}

      {state.currentDocument && (
        <div style={{
          marginTop: 8,
          padding: 8,
          background: 'var(--bg-secondary)',
          borderRadius: 4,
          border: '1px solid var(--border-color)'
        }}>
          <Space>
            <FileTextOutlined style={{ color: 'var(--success-color)' }} />
            <Text strong style={{ color: 'var(--text-primary)' }}>{state.currentDocument.originalName}</Text>
            <Text style={{ color: 'var(--text-secondary)' }}>
              ({(state.currentDocument.size / 1024).toFixed(1)} KB)
            </Text>
          </Space>
        </div>
      )}

      <Text type="secondary" style={{ fontSize: 12 }}>
        支持格式：PDF、Word (.doc/.docx)、Markdown、TXT，最大 10MB
      </Text>
    </Space>
  );
};

export default DocumentUploader;
