package com.example.mdviewer.backend.dto;

import java.util.List;

/**
 * 插件元数据 DTO
 */
public record PluginMetadataDto(
    String id,
    String name,
    String version,
    String description,
    String author,
    String icon,
    List<String> keywords,
    String repository,
    String homepage,
    String license,
    // 市场信息
    Integer downloads,
    Double rating,
    // 安装状态
    Boolean installed,
    String installedVersion,
    Boolean enabled,
    String state
) {
    /**
     * 创建市场插件 DTO
     */
    public static PluginMetadataDto marketPlugin(
        String id,
        String name,
        String version,
        String description,
        String author,
        String icon,
        List<String> keywords,
        int downloads,
        double rating
    ) {
        return new PluginMetadataDto(
            id, name, version, description, author, icon, keywords,
            null, null, null,
            downloads, rating,
            false, null, null, null
        );
    }
    
    /**
     * 创建已安装插件 DTO
     */
    public static PluginMetadataDto installedPlugin(
        String id,
        String name,
        String version,
        String description,
        String author,
        boolean enabled,
        String state
    ) {
        return new PluginMetadataDto(
            id, name, version, description, author, null, null,
            null, null, null,
            null, null,
            true, version, enabled, state
        );
    }
}
