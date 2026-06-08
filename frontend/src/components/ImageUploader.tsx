import React, { useState, useRef } from 'react';
import { Upload, Button, Image, Space, Tooltip, message } from 'antd';
import { UploadOutlined, DeleteOutlined, PictureOutlined, ClearOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd/es/upload/interface';
import { v4 as uuidv4 } from 'uuid';
import { useAppContext } from '../contexts/AppContext';
import { useTheme } from '../contexts/ThemeContext';

// 隐藏的文件输入组件，用于程序化触发文件选择
const HiddenFileInput: React.FC<{
  onFilesSelected: (files: FileList | null) => void;
  accept?: string;
  multiple?: boolean;
  children: (trigger: () => void) => React.ReactNode;
}> = ({ onFilesSelected, accept = '.png,.jpg,.jpeg,.gif,.webp', multiple = true, children }): React.ReactElement => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilesSelected(e.target.files);
    // 重置 input 值，允许重复选择相同文件
    e.target.value = '';
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      {children(triggerFileSelect)}
    </>
  );
};

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_IMAGES = 5;
const MAX_WIDTH = 1920;
const COMPRESS_QUALITY = 0.8;

function compressImage(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        let { width, height } = img;
        if (width <= MAX_WIDTH) {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) { reject(new Error('Canvas context not available')); return; }
          ctx.drawImage(img, 0, 0);
          const base64 = canvas.toDataURL(file.type).split(',')[1];
          resolve({ base64: base64 || '', mimeType: file.type });
          return;
        }
        const ratio = MAX_WIDTH / width;
        width = MAX_WIDTH;
        height = Math.round(height * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas context not available')); return; }
        ctx.drawImage(img, 0, 0, width, height);
        const mimeType = file.type === 'image/png' || file.type === 'image/gif' ? file.type : 'image/jpeg';
        const quality = mimeType === 'image/jpeg' ? COMPRESS_QUALITY : 1.0;
        const base64 = canvas.toDataURL(mimeType, quality).split(',')[1];
        resolve({ base64: base64 || '', mimeType });
      };
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

