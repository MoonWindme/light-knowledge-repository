package com.example.mdviewer.backend.dto;

/**
 * AI 请求 DTO
 */
public record AIRequest(
    String text,
    String action,    // complete, translate, grammar
    String targetLang // 目标语言（翻译时使用）: zh, en
) {}
