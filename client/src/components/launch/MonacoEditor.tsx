import { Editor } from '@monaco-editor/react';

interface MonacoEditorProps {
  files: Record<string, string>;
  selectedFile: string;
  onFileChange: (path: string, content: string) => void;
  className?: string;
}

export function MonacoEditor({ files, selectedFile, onFileChange, className }: MonacoEditorProps) {
  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined && selectedFile && value !== files[selectedFile]) {
      onFileChange(selectedFile, value);
    }
  };

  const getLanguage = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'jsx':
      case 'tsx': return 'typescript';
      case 'js': return 'javascript';
      case 'ts': return 'typescript';
      case 'css': return 'css';
      case 'json': return 'json';
      case 'html': return 'html';
      default: return 'plaintext';
    }
  };

  const currentFile = selectedFile && files[selectedFile];

  if (!selectedFile || !currentFile) {
    return (
      <div className={`flex items-center justify-center bg-gray-900 text-gray-400 ${className}`}>
        <div className="text-center">
          <div className="text-4xl mb-4">📝</div>
          <div className="text-lg font-medium">No file selected</div>
          <div className="text-sm">Select a file from the file tree to start editing</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900 ${className}`}>
      <div className="border-b border-gray-700 bg-gray-800 px-4 py-2">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="ml-4 text-sm text-gray-300 font-mono">{selectedFile}</span>
        </div>
      </div>
      
      <div className="h-full">
        <Editor
          height="100%"
          language={getLanguage(selectedFile)}
          value={currentFile}
          theme="vs-dark"
          onChange={handleEditorChange}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', Monaco, monospace",
            lineHeight: 1.6,
            padding: { top: 16, bottom: 16 },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            folding: true,
            lineNumbers: 'on',
            renderWhitespace: 'selection',
            cursorBlinking: 'smooth',
            smoothScrolling: true,
          }}
        />
      </div>
    </div>
  );
}