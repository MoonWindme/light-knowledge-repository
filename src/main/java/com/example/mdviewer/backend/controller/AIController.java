package com.example.mdviewer.backend.controller;

import com.example.mdviewer.backend.dto.AIConfigRequest;
import com.example.mdviewer.backend.dto.AIRequest;
import com.example.mdviewer.backend.dto.AIResponse;
import com.example.mdviewer.backend.service.AIService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * AI API 控制器
 */
@RestController
@RequestMapping("/api/ai")
@CrossOrigin
public class AIController {
    
    private final AIService aiService;
    
    public AIController(AIService aiService) {
        this.aiService = aiService;
    }
    
    /**
     * 获取当前 AI 配置
     */
    @GetMapping("/config")
    public Map<String, String> getConfig() {
        return aiService.getConfig();
    }
    
    /**
     * 更新 AI 配置
     */
    @PostMapping("/config")
    public AIResponse updateConfig(@RequestBody AIConfigRequest config) {
        aiService.updateConfig(config);
        return AIResponse.success("配置已更新");
    }
    
    /**
     * 测试 AI 连接
     */
    @PostMapping("/test")
    public AIResponse testConnection(@RequestBody AIConfigRequest config) {
        return aiService.testConnection(config);
    }
    
    /**
     * 智能续写
     */
    @PostMapping("/complete")
    public AIResponse complete(@RequestBody AIRequest request) {
        return aiService.complete(request.text());
    }
    
    /**
     * 翻译
     */
    @PostMapping("/translate")
    public AIResponse translate(@RequestBody AIRequest request) {
        return aiService.translate(request.text(), request.targetLang());
    }
    
    /**
     * 语法检查
     */
    @PostMapping("/grammar")
    public AIResponse grammar(@RequestBody AIRequest request) {
        return aiService.checkGrammar(request.text());
    }
    
    /**
     * AI 对话
     */
    @PostMapping("/chat")
    public AIResponse chat(@RequestBody AIRequest request) {
        return aiService.chat(request.text());
    }
}
