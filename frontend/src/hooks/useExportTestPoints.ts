import { useCallback } from 'react';

interface TreeNode {
  key: string;
  name: string;
  type: 'category' | 'subcategory';
  count: number;
  selectedCount: number;
  testPoints: any[];
  children?: TreeNode[];
}

export function useExportTestPoints() {
  const buildMarkdownContent = useCallback(
    (treeData: TreeNode[], selectedOnly: boolean = false, showDesignMethod: boolean = true): string => {
      const lines: string[] = ['# 测试点总览', ''];

      for (const cat of treeData) {
        let hasContent = false;
        const catLines: string[] = [];

        for (const sub of cat.children || []) {
          const points = selectedOnly
            ? sub.testPoints.filter((p: any) => p.selected)
            : sub.testPoints;

          if (points.length === 0) continue;

          if (!hasContent) {
            catLines.push(`## ${cat.name}`);
            catLines.push('');
            hasContent = true;
          }

          if (showDesignMethod && sub.name) {
            catLines.push(`### ${sub.name}`);
            catLines.push('');
          }
          
          if (showDesignMethod) {
            catLines.push('| 序号 | 测试点 | 设计方法 |');
            catLines.push('|------|--------|----------|');
          } else {
            catLines.push('| 序号 | 测试点 |');
            catLines.push('|------|--------|');
          }

          points.forEach((point: any, idx: number) => {
            if (showDesignMethod) {
              catLines.push(
                `| ${idx + 1} | ${point.content || point.title || ''} | ${point.designMethod || sub.name} |`
              );
            } else {
              catLines.push(
                `| ${idx + 1} | ${point.content || point.title || ''} |`
              );
            }
          });

          catLines.push('');
        }

        if (hasContent) {
          lines.push(...catLines);
        }
      }

      return lines.join('\n');
    },
    []
  );

  const buildMindMapMarkdown = useCallback(
    (treeData: TreeNode[], selectedOnly: boolean = false, showDesignMethod: boolean = true): string => {
      const lines: string[] = ['# 测试点总览', ''];

      for (const cat of treeData) {
        let hasContent = false;
        const catLines: string[] = [];

        for (const sub of cat.children || []) {
          const points = selectedOnly
            ? sub.testPoints.filter((p: any) => p.selected)
            : sub.testPoints;

          if (points.length === 0) continue;

          if (!hasContent) {
            catLines.push(`## ${cat.name}`);
            hasContent = true;
          }

          if (showDesignMethod && sub.name) {
            catLines.push(`### ${sub.name}`);
          }
          points.forEach((point: any) => {
            const content = point.content || point.title || '未命名';
            const shortContent =
              content.length > 60 ? content.substring(0, 60) + '...' : content;
            catLines.push(`- ${shortContent}`);
          });
        }

        if (hasContent) {
          lines.push(...catLines);
          lines.push('');
        }
      }

      return lines.join('\n');
    },
    []
  );

  const downloadMarkdown = useCallback(
    (treeData: TreeNode[], selectedOnly: boolean = false, showDesignMethod: boolean = true) => {
      const content = buildMarkdownContent(treeData, selectedOnly, showDesignMethod);
      downloadTextFile(content, '测试点总览.md');
    },
    [buildMarkdownContent]
  );

  const downloadMindMapMarkdown = useCallback(
    (treeData: TreeNode[], selectedOnly: boolean = false, showDesignMethod: boolean = true) => {
      const content = buildMindMapMarkdown(treeData, selectedOnly, showDesignMethod);
      downloadTextFile(content, '测试点思维导图.md');
    },
    [buildMindMapMarkdown]
  );

  return {
    buildMarkdownContent,
    buildMindMapMarkdown,
    downloadMarkdown,
    downloadMindMapMarkdown,
  };
}

function downloadTextFile(content: string, filename: string) {
  const blob = new Blob(['\uFEFF' + content], {
    type: 'text/markdown;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default useExportTestPoints;
