import { useEffect, useState, useCallback } from 'react'
import { X, Download, Trash2, Power, PowerOff, Search, Package, Star, RefreshCw } from 'lucide-react'
import { usePluginStore } from '../plugins/PluginManager'
import type { InstalledPlugin, MarketPlugin } from '../plugins/types'
import styles from './PluginMarket.module.css'

interface PluginMarketProps {
  open: boolean
  onClose: () => void
}

type TabType = 'installed' | 'market'

// 模拟市场插件数据（实际应从后端获取）
const mockMarketPlugins: MarketPlugin[] = [
  {
    id: 'ai-assistant',
    name: 'AI 辅助写作',
    version: '1.0.0',
    description: '智能续写、翻译、语法检查等 AI 辅助功能',
    author: 'Markdown Notes',
    icon: '✨',
    downloads: 1200,
    rating: 4.8,
    keywords: ['AI', '写作', '翻译'],
  },
  {
    id: 'theme-pack',
    name: '主题包',
    version: '1.0.0',
    description: '多种编辑器和预览主题',
    author: 'Markdown Notes',
    icon: '🎨',
    downloads: 890,
    rating: 4.5,
    keywords: ['主题', '样式'],
  },
  {
    id: 'image-upload',
    name: '图片上传',
    version: '1.0.0',
    description: '支持拖拽上传图片到云存储',
    author: 'Community',
    icon: '📷',
    downloads: 560,
    rating: 4.2,
    keywords: ['图片', '上传', '云存储'],
  },
  {
    id: 'export-docx',
    name: 'Word 导出',
    version: '1.0.0',
    description: '导出 Markdown 为 Word 文档',
    author: 'Community',
    icon: '📄',
    downloads: 430,
    rating: 4.0,
    keywords: ['导出', 'Word', 'docx'],
  },
]

