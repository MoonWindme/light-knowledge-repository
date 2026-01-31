package com.example.mdviewer.backend.service;

import com.example.mdviewer.backend.dto.PluginMetadataDto;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 插件服务
 * 管理插件的安装、启用、禁用和市场信息
 */
@Service
public class PluginService {
    
    // 已安装的插件（模拟数据库）
    private final Map<String, InstalledPluginInfo> installedPlugins = new ConcurrentHashMap<>();
    
    // 市场插件列表（模拟远程市场）
    private final List<PluginMetadataDto> marketPlugins;
    
    public PluginService() {
        // 初始化市场插件
        marketPlugins = List.of(
            PluginMetadataDto.marketPlugin(
                "ai-assistant",
                "AI 辅助写作",
                "1.0.0",
                "智能续写、翻译、语法检查等 AI 辅助功能",
                "Markdown Notes",
                "✨",
                List.of("AI", "写作", "翻译"),
                1200,
                4.8
            ),
            PluginMetadataDto.marketPlugin(
                "theme-pack",
                "主题包",
                "1.0.0",
                "多种编辑器和预览主题",
                "Markdown Notes",
                "🎨",
                List.of("主题", "样式"),
                890,
                4.5
            ),
            PluginMetadataDto.marketPlugin(
                "image-upload",
                "图片上传",
                "1.0.0",
                "支持拖拽上传图片到云存储",
                "Community",
                "📷",
                List.of("图片", "上传", "云存储"),
                560,
                4.2
            ),
            PluginMetadataDto.marketPlugin(
                "export-docx",
                "Word 导出",
                "1.0.0",
                "导出 Markdown 为 Word 文档",
                "Community",
                "📄",
                List.of("导出", "Word", "docx"),
                430,
                4.0
            ),
            PluginMetadataDto.marketPlugin(
                "git-sync",
                "Git 同步",
                "1.0.0",
                "自动同步笔记到 Git 仓库",
                "Community",
                "📂",
                List.of("Git", "同步", "备份"),
                320,
                4.1
            )
        );
    }
    
    /**
     * 获取已安装的插件列表
     */
    public List<PluginMetadataDto> getInstalledPlugins() {
        return installedPlugins.values().stream()
            .map(info -> PluginMetadataDto.installedPlugin(
                info.id,
                info.name,
                info.version,
                info.description,
                info.author,
                info.enabled,
                info.state
            ))
            .toList();
    }
    
    /**
     * 获取市场插件列表
     */
    public List<PluginMetadataDto> getMarketPlugins(String search) {
        var result = marketPlugins.stream();
        
        if (search != null && !search.isBlank()) {
            String query = search.toLowerCase();
            result = result.filter(plugin -> 
                plugin.name().toLowerCase().contains(query) ||
                plugin.description().toLowerCase().contains(query) ||
                (plugin.keywords() != null && plugin.keywords().stream()
                    .anyMatch(k -> k.toLowerCase().contains(query)))
            );
        }
        
        // 标记已安装状态
        return result.map(plugin -> {
            var installed = installedPlugins.get(plugin.id());
            if (installed != null) {
                return new PluginMetadataDto(
                    plugin.id(),
                    plugin.name(),
                    plugin.version(),
                    plugin.description(),
                    plugin.author(),
                    plugin.icon(),
                    plugin.keywords(),
                    plugin.repository(),
                    plugin.homepage(),
                    plugin.license(),
                    plugin.downloads(),
                    plugin.rating(),
                    true,
                    installed.version,
                    installed.enabled,
                    installed.state
                );
            }
            return plugin;
        }).toList();
    }
    
    /**
     * 安装插件
     */
    public PluginMetadataDto installPlugin(String pluginId) {
        // 查找市场插件
        var marketPlugin = marketPlugins.stream()
            .filter(p -> p.id().equals(pluginId))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("插件不存在: " + pluginId));
        
        if (installedPlugins.containsKey(pluginId)) {
            throw new IllegalStateException("插件已安装: " + pluginId);
        }
        
        // 模拟安装
        var info = new InstalledPluginInfo(
            marketPlugin.id(),
            marketPlugin.name(),
            marketPlugin.version(),
            marketPlugin.description(),
            marketPlugin.author(),
            true,
            "active"
        );
        installedPlugins.put(pluginId, info);
        
        return PluginMetadataDto.installedPlugin(
            info.id, info.name, info.version, info.description, info.author, info.enabled, info.state
        );
    }
    
    /**
     * 卸载插件
     */
    public void uninstallPlugin(String pluginId) {
        if (!installedPlugins.containsKey(pluginId)) {
            throw new IllegalArgumentException("插件未安装: " + pluginId);
        }
        installedPlugins.remove(pluginId);
    }
    
    /**
     * 启用/禁用插件
     */
    public PluginMetadataDto setPluginEnabled(String pluginId, boolean enabled) {
        var info = installedPlugins.get(pluginId);
        if (info == null) {
            throw new IllegalArgumentException("插件未安装: " + pluginId);
        }
        
        info.enabled = enabled;
        info.state = enabled ? "active" : "inactive";
        
        return PluginMetadataDto.installedPlugin(
            info.id, info.name, info.version, info.description, info.author, info.enabled, info.state
        );
    }
    
    /**
     * 已安装插件信息（内部类）
     */
    private static class InstalledPluginInfo {
        String id;
        String name;
        String version;
        String description;
        String author;
        boolean enabled;
        String state;
        
        InstalledPluginInfo(String id, String name, String version, String description, 
                           String author, boolean enabled, String state) {
            this.id = id;
            this.name = name;
            this.version = version;
            this.description = description;
            this.author = author;
            this.enabled = enabled;
            this.state = state;
        }
    }
}
