import React, { useEffect, useRef, useState } from 'react';
import { Modal, Button, Space, message } from 'antd';
import { DownloadOutlined, FullscreenOutlined, FullscreenExitOutlined } from '@ant-design/icons';
import { Transformer } from 'markmap-lib';
import { Markmap, globalCSS } from 'markmap-view';
import { useExportTestPoints } from '../hooks/useExportTestPoints';
import { useTheme } from '../contexts/ThemeContext';
import { useAppContext } from '../contexts/AppContext';

interface TreeNode {
  key: string;
  name: string;
  type: 'category' | 'subcategory';
  count: number;
  selectedCount: number;
  testPoints: any[];
  children?: TreeNode[];
}

interface MindMapModalProps {
  visible: boolean;
  treeData: TreeNode[];
  onClose: () => void;
}

const MindMapModal: React.FC<MindMapModalProps> = ({
  visible,
  treeData,
  onClose,
}) => {
  const { state } = useAppContext();
  const { isDark } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const markmapRef = useRef<Markmap | null>(null);
  const { buildMindMapMarkdown } = useExportTestPoints();
  const [isMaximized, setIsMaximized] = useState(false);

  // 当弹窗关闭时，重置最大化状态
  useEffect(() => {
    if (!visible) {
      setIsMaximized(false);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible || !containerRef.current || treeData.length === 0) return;

    const timer = setTimeout(() => {
      try {
        const markdown = buildMindMapMarkdown(treeData, false, state.showDesignMethod);

        const transformer = new Transformer();
        const { root } = transformer.transform(markdown);

        if (containerRef.current) {
          containerRef.current.innerHTML = '';

          const styleEl = document.createElement('style');
          styleEl.textContent = `
            ${globalCSS}
            .markmap-node text { font-size: 16px !important; fill: ${isDark ? '#f1f5f9' : '#1e293b'} !important; }
            .markmap-node foreignObject div { font-size: 16px !important; line-height: 1.5 !important; color: ${isDark ? '#f1f5f9' : '#1e293b'} !important; }
            .markmap-node circle { r: 6 !important; }
          `;
          containerRef.current.appendChild(styleEl);

          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.setAttribute('width', '100%');
          svg.setAttribute('height', '100%');
          svg.setAttribute('style', 'width: 100%; height: 100%;');
          svg.id = 'mindmap-svg';
          containerRef.current.appendChild(svg);
        }

        const svgEl = document.getElementById('mindmap-svg');
        if (svgEl) {
          markmapRef.current = Markmap.create(svgEl, {
            autoFit: true,
            fitRatio: 0.75,
            initialExpandLevel: 3,
            duration: 0,
            spacingHorizontal: 120,
            spacingVertical: 15,
          }, root);

          // 左右对称布局调整：将节点分为左右两组
          setTimeout(() => {
            const svg = document.getElementById('mindmap-svg');
            if (!svg) return;

            const g = svg.querySelector('g');
            if (!g) return;

            // 获取所有 markmap-node 组
            const nodes = g.querySelectorAll('.markmap-node');
            if (nodes.length <= 1) return;

            // 找到根节点位置
            const rootNode = nodes[0] as SVGGElement;
            const rootTransform = rootNode.getAttribute('transform');
            let rootX = 0;
            if (rootTransform) {
              const match = rootTransform.match(/translate\(([^,]+),([^)]+)\)/);
              if (match) {
                rootX = parseFloat(match[1]);
              }
            }

            // 收集一级子节点（测试场景）及其所有后代
            interface NodeInfo {
              element: SVGGElement;
              x: number;
              y: number;
              depth: number;
              parentX?: number;
            }

            const nodeInfos: NodeInfo[] = [];
            const childNodes: NodeInfo[] = [];

            nodes.forEach((node) => {
              const nodeG = node as SVGGElement;
              const transform = nodeG.getAttribute('transform');
              if (transform) {
                const match = transform.match(/translate\(([^,]+),([^)]+)\)/);
                if (match) {
                  const x = parseFloat(match[1]);
                  const y = parseFloat(match[2]);
                  const depth = parseInt(nodeG.getAttribute('data-depth') || '0');
                  nodeInfos.push({ element: nodeG, x, y, depth });

                  // 识别一级子节点（在根节点右侧的节点，深度为1）
                  if (x > rootX + 10 && depth === 1) {
                    childNodes.push({ element: nodeG, x, y, depth });
                  }
                }
              }
            });

            // 将一级子节点分为左右两组
            const midIndex = Math.ceil(childNodes.length / 2);
            const leftRootNodes = childNodes.slice(0, midIndex);

            // 收集所有需要左移的节点（包括子节点及其所有后代）
            const nodesToMove: NodeInfo[] = [];
            leftRootNodes.forEach((leftRoot) => {
              // 找到这个根节点下的所有后代
              const descendants = nodeInfos.filter((n) => {
                // 检查是否是后代：x坐标在根节点右侧，深度大于等于根节点
                return n.x >= leftRoot.x - 10 && n.depth >= leftRoot.depth && n.element !== leftRoot.element;
              });
              nodesToMove.push(leftRoot, ...descendants);
            });

            // 移动节点到左侧（镜像）
            const movedXMap = new Map<number, number>(); // 记录原始x到新的x的映射

            nodesToMove.forEach((nodeInfo) => {
              const offsetFromRoot = nodeInfo.x - rootX;
              const newX = rootX - offsetFromRoot;
              movedXMap.set(nodeInfo.x, newX);
              nodeInfo.element.setAttribute('transform', `translate(${newX},${nodeInfo.y})`);
            });

            // 调整连线：找到所有path并更新
            const paths = g.querySelectorAll('path');
            paths.forEach((path) => {
              const pathData = path.getAttribute('d');
              if (!pathData) return;

              let newPathData = pathData;
              // 替换所有需要移动的x坐标
              movedXMap.forEach((newX, oldX) => {
                // 使用正则表达式精确匹配坐标值
                const regex = new RegExp(`([MLC])\\s+${oldX.toFixed(2)}(?=\\s|,|\\b)`, 'g');
                newPathData = newPathData.replace(regex, `$1 ${newX.toFixed(2)}`);
                // 也尝试不匹配小数位的版本
                const regex2 = new RegExp(`([MLC])\\s+${oldX}(?=\\s|,|\\b)`, 'g');
                newPathData = newPathData.replace(regex2, `$1 ${newX}`);
              });

              if (newPathData !== pathData) {
                path.setAttribute('d', newPathData);
              }
            });

            // 暗色模式下强制覆盖所有节点文字颜色
            if (isDark) {
              svg.querySelectorAll('text').forEach((el) => {
                el.setAttribute('fill', '#f1f5f9');
              });
              svg.querySelectorAll('foreignObject div').forEach((el) => {
                (el as HTMLElement).style.color = '#f1f5f9';
              });
            }
          }, 400);
        }
      } catch (err) {
        console.error('Failed to render mind map:', err);
        message.error('思维导图渲染失败');
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      if (markmapRef.current) {
        markmapRef.current.destroy();
        markmapRef.current = null;
      }
    };
  }, [visible, treeData, buildMindMapMarkdown, state.showDesignMethod]);

  const handleExportSVG = () => {
    try {
      const svgEl = document.getElementById('mindmap-svg');
      if (!svgEl) {
        message.error('思维导图未渲染');
        return;
      }

      const clone = svgEl.cloneNode(true) as SVGElement;
      const viewBox = svgEl.getAttribute('viewBox') || '0 0 800 600';
      clone.setAttribute('viewBox', viewBox);

      // 注入样式：根据当前主题设置文字颜色和背景色
      const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      const textColor = isDark ? '#f1f5f9' : '#1e293b';
      const bgColor = isDark ? '#0f172a' : '#ffffff';
      style.textContent = `
        text { fill: ${textColor} !important; }
        foreignObject div { color: ${textColor} !important; }
        circle { stroke: #00d4ff !important; }
        svg { background-color: ${bgColor} !important; }
      `;
      clone.insertBefore(style, clone.firstChild);

      // 设置背景色
      clone.style.backgroundColor = bgColor;

      const svgData = new XMLSerializer().serializeToString(clone);
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      downloadBlob(blob, '测试点思维导图.svg');
      message.success('SVG 导出成功');
    } catch (err) {
      console.error('SVG export failed:', err);
      message.error('SVG 导出失败');
    }
  };

  const handleExportPNG = async () => {
    try {
      const svgEl = document.getElementById('mindmap-svg');
      if (!svgEl) {
        message.error('思维导图未渲染');
        return;
      }

      const clone = svgEl.cloneNode(true) as SVGElement;
      const bbox = (svgEl as any).getBBox?.() || { width: 1200, height: 800 };
      const width = bbox.width || 1200;
      const height = bbox.height || 800;
      const scale = 4;

      clone.setAttribute('width', String(width * scale));
      clone.setAttribute('height', String(height * scale));

      // 暗色模式下导出时注入文字颜色样式（覆盖 markmap 默认深色文字）
      if (isDark) {
        const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
        style.textContent = `
          text { fill: #f1f5f9 !important; }
          foreignObject div { color: #f1f5f9 !important; }
          circle { stroke: #00d4ff !important; }
        `;
        clone.insertBefore(style, clone.firstChild);
      }

      const svgData = new XMLSerializer().serializeToString(clone);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        message.error('Canvas 创建失败');
        return;
      }

      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            downloadBlob(blob, '测试点思维导图.png');
            message.success('PNG 导出成功');
          }
          URL.revokeObjectURL(url);
        }, 'image/png');
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        message.error('PNG 导出失败：图片加载错误');
      };
      img.src = url;
    } catch (err) {
      console.error('PNG export failed:', err);
      message.error('PNG 导出失败');
    }
  };

  const handleExportHTML = async () => {
    try {
      const markdown = buildMindMapMarkdown(treeData, false, state.showDesignMethod);
      const htmlContent = generateStandaloneHTML(markdown, isDark);
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      downloadBlob(blob, '测试点思维导图.html');
      message.success('HTML 导出成功');
    } catch (err) {
      console.error('HTML export failed:', err);
      message.error('HTML 导出失败');
    }
  };

  const handleExportMarkdown = (selectedOnly: boolean = false) => {
    try {
      const markdown = buildMindMapMarkdown(treeData, selectedOnly, state.showDesignMethod);
      const blob = new Blob(['\uFEFF' + markdown], {
        type: 'text/markdown;charset=utf-8',
      });
      downloadBlob(blob, '测试点总览.md');
      message.success('Markdown 导出成功');
    } catch (err) {
      console.error('Markdown export failed:', err);
      message.error('Markdown 导出失败');
    }
  };

  const titleContent = (
    <span>测试点思维导图</span>
  );

  return (
    <Modal
      title={titleContent}
      open={visible}
      onCancel={onClose}
      width={isMaximized ? '100vw' : 900}
      style={{ top: isMaximized ? 0 : undefined, maxWidth: '100vw' }}
      styles={{
        body: {
          padding: 0,
          height: isMaximized ? 'calc(100vh - 108px)' : 'calc(100vh - 200px)',
          overflow: 'hidden',
        },
      }}
      footer={
        <Space>
          <Button icon={<DownloadOutlined />} onClick={() => handleExportMarkdown()}>
            导出 Markdown
          </Button>
          <Button icon={<DownloadOutlined />} onClick={handleExportSVG}>
            导出 SVG
          </Button>
          <Button icon={<DownloadOutlined />} onClick={handleExportPNG}>
            导出 PNG
          </Button>
          <Button icon={<DownloadOutlined />} onClick={handleExportHTML}>
            导出 HTML
          </Button>
          <Button
            icon={isMaximized ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
            onClick={() => setIsMaximized(!isMaximized)}
          >
            {isMaximized ? '还原' : '最大化'}
          </Button>
          <Button onClick={onClose}>关闭</Button>
        </Space>
      }
    >
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          minHeight: 500,
          background: isDark ? '#0f172a' : '#fafafa',
        }}
      />
    </Modal>
  );
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function generateStandaloneHTML(markdown: string, isDarkMode: boolean): string {
  const bgColor = isDarkMode ? '#0f172a' : '#ffffff';
  const textColor = isDarkMode ? '#f1f5f9' : '#1e293b';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>测试点思维导图</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body, html { width: 100%; height: 100%; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: ${bgColor}; }
  #mindmap-container { width: 100%; height: 100%; background-color: ${bgColor}; }
  svg { width: 100%; height: 100%; background-color: ${bgColor} !important; }
  .markmap-node text { fill: ${textColor} !important; }
  .markmap-node foreignObject div { color: ${textColor} !important; }
</style>
</head>
<body>
<div id="mindmap-container">
  <svg id="mindmap"></svg>
</div>
<script src="https://cdn.jsdelivr.net/npm/markmap-view@0.18.12/dist/browser/index.js"></script>
<script src="https://cdn.jsdelivr.net/npm/markmap-lib@0.18.12/dist/browser/index.js"></script>
<script>
(function() {
  try {
    const { Transformer } = window.markmap;
    const { Markmap, globalCSS } = window.markmap;

    // 注入全局样式
    const style = document.createElement('style');
    style.textContent = globalCSS + '\n.markmap-node text { fill: ${textColor} !important; }\n.markmap-node foreignObject div { color: ${textColor} !important; }';
    document.head.appendChild(style);

    // 渲染思维导图
    const markdown = ${JSON.stringify(markdown)};
    const transformer = new Transformer();
    const { root } = transformer.transform(markdown);
    const svgEl = document.getElementById('mindmap');

    Markmap.create(svgEl, {
      autoFit: true,
      fitRatio: 0.75,
      initialExpandLevel: 3,
      spacingHorizontal: 120,
      spacingVertical: 15
    }, root);

    // 应用文字颜色
    setTimeout(function() {
      document.querySelectorAll('text').forEach(function(el) {
        el.setAttribute('fill', '${textColor}');
      });
      document.querySelectorAll('foreignObject div').forEach(function(el) {
        el.style.color = '${textColor}';
      });
    }, 500);
  } catch (err) {
    console.error('Failed to render mind map:', err);
    document.body.innerHTML = '<div style="padding: 20px; color: red;">思维导图渲染失败，请检查浏览器控制台错误信息</div>';
  }
})();
</script>
</body>
</html>`;
}

export default MindMapModal;