export function PluginMarket({ open, onClose }: PluginMarketProps) {
  const [activeTab, setActiveTab] = useState<TabType>('installed')
  const [searchQuery, setSearchQuery] = useState('')
  const [marketPlugins, setMarketPlugins] = useState<MarketPlugin[]>(mockMarketPlugins)
  const [isLoadingMarket, setIsLoadingMarket] = useState(false)

  const {
    installedPlugins,
    isLoading,
    loadPlugins,
    enablePlugin,
    disablePlugin,
    uninstallPlugin,
  } = usePluginStore()

  // 加载插件列表
  useEffect(() => {
    if (open) {
      loadPlugins()
    }
  }, [open, loadPlugins])

  // 获取已安装插件列表
  const installedList = Array.from(installedPlugins.values())

  // 过滤市场插件
  const filteredMarketPlugins = marketPlugins.filter((plugin) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      plugin.name.toLowerCase().includes(query) ||
      plugin.description.toLowerCase().includes(query) ||
      plugin.keywords?.some((k) => k.toLowerCase().includes(query))
    )
  })

  // 更新市场插件的安装状态
  const enrichedMarketPlugins = filteredMarketPlugins.map((plugin) => ({
    ...plugin,
    installed: installedPlugins.has(plugin.id),
    installedVersion: installedPlugins.get(plugin.id)?.manifest.version,
  }))

  // 刷新市场
  const handleRefreshMarket = useCallback(async () => {
    setIsLoadingMarket(true)
    // 模拟 API 调用
    await new Promise((resolve) => setTimeout(resolve, 500))
    setMarketPlugins(mockMarketPlugins)
    setIsLoadingMarket(false)
  }, [])

  // 安装插件（模拟）
  const handleInstall = useCallback(async (marketPlugin: MarketPlugin) => {
    // 实际实现需要从市场下载插件代码并注册
    // 这里只是模拟
    alert(`安装插件 "${marketPlugin.name}" 功能将在后续版本实现`)
  }, [])

  // 切换启用/禁用
  const handleToggleEnable = useCallback(
    async (plugin: InstalledPlugin) => {
      if (plugin.enabled) {
        await disablePlugin(plugin.manifest.id)
      } else {
        await enablePlugin(plugin.manifest.id)
      }
    },
    [enablePlugin, disablePlugin]
  )

  // 卸载插件
  const handleUninstall = useCallback(
    async (plugin: InstalledPlugin) => {
      if (window.confirm(`确定要卸载插件 "${plugin.manifest.name}" 吗？`)) {
        await uninstallPlugin(plugin.manifest.id)
      }
    },
    [uninstallPlugin]
  )

  if (!open) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>插件市场</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.tabs}>
          <button
            className={activeTab === 'installed' ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab('installed')}
          >
            <Package size={16} />
            已安装
            {installedList.length > 0 && (
              <span className={styles.badge}>{installedList.length}</span>
            )}
          </button>
          <button
            className={activeTab === 'market' ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab('market')}
          >
            <Star size={16} />
            市场
          </button>
        </div>

        {activeTab === 'market' && (
          <div className={styles.searchBar}>
            <Search size={16} />
            <input
              type="text"
              placeholder="搜索插件..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              className={styles.refreshButton}
              onClick={handleRefreshMarket}
              disabled={isLoadingMarket}
            >
              <RefreshCw size={16} className={isLoadingMarket ? styles.spinning : ''} />
            </button>
          </div>
        )}

        <div className={styles.content}>
          {activeTab === 'installed' && (
            <div className={styles.pluginList}>
              {isLoading ? (
                <div className={styles.empty}>加载中...</div>
              ) : installedList.length === 0 ? (
                <div className={styles.empty}>
                  <Package size={48} />
                  <p>暂无已安装的插件</p>
                  <button onClick={() => setActiveTab('market')}>浏览市场</button>
                </div>
              ) : (
                installedList.map((plugin) => (
                  <div key={plugin.manifest.id} className={styles.pluginCard}>
                    <div className={styles.pluginIcon}>
                      {plugin.manifest.icon || '📦'}
                    </div>
                    <div className={styles.pluginInfo}>
                      <div className={styles.pluginHeader}>
                        <h3>{plugin.manifest.name}</h3>
                        <span className={styles.version}>v{plugin.manifest.version}</span>
                        <span
                          className={`${styles.status} ${
                            plugin.state === 'active' ? styles.statusActive : styles.statusInactive
                          }`}
                        >
                          {plugin.state === 'active' ? '运行中' : plugin.state}
                        </span>
                      </div>
                      <p className={styles.pluginDescription}>{plugin.manifest.description}</p>
                      <div className={styles.pluginMeta}>
                        <span>作者: {plugin.manifest.author}</span>
                      </div>
                    </div>
                    <div className={styles.pluginActions}>
                      <button
                        className={styles.actionButton}
                        onClick={() => handleToggleEnable(plugin)}
                        title={plugin.enabled ? '禁用' : '启用'}
                      >
                        {plugin.enabled ? <PowerOff size={16} /> : <Power size={16} />}
                      </button>
                      <button
                        className={`${styles.actionButton} ${styles.danger}`}
                        onClick={() => handleUninstall(plugin)}
                        title="卸载"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'market' && (
            <div className={styles.pluginList}>
              {isLoadingMarket ? (
                <div className={styles.empty}>加载中...</div>
              ) : enrichedMarketPlugins.length === 0 ? (
                <div className={styles.empty}>
                  <Search size={48} />
                  <p>未找到匹配的插件</p>
                </div>
              ) : (
                enrichedMarketPlugins.map((plugin) => (
                  <div key={plugin.id} className={styles.pluginCard}>
                    <div className={styles.pluginIcon}>{plugin.icon || '📦'}</div>
                    <div className={styles.pluginInfo}>
                      <div className={styles.pluginHeader}>
                        <h3>{plugin.name}</h3>
                        <span className={styles.version}>v{plugin.version}</span>
                        {plugin.installed && (
                          <span className={styles.installedBadge}>已安装</span>
                        )}
                      </div>
                      <p className={styles.pluginDescription}>{plugin.description}</p>
                      <div className={styles.pluginMeta}>
                        <span>作者: {plugin.author}</span>
                        <span>下载: {plugin.downloads}</span>
                        <span>⭐ {plugin.rating}</span>
                      </div>
                      {plugin.keywords && (
                        <div className={styles.keywords}>
                          {plugin.keywords.map((keyword) => (
                            <span key={keyword} className={styles.keyword}>
                              {keyword}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className={styles.pluginActions}>
                      {plugin.installed ? (
                        <button className={styles.installedButton} disabled>
                          已安装
                        </button>
                      ) : (
                        <button
                          className={styles.installButton}
                          onClick={() => handleInstall(plugin)}
                        >
                          <Download size={16} />
                          安装
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
