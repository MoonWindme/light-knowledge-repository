package com.example.mdviewer.backend.dto;

/**
 * AI 配置请求 DTO
 */
public record AIConfigRequest(
    String provider,
    String apiKey,
    String apiUrl,
    String model
) {}
