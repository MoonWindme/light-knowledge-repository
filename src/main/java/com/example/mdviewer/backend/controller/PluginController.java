package com.example.mdviewer.backend.controller;

import com.example.mdviewer.backend.dto.PluginActionRequest;
import com.example.mdviewer.backend.dto.PluginMetadataDto;
import com.example.mdviewer.backend.service.PluginService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 插件 API 控制器
 */
@RestController
@RequestMapping("/api/plugins")
@CrossOrigin
public class PluginController {
    
    private final PluginService pluginService;
    
    public PluginController(PluginService pluginService) {
        this.pluginService = pluginService;
    }
    
    /**
     * 获取已安装的插件列表
     */
    @GetMapping
    public List<PluginMetadataDto> getInstalledPlugins() {
        return pluginService.getInstalledPlugins();
    }
    
    /**
     * 获取市场插件列表
     */
    @GetMapping("/market")
    public List<PluginMetadataDto> getMarketPlugins(
        @RequestParam(required = false) String search
    ) {
        return pluginService.getMarketPlugins(search);
    }
    
    /**
     * 安装插件
     */
    @PostMapping("/install")
    public PluginMetadataDto installPlugin(@RequestBody PluginActionRequest request) {
        return pluginService.installPlugin(request.pluginId());
    }
    
    /**
     * 卸载插件
     */
    @DeleteMapping("/{pluginId}")
    public ResponseEntity<Void> uninstallPlugin(@PathVariable String pluginId) {
        pluginService.uninstallPlugin(pluginId);
        return ResponseEntity.noContent().build();
    }
    
    /**
     * 启用/禁用插件
     */
    @PutMapping("/{pluginId}/enable")
    public PluginMetadataDto setPluginEnabled(
        @PathVariable String pluginId,
        @RequestBody PluginActionRequest request
    ) {
        return pluginService.setPluginEnabled(pluginId, Boolean.TRUE.equals(request.enabled()));
    }
}
