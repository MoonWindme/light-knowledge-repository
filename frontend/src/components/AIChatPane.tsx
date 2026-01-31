import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Send, Bot, User, Loader2, Trash2, Sparkles } from 'lucide-react'
import { request } from '../api/client'
import styles from './AIChatPane.module.css'

interface AIChatPaneProps {
  open: boolean
  onClose: () => void
  currentContent: string
  onInsertText?: (text: string) => void
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface AIResponse {
  success: boolean
  result?: string
  error?: string
}

export function AIChatPane({ open, onClose, currentContent, onInsertText }: AIChatPaneProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // 自动滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // 打开时聚焦输入框
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  // 发送消息
  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // 构建上下文：包含当前文档内容和对话历史
      const context = currentContent 
        ? `当前文档内容：\n\`\`\`\n${currentContent.slice(0, 2000)}\n\`\`\`\n\n` 
        : ''
      
      const conversationHistory = messages
        .slice(-6) // 最近6条消息作为上下文
        .map((m) => `${m.role === 'user' ? '用户' : 'AI'}: ${m.content}`)
        .join('\n')

      const fullPrompt = `${context}${conversationHistory ? `对话历史：\n${conversationHistory}\n\n` : ''}用户: ${userMessage.content}\n\n请回复用户的问题。如果用户要求修改或生成内容，直接给出结果。`

      const response = await request<AIResponse>('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ text: fullPrompt }),
      })

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.success && response.result 
          ? response.result 
          : response.error || '抱歉，我无法处理您的请求。',
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (e) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `出错了：${e instanceof Error ? e.message : '网络错误，请检查AI设置'}`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  // 清空对话
  const handleClear = () => {
    setMessages([])
  }

  // 插入AI回复到编辑器
  const handleInsert = (content: string) => {
    onInsertText?.(content)
  }

  // 快捷指令
  const quickCommands = [
    { label: '续写', prompt: '请根据当前文档内容继续写下去' },
    { label: '翻译', prompt: '请将当前文档翻译成英文（如果是英文则翻译成中文）' },
    { label: '总结', prompt: '请总结当前文档的主要内容' },
    { label: '润色', prompt: '请润色优化当前文档的表达' },
  ]

  const handleQuickCommand = (prompt: string) => {
    setInput(prompt)
    inputRef.current?.focus()
  }

  if (!open) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <Sparkles size={18} />
            <span>AI 助手</span>
          </div>
          <div className={styles.headerActions}>
            <button 
              className={styles.headerButton} 
              onClick={handleClear}
              title="清空对话"
            >
              <Trash2 size={16} />
            </button>
            <button className={styles.headerButton} onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div className={styles.messages}>
          {messages.length === 0 ? (
            <div className={styles.welcome}>
              <Bot size={48} className={styles.welcomeIcon} />
              <h3>你好！我是 AI 助手</h3>
              <p>我可以帮你写作、翻译、润色文档，或者回答任何问题。</p>
              <div className={styles.quickCommands}>
                {quickCommands.map((cmd) => (
                  <button
                    key={cmd.label}
                    className={styles.quickCommand}
                    onClick={() => handleQuickCommand(cmd.prompt)}
                  >
                    {cmd.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`${styles.message} ${styles[msg.role]}`}
                >
                  <div className={styles.messageAvatar}>
                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className={styles.messageContent}>
                    <div className={styles.messageText}>{msg.content}</div>
                    {msg.role === 'assistant' && onInsertText && (
                      <button
                        className={styles.insertButton}
                        onClick={() => handleInsert(msg.content)}
                        title="插入到编辑器"
                      >
                        插入到文档
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className={`${styles.message} ${styles.assistant}`}>
                  <div className={styles.messageAvatar}>
                    <Bot size={16} />
                  </div>
                  <div className={styles.messageContent}>
                    <div className={styles.loading}>
                      <Loader2 size={16} className={styles.spinner} />
                      <span>思考中...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <div className={styles.inputArea}>
          {messages.length > 0 && (
            <div className={styles.quickCommandsInline}>
              {quickCommands.map((cmd) => (
                <button
                  key={cmd.label}
                  className={styles.quickCommandSmall}
                  onClick={() => handleQuickCommand(cmd.prompt)}
                >
                  {cmd.label}
                </button>
              ))}
            </div>
          )}
          <div className={styles.inputWrapper}>
            <textarea
              ref={inputRef}
              className={styles.input}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息，按 Enter 发送..."
              rows={1}
              disabled={isLoading}
            />
            <button
              className={styles.sendButton}
              onClick={() => void handleSend()}
              disabled={!input.trim() || isLoading}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
