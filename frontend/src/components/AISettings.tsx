import { useState, useEffect } from 'react'
import { X, Save, Key, Globe, Zap, CheckCircle, AlertCircle } from 'lucide-react'
import { request } from '../api/client'
import styles from './AISettings.module.css'

interface AISettingsProps {
  open: boolean
  onClose: () => void
}

interface AIConfig {
  provider: string
  apiKey: string
  apiUrl: string
  model: string
}

// AI 提供商配置
const AI_PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI (ChatGPT)',
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    defaultModel: 'gpt-4o-mini',
    keyPlaceholder: 'sk-...',
    helpUrl: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    apiUrl: 'https://api.deepseek.com/v1/chat/completions',
    models: ['deepseek-chat', 'deepseek-coder'],
    defaultModel: 'deepseek-chat',
    keyPlaceholder: 'sk-...',
    helpUrl: 'https://platform.deepseek.com/',
  },
  {
    id: 'zhipu',
    name: '智谱 AI (GLM)',
    apiUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    models: ['glm-4-plus', 'glm-4', 'glm-4-flash', 'glm-3-turbo'],
    defaultModel: 'glm-4-flash',
    keyPlaceholder: '你的 API Key',
    helpUrl: 'https://open.bigmodel.cn/',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
    models: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'],
    defaultModel: 'gemini-1.5-flash',
    keyPlaceholder: 'AIza...',
    helpUrl: 'https://aistudio.google.com/app/apikey',
  },
  {
    id: 'moonshot',
    name: 'Moonshot (Kimi)',
    apiUrl: 'https://api.moonshot.cn/v1/chat/completions',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
    defaultModel: 'moonshot-v1-8k',
    keyPlaceholder: 'sk-...',
    helpUrl: 'https://platform.moonshot.cn/',
  },
  {
    id: 'qwen',
    name: '通义千问 (Qwen)',
    apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    models: ['qwen-turbo', 'qwen-plus', 'qwen-max'],
    defaultModel: 'qwen-turbo',
    keyPlaceholder: 'sk-...',
    helpUrl: 'https://dashscope.console.aliyun.com/',
  },
  {
    id: 'custom',
    name: '自定义 API',
    apiUrl: '',
    models: [],
    defaultModel: '',
    keyPlaceholder: '你的 API Key',
    helpUrl: '',
  },
]

const STORAGE_KEY = 'ai_config'

export function AISettings({ open, onClose }: AISettingsProps) {
  const [config, setConfig] = useState<AIConfig>({
    provider: 'openai',
    apiKey: '',
    apiUrl: '',
    model: '',
  })
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [testMessage, setTestMessage] = useState('')
  const [customModel, setCustomModel] = useState('')

  // 加载保存的配置
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setConfig(parsed)
        if (parsed.provider === 'custom' || !AI_PROVIDERS.find(p => p.id === parsed.provider)?.models.includes(parsed.model)) {
          setCustomModel(parsed.model)
        }
      } catch (e) {
        console.error('Failed to load AI config:', e)
      }
    }
  }, [open])

  // 获取当前提供商配置
  const currentProvider = AI_PROVIDERS.find((p) => p.id === config.provider) || AI_PROVIDERS[0]

  // 切换提供商
  const handleProviderChange = (providerId: string) => {
    const provider = AI_PROVIDERS.find((p) => p.id === providerId)
    if (provider) {
      setConfig({
        ...config,
        provider: providerId,
        apiUrl: provider.apiUrl,
        model: provider.defaultModel,
      })
      setCustomModel('')
      setTestStatus('idle')
    }
  }

  // 保存配置
  const handleSave = async () => {
    const finalConfig = {
      ...config,
      model: config.provider === 'custom' || customModel ? customModel || config.model : config.model,
    }
    
    // 保存到 localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(finalConfig))
    
    // 同时保存到后端
    try {
      await request('/api/ai/config', {
        method: 'POST',
        body: JSON.stringify(finalConfig),
      })
    } catch (e) {
      console.warn('Failed to save config to backend:', e)
    }
    
    onClose()
  }

  // 测试连接
  const handleTest = async () => {
    if (!config.apiKey) {
      setTestStatus('error')
      setTestMessage('请先输入 API Key')
      return
    }

    setTestStatus('testing')
    setTestMessage('正在测试连接...')

    try {
      const result = await request<{ success: boolean; result?: string; error?: string }>('/api/ai/test', {
        method: 'POST',
        body: JSON.stringify({
          ...config,
          model: customModel || config.model,
        }),
      })

      if (result.success) {
        setTestStatus('success')
        setTestMessage('连接成功！AI 服务正常工作。')
      } else {
        setTestStatus('error')
        setTestMessage(result.error || '连接失败，请检查配置')
      }
    } catch (e) {
      setTestStatus('error')
      setTestMessage('测试失败：' + (e instanceof Error ? e.message : '网络错误'))
    }
  }

  if (!open) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <Zap size={20} />
            <h2>AI 设置</h2>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.content}>
          {/* 提供商选择 */}
          <div className={styles.section}>
            <label className={styles.label}>选择 AI 提供商</label>
            <div className={styles.providerGrid}>
              {AI_PROVIDERS.map((provider) => (
                <button
                  key={provider.id}
                  className={`${styles.providerCard} ${config.provider === provider.id ? styles.providerActive : ''}`}
                  onClick={() => handleProviderChange(provider.id)}
                >
                  <span className={styles.providerName}>{provider.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* API Key */}
          <div className={styles.section}>
            <label className={styles.label}>
              <Key size={16} />
              API Key
              {currentProvider.helpUrl && (
                <a
                  href={currentProvider.helpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.helpLink}
                >
                  获取 Key
                </a>
              )}
            </label>
            <input
              type="password"
              className={styles.input}
              placeholder={currentProvider.keyPlaceholder}
              value={config.apiKey}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
            />
          </div>

          {/* API URL */}
          <div className={styles.section}>
            <label className={styles.label}>
              <Globe size={16} />
              API 地址
            </label>
            <input
              type="text"
              className={styles.input}
              placeholder="https://api.example.com/v1/chat/completions"
              value={config.apiUrl}
              onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })}
            />
            <p className={styles.hint}>可以修改为代理地址或自定义端点</p>
          </div>

          {/* 模型选择 */}
          <div className={styles.section}>
            <label className={styles.label}>模型</label>
            {currentProvider.models.length > 0 ? (
              <select
                className={styles.select}
                value={config.model}
                onChange={(e) => setConfig({ ...config, model: e.target.value })}
              >
                {currentProvider.models.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                className={styles.input}
                placeholder="输入模型名称"
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
              />
            )}
            {currentProvider.models.length > 0 && (
              <div className={styles.customModelRow}>
                <span>或自定义：</span>
                <input
                  type="text"
                  className={styles.inputSmall}
                  placeholder="自定义模型名"
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* 测试状态 */}
          {testStatus !== 'idle' && (
            <div className={`${styles.testResult} ${styles[testStatus]}`}>
              {testStatus === 'testing' && <div className={styles.spinner} />}
              {testStatus === 'success' && <CheckCircle size={16} />}
              {testStatus === 'error' && <AlertCircle size={16} />}
              <span>{testMessage}</span>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button className={styles.testButton} onClick={handleTest}>
            测试连接
          </button>
          <button className={styles.saveButton} onClick={handleSave}>
            <Save size={16} />
            保存设置
          </button>
        </div>
      </div>
    </div>
  )
}
