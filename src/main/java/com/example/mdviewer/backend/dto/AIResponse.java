package com.example.mdviewer.backend.dto;

/**
 * AI 响应 DTO
 */
public record AIResponse(
    boolean success,
    String result,
    String error
) {
    public static AIResponse success(String result) {
        return new AIResponse(true, result, null);
    }
    
    public static AIResponse error(String message) {
        return new AIResponse(false, null, message);
    }
}
