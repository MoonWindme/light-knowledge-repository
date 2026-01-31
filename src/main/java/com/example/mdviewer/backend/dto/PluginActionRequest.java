package com.example.mdviewer.backend.dto;

/**
 * 插件操作请求 DTO
 */
public record PluginActionRequest(
    String pluginId,
    Boolean enabled
) {}
