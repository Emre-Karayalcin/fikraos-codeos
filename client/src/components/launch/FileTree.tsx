import { useState } from "react";
import { FolderTree, File, Folder, FolderOpen, ChevronRight, ChevronDown, ChevronLeft, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
}

interface FileTreeProps {
  files: Record<string, string>;
  selectedFile: string;
  onFileSelect: (filePath: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function FileTree({ files, selectedFile, onFileSelect, isCollapsed = false, onToggleCollapse }: FileTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['src']));

  // Convert flat file list to tree structure
  const buildFileTree = (): FileNode[] => {
    const tree: FileNode[] = [];
    const folderMap = new Map<string, FileNode>();

    // Sort files to ensure consistent ordering
    const sortedFiles = Object.keys(files).sort();

    for (const filePath of sortedFiles) {
      const parts = filePath.split('/');
      let currentPath = '';
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const parentPath = currentPath;
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        
        const isFile = i === parts.length - 1;
        const isFolder = !isFile;

        if (isFolder) {
          // Create folder if it doesn't exist
          if (!folderMap.has(currentPath)) {
            const folderNode: FileNode = {
              name: part,
              path: currentPath,
              type: 'folder',
              children: []
            };
            
            folderMap.set(currentPath, folderNode);
            
            if (parentPath) {
              const parent = folderMap.get(parentPath);
              parent?.children?.push(folderNode);
            } else {
              tree.push(folderNode);
            }
          }
        } else {
          // Create file
          const fileNode: FileNode = {
            name: part,
            path: currentPath,
            type: 'file'
          };
          
          if (parentPath) {
            const parent = folderMap.get(parentPath);
            parent?.children?.push(fileNode);
          } else {
            tree.push(fileNode);
          }
        }
      }
    }

    return tree;
  };

  const toggleFolder = (folderPath: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    setExpandedFolders(newExpanded);
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    
    switch (ext) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        return '📄';
      case 'css':
        return '🎨';
      case 'html':
        return '🌐';
      case 'json':
        return '📋';
      case 'md':
        return '📝';
      default:
        return '📄';
    }
  };

  const renderNode = (node: FileNode, depth: number = 0): React.ReactNode => {
    const isExpanded = expandedFolders.has(node.path);
    const isSelected = selectedFile === node.path;

    if (node.type === 'folder') {
      return (
        <div key={node.path}>
          <div
            className={`flex items-center cursor-pointer hover:bg-muted/50 py-1 px-2 rounded text-sm ${
              depth > 0 ? 'ml-' + (depth * 4) : ''
            }`}
            onClick={() => toggleFolder(node.path)}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 mr-1 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 mr-1 text-muted-foreground" />
            )}
            {isExpanded ? (
              <FolderOpen className="w-4 h-4 mr-2 text-blue-500" />
            ) : (
              <Folder className="w-4 h-4 mr-2 text-blue-500" />
            )}
            <span>{node.name}</span>
          </div>
          {isExpanded && node.children && (
            <div>
              {node.children.map(child => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    } else {
      return (
        <div
          key={node.path}
          className={`flex items-center cursor-pointer hover:bg-muted/50 py-1 px-2 rounded text-sm ${
            isSelected ? 'bg-primary/10 text-primary border-l-2 border-primary' : ''
          }`}
          onClick={() => onFileSelect(node.path)}
          style={{ paddingLeft: `${depth * 16 + 32}px` }}
        >
          <File className="w-4 h-4 mr-2 text-muted-foreground" />
          <span className="mr-2">{getFileIcon(node.name)}</span>
          <span>{node.name}</span>
        </div>
      );
    }
  };

  const fileTree = buildFileTree();

  return (
    <div className={`${isCollapsed ? 'w-12' : 'w-64'} border-r border-border flex flex-col transition-all duration-300 ease-in-out`}>
      <div className="h-12 border-b border-border flex items-center px-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="p-1 h-8 w-8"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
        {!isCollapsed && (
          <>
            <FolderTree className="w-4 h-4 mr-2 ml-2" />
            <span className="font-medium">Files</span>
          </>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {!isCollapsed ? (
          fileTree.length > 0 ? (
            fileTree.map(node => renderNode(node))
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <File className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No files yet</p>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center space-y-2 mt-4">
            {Object.keys(files).slice(0, 6).map((filePath, index) => (
              <Button
                key={filePath}
                variant="ghost"
                size="sm"
                onClick={() => onFileSelect(filePath)}
                className={`p-1 h-8 w-8 ${selectedFile === filePath ? 'bg-primary/10 text-primary' : ''}`}
                title={filePath}
              >
                <File className="w-4 h-4" />
              </Button>
            ))}
            {Object.keys(files).length > 6 && (
              <div className="text-xs text-muted-foreground">
                +{Object.keys(files).length - 6}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}