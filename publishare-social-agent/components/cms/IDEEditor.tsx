'use client'

import React, { useState, useEffect, useRef } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { EditorView } from '@codemirror/view'
import { markdown } from '@codemirror/lang-markdown'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Link, 
  Image, 
  Code, 
  Quote, 
  Heading1, 
  Heading2, 
  Heading3,
  Eye,
  Save,
  Undo,
  Redo,
  Search,
  Settings,
  Maximize,
  Minimize
} from 'lucide-react'

interface IDEEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  showToolbar?: boolean
  showPreview?: boolean
  showLineNumbers?: boolean
  onSave?: () => void
  onPreview?: () => void
}

export default function IDEEditor({
  value = '',
  onChange,
  placeholder = 'Write your content in Markdown...',
  className = '',
  showToolbar = true,
  showPreview = false,
  showLineNumbers = true,
  onSave,
  onPreview
}: IDEEditorProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [cursorPosition, setCursorPosition] = useState({ start: 0, end: 0 })
  const [wrap, setWrap] = useState(true)
  // Keep gutter even when wrapping because CodeMirror supports visual line numbers
  const showGutter = showLineNumbers

  // Auto-save functionality
  useEffect(() => {
    const interval = setInterval(() => {
      if (onSave) {
        onSave()
      }
    }, 30000) // Auto-save every 30 seconds

    return () => clearInterval(interval)
  }, [onSave])

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      const resizeTextarea = () => {
        textarea.style.height = 'auto'
        const scrollHeight = textarea.scrollHeight
        const minHeight = 400
        const maxHeight = 800
        const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight)
        textarea.style.height = `${newHeight}px`
      }
      
      resizeTextarea()
      
      // Add event listener for content changes
      const observer = new MutationObserver(resizeTextarea)
      observer.observe(textarea, { childList: true, subtree: true })
      
      return () => observer.disconnect()
    }
  }, [value])

  const insertText = (text: string, before: string = '', after: string = '') => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = value.substring(start, end)
    
    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end)
    onChange(newText)
    
    // Set cursor position after inserted text
    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + before.length + selectedText.length + after.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  const formatText = (format: string) => {
    switch (format) {
      case 'bold':
        insertText('**', '**', '**')
        break
      case 'italic':
        insertText('*', '*', '*')
        break
      case 'code':
        insertText('`', '`', '`')
        break
      case 'quote':
        insertText('> ', '', '\n')
        break
      case 'h1':
        insertText('# ', '', '\n')
        break
      case 'h2':
        insertText('## ', '', '\n')
        break
      case 'h3':
        insertText('### ', '', '\n')
        break
      case 'ul':
        insertText('- ', '', '\n')
        break
      case 'ol':
        insertText('1. ', '', '\n')
        break
      case 'link':
        insertText('[', '](url)', '')
        break
      case 'image':
        insertText('![alt text](', '', ')')
        break
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Tab key handling
    if (e.key === 'Tab') {
      e.preventDefault()
      insertText('  ') // Insert 2 spaces
    }
    
    // Ctrl/Cmd + S for save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      if (onSave) onSave()
    }
    
    // Ctrl/Cmd + F for search
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault()
      setShowSearch(true)
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
    setCursorPosition({
      start: e.target.selectionStart,
      end: e.target.selectionEnd
    })
  }

  const handleTextareaSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    setCursorPosition({
      start: e.currentTarget.selectionStart,
      end: e.currentTarget.selectionEnd
    })
  }

  const getWordCount = () => {
    return value.trim().split(/\s+/).filter(word => word.length > 0).length
  }

  const getCharacterCount = () => {
    return value.length
  }

  const getLineCount = () => {
    return value.split('\n').length
  }

  const renderLineNumbers = () => {
    const lines = value.split('\n')
    return (
      <div className="line-numbers w-12 p-4 text-xs text-gray-400 font-mono select-none flex flex-col">
        {lines.map((_, index) => (
          <div key={index + 1} className="text-right leading-6">
            {index + 1}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={`ide-editor ${className} ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : ''}`}>
      <Card className={`bg-transparent ${isFullscreen ? 'rounded-none h-full' : 'h-auto'}`} style={{ backgroundColor: 'transparent' }}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">IDE Content Editor</CardTitle>
            <div className="flex items-center gap-2">
              {showSearch && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-2 py-1 text-xs border rounded"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowSearch(false)}
                  >
                    ×
                  </Button>
                </div>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowSearch(!showSearch)}
              >
                <Search className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0 bg-transparent" style={{ backgroundColor: 'transparent' }}>
          {showToolbar && (
            <div className="border-b border-gray-200 p-2 bg-gray-50">
              <div className="flex items-center gap-1 flex-wrap">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => formatText('h1')}
                  title="Heading 1"
                >
                  <Heading1 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => formatText('h2')}
                  title="Heading 2"
                >
                  <Heading2 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => formatText('h3')}
                  title="Heading 3"
                >
                  <Heading3 className="h-4 w-4" />
                </Button>
                
                <div className="w-px h-4 bg-gray-300 mx-1"></div>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => formatText('bold')}
                  title="Bold"
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => formatText('italic')}
                  title="Italic"
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => formatText('code')}
                  title="Code"
                >
                  <Code className="h-4 w-4" />
                </Button>
                
                <div className="w-px h-4 bg-gray-300 mx-1"></div>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => formatText('ul')}
                  title="Unordered List"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => formatText('ol')}
                  title="Ordered List"
                >
                  <ListOrdered className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => formatText('quote')}
                  title="Quote"
                >
                  <Quote className="h-4 w-4" />
                </Button>
                
                <div className="w-px h-4 bg-gray-300 mx-1"></div>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => formatText('link')}
                  title="Link"
                >
                  <Link className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => formatText('image')}
                  title="Image"
                >
                  <Image className="h-4 w-4" />
                </Button>

                <div className="w-px h-4 bg-gray-300 mx-1"></div>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setWrap((w) => !w)}
                  title={wrap ? 'Disable wrap' : 'Enable wrap'}
                >
                  {wrap ? 'Wrap: on' : 'Wrap: off'}
                </Button>
              </div>
            </div>
          )}
          
            <div className="flex min-h-[400px]">
              <div className="flex-1">
                <CodeMirror
                  value={value}
                  height="400px"
                  extensions={[
                    markdown(),
                    ...(wrap ? [EditorView.lineWrapping] : []),
                  ]}
                  basicSetup={{
                    lineNumbers: showGutter,
                    highlightActiveLine: true,
                  }}
                  onChange={(val) => onChange(val)}
                  theme={EditorView.theme({
                    '&': { backgroundColor: 'transparent' },
                    '.cm-content': {
                      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                      fontSize: '0.875rem',
                      lineHeight: '1.5rem',
                    },
                  })}
                />
              </div>
            </div>
          
          {/* Status Bar */}
          <div className="border-t border-gray-200 p-2 bg-gray-50 flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center gap-4">
              <span>Words: {getWordCount()}</span>
              <span>Characters: {getCharacterCount()}</span>
              <span>Lines: {getLineCount()}</span>
              <span>Cursor: {cursorPosition.start}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Markdown
              </Badge>
              {onSave && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onSave}
                  className="h-6 px-2"
                >
                  <Save className="h-3 w-3 mr-1" />
                  Save
                </Button>
              )}
              {onPreview && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onPreview}
                  className="h-6 px-2"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Preview
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