interface ImageUploaderProps {
  onImagesChange?: (count: number) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImagesChange }) => {
  const { state, dispatch } = useAppContext();
  const { isDark } = useTheme();
  const [isProcessing, setIsProcessing] = useState(false);
  const pasteContainerRef = useRef<HTMLDivElement>(null);

  const currentImages = state.uploadedImages;
  const primaryColor = isDark ? '#00d4ff' : '#3b82f6';
  const borderColor = isDark ? '#334155' : '#d9d9d9';
  const mutedTextColor = isDark ? '#64748b' : '#999';
  const bgColor = isDark ? '#1e293b' : '#fafafa';

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (currentImages.length + fileArray.length > MAX_IMAGES) {
      message.warning(`最多上传${MAX_IMAGES}张图片，当前已有${currentImages.length}张`);
      return;
    }
    const validFiles = fileArray.filter((file) => {
      const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
      const allowedExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
      if (!allowedExts.includes(ext) && !ALLOWED_TYPES.includes(file.type)) {
        message.error(`${file.name} 格式不支持，仅支持 PNG/JPG/GIF/WebP`);
        return false;
      }
      if (file.size > MAX_FILE_SIZE) {
        message.error(`${file.name} 超过5MB限制`);
        return false;
      }
      return true;
    });
    if (validFiles.length === 0) return;
    setIsProcessing(true);
    try {
      for (const file of validFiles) {
        const { base64, mimeType } = await compressImage(file);
        const id = uuidv4();
        const previewUrl = `data:${mimeType};base64,${base64}`;
        dispatch({
          type: 'ADD_UPLOADED_IMAGE',
          payload: { id, base64, mimeType, fileName: file.name, previewUrl },
        });
      }
      onImagesChange?.(currentImages.length + validFiles.length);
      message.success(`已添加 ${validFiles.length} 张图片`);
    } catch (error) {
      message.error('图片处理失败，请重试');
      console.error('Image processing error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const uploadProps: UploadProps = {
    name: 'image',
    multiple: true,
    accept: '.png,.jpg,.jpeg,.gif,.webp',
    showUploadList: false,
    beforeUpload: (file) => { handleFiles([file]); return false; },
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    if (imageFiles.length > 0) {
      e.preventDefault();
      handleFiles(imageFiles);
    }
  };

  const handleRemoveImage = (id: string) => {
    dispatch({ type: 'REMOVE_UPLOADED_IMAGE', payload: id });
    onImagesChange?.(currentImages.length - 1);
  };

  const handleClearAll = () => {
    dispatch({ type: 'CLEAR_UPLOADED_IMAGES' });
    onImagesChange?.(0);
  };

  return (
    <div ref={pasteContainerRef} tabIndex={0} onPaste={handlePaste} style={{ outline: 'none' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#64748b' }}>
            <PictureOutlined style={{ marginRight: 4 }} />
            上传截图（可选，支持拖拽或粘贴）
          </span>
          {currentImages.length > 0 && (
            <Button type="text" size="small" danger icon={<ClearOutlined />} onClick={handleClearAll}>
              清空
            </Button>
          )}
        </div>

        {currentImages.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 4 }}>
            {currentImages.map((img) => (
              <div
                key={img.id}
                style={{
                  position: 'relative',
                  width: 80, height: 80,
                  borderRadius: 4, overflow: 'hidden',
                  border: `1px solid ${borderColor}`,
                }}
              >
                <Image src={img.previewUrl} alt={img.fileName} width={80} height={80} style={{ objectFit: 'cover' }} preview={{ mask: null }} />
                <Tooltip title={img.fileName}>
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: 'rgba(0,0,0,0.5)', color: '#fff',
                    fontSize: 10, padding: '1px 4px',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {img.fileName}
                  </div>
                </Tooltip>
                <Tooltip title="删除">
                  <Button
                    type="text" size="small" danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleRemoveImage(img.id)}
                    style={{
                      position: 'absolute', top: 0, right: 0,
                      color: '#fff', background: 'rgba(0,0,0,0.4)',
                      border: 'none', borderRadius: '0 4px 0 4px',
                      padding: '0 4px', height: 20, minWidth: 20,
                    }}
                  />
                </Tooltip>
              </div>
            ))}
            {currentImages.length < MAX_IMAGES && (
              <Upload {...uploadProps} disabled={isProcessing}>
                <div style={{
                  width: 80, height: 80,
                  border: `1px dashed ${borderColor}`,
                  borderRadius: 4,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', background: bgColor,
                  transition: 'border-color 0.3s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = primaryColor; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = borderColor; }}
                >
                  <UploadOutlined style={{ fontSize: 18, color: mutedTextColor }} />
                  <span style={{ fontSize: 10, color: mutedTextColor, marginTop: 2 }}>
                    {currentImages.length}/{MAX_IMAGES}
                  </span>
                </div>
              </Upload>
            )}
          </div>
        )}

        {currentImages.length === 0 && (
          <HiddenFileInput
            onFilesSelected={(files) => files && handleFiles(files)}
            accept=".png,.jpg,.jpeg,.gif,.webp"
            multiple={true}
          >
            {(triggerFileSelect) => (
              <div
                onClick={(e) => {
                  // 点击非图标区域时，只是聚焦该区域，不触发文件选择
                  // 只有点击图标时才触发文件选择
                  const target = e.target as HTMLElement;
                  // 检查是否点击了图标或其父元素
                  const isIconClick = target.closest('.upload-icon-trigger');
                  if (isIconClick) {
                    triggerFileSelect();
                  }
                }}
                style={{
                  padding: '16px 0',
                  border: `1px dashed ${borderColor}`,
                  borderRadius: 4,
                  background: bgColor,
                  cursor: 'default',
                  transition: 'border-color 0.3s',
                  textAlign: 'center',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = primaryColor; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = borderColor; }}
              >
                <p className="ant-upload-drag-icon" style={{ marginBottom: 8 }}>
                  <span
                    className="upload-icon-trigger"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerFileSelect();
                    }}
                    style={{
                      display: 'inline-flex',
                      cursor: 'pointer',
                      padding: 8,
                      borderRadius: 4,
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = isDark ? 'rgba(0, 212, 255, 0.1)' : 'rgba(59, 130, 246, 0.1)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                    title="点击选择图片文件"
                  >
                    <PictureOutlined style={{ fontSize: 28, color: isDark ? '#475569' : '#bbb' }} />
                  </span>
                </p>
                <p className="ant-upload-text" style={{ fontSize: 13, margin: '4px 0', color: isDark ? '#cbd5e1' : undefined }}>
                  点击图标选择图片，或在此区域粘贴截图
                </p>
                <p className="ant-upload-hint" style={{ fontSize: 11, color: mutedTextColor }}>
                  支持 PNG / JPG / GIF / WebP，单张最大5MB，最多{MAX_IMAGES}张
                </p>
              </div>
            )}
          </HiddenFileInput>
        )}

        {isProcessing && (
          <span style={{ fontSize: 11, color: mutedTextColor }}>正在处理图片...</span>
        )}
      </Space>
    </div>
  );
};

export default ImageUploader;
