package com.example.mdviewer.backend.service;

import com.example.mdviewer.backend.config.NotesProperties;
import com.example.mdviewer.backend.dto.AIConfigRequest;
import com.example.mdviewer.backend.dto.AIResponse;
import jakarta.annotation.PostConstruct;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.concurrent.ConcurrentHashMap;

/**
 * AI 服务
 * 支持多种 AI 提供商：OpenAI, DeepSeek, GLM, Gemini, Moonshot, Qwen 等
 */
@Service
public class AIService {
    
    private static final String CONFIG_FILE_NAME = ".ai-config.properties";
    
    // 运行时配置存储
    private final Map<String, String> runtimeConfig = new ConcurrentHashMap<>();
    
    private final RestTemplate restTemplate = new RestTemplate();
    private final NotesProperties notesProperties;
    
    public AIService(NotesProperties notesProperties) {
        this.notesProperties = notesProperties;
        // 默认配置
        runtimeConfig.put("provider", "mock");
        runtimeConfig.put("apiKey", "");
        runtimeConfig.put("apiUrl", "");
        runtimeConfig.put("model", "");
    }
    
    /**
     * 服务启动时加载配置文件
     */
    @PostConstruct
    public void loadConfigFromFile() {
        Path configPath = getConfigFilePath();
        if (Files.exists(configPath)) {
            try (InputStream in = Files.newInputStream(configPath)) {
                Properties props = new Properties();
                props.load(in);
                for (String key : props.stringPropertyNames()) {
                    runtimeConfig.put(key, props.getProperty(key));
                }
                System.out.println("AI 配置已从文件加载: " + configPath);
            } catch (IOException e) {
                System.err.println("加载 AI 配置文件失败: " + e.getMessage());
            }
        }
    }
    
    /**
     * 保存配置到文件
     */
    private void saveConfigToFile() {
        Path configPath = getConfigFilePath();
        try {
            // 确保目录存在
            Files.createDirectories(configPath.getParent());
            Properties props = new Properties();
            runtimeConfig.forEach(props::setProperty);
            try (OutputStream out = Files.newOutputStream(configPath)) {
                props.store(out, "AI Configuration");
            }
        } catch (IOException e) {
            System.err.println("保存 AI 配置文件失败: " + e.getMessage());
        }
    }
    
    /**
     * 获取配置文件路径
     */
    private Path getConfigFilePath() {
        return notesProperties.getRoot().resolve(CONFIG_FILE_NAME);
    }
    
    /**
     * 更新 AI 配置
     */
    public void updateConfig(AIConfigRequest config) {
        if (config.provider() != null) {
            runtimeConfig.put("provider", config.provider());
        }
        if (config.apiKey() != null) {
            runtimeConfig.put("apiKey", config.apiKey());
        }
        if (config.apiUrl() != null) {
            runtimeConfig.put("apiUrl", config.apiUrl());
        }
        if (config.model() != null) {
            runtimeConfig.put("model", config.model());
        }
        // 保存到文件
        saveConfigToFile();
    }
    
    /**
     * 获取当前配置（隐藏 API Key）
     */
    public Map<String, String> getConfig() {
        return Map.of(
            "provider", runtimeConfig.getOrDefault("provider", "mock"),
            "apiUrl", runtimeConfig.getOrDefault("apiUrl", ""),
            "model", runtimeConfig.getOrDefault("model", ""),
            "hasApiKey", String.valueOf(!runtimeConfig.getOrDefault("apiKey", "").isBlank())
        );
    }
    
    /**
     * 测试 AI 连接
     */
    public AIResponse testConnection(AIConfigRequest config) {
        String apiKey = config.apiKey();
        String apiUrl = config.apiUrl();
        String model = config.model();
        String provider = config.provider();
        
        if (apiKey == null || apiKey.isBlank()) {
            return AIResponse.error("API Key 不能为空");
        }
        
        if (apiUrl == null || apiUrl.isBlank()) {
            return AIResponse.error("API 地址不能为空");
        }
        
        try {
            // 根据提供商调用测试
            if ("gemini".equals(provider)) {
                return testGemini(apiKey, apiUrl, model);
            } else if ("zhipu".equals(provider)) {
                return testZhipu(apiKey, apiUrl, model);
            } else {
                return testOpenAICompatible(apiKey, apiUrl, model);
            }
        } catch (Exception e) {
            return AIResponse.error("连接失败: " + e.getMessage());
        }
    }
    
    /**
     * 智能续写
     */
    public AIResponse complete(String text) {
        if (text == null || text.isBlank()) {
            return AIResponse.error("文本不能为空");
        }
        
        String provider = runtimeConfig.get("provider");
        if ("mock".equals(provider) || runtimeConfig.get("apiKey").isBlank()) {
            return mockComplete(text);
        }
        
        String prompt = "请续写以下文本，保持风格和语调一致，直接输出续写内容：\n\n" + text;
        return callAI(prompt);
    }
    
    /**
     * 翻译
     */
    public AIResponse translate(String text, String targetLang) {
        if (text == null || text.isBlank()) {
            return AIResponse.error("文本不能为空");
        }
        
        if (targetLang == null || (!targetLang.equals("zh") && !targetLang.equals("en"))) {
            targetLang = "zh";
        }
        
        String provider = runtimeConfig.get("provider");
        if ("mock".equals(provider) || runtimeConfig.get("apiKey").isBlank()) {
            return mockTranslate(text, targetLang);
        }
        
        String lang = "zh".equals(targetLang) ? "中文" : "英文";
        String prompt = "请将以下文本翻译成" + lang + "，只输出翻译结果：\n\n" + text;
        return callAI(prompt);
    }
    
    /**
     * 语法检查
     */
    public AIResponse checkGrammar(String text) {
        if (text == null || text.isBlank()) {
            return AIResponse.error("文本不能为空");
        }
        
        String provider = runtimeConfig.get("provider");
        if ("mock".equals(provider) || runtimeConfig.get("apiKey").isBlank()) {
            return mockGrammar(text);
        }
        
        String prompt = "请检查以下文本的语法错误并改正，只返回修正后的文本：\n\n" + text;
        return callAI(prompt);
    }
    
    /**
     * AI 对话
     */
    public AIResponse chat(String text) {
        if (text == null || text.isBlank()) {
            return AIResponse.error("消息不能为空");
        }
        
        String provider = runtimeConfig.get("provider");
        if ("mock".equals(provider) || runtimeConfig.get("apiKey").isBlank()) {
            return mockChat(text);
        }
        
        return callAI(text);
    }
    
    /**
     * 调用 AI API（OpenAI 兼容格式）
     */
    private AIResponse callAI(String prompt) {
        String apiKey = runtimeConfig.get("apiKey");
        String apiUrl = runtimeConfig.get("apiUrl");
        String model = runtimeConfig.get("model");
        String provider = runtimeConfig.get("provider");
        
        if (apiKey == null || apiKey.isBlank()) {
            return AIResponse.error("请先在 AI 设置中配置 API Key");
        }
        
        try {
            if ("gemini".equals(provider)) {
                return callGemini(apiKey, apiUrl, model, prompt);
            } else if ("zhipu".equals(provider)) {
                return callZhipu(apiKey, apiUrl, model, prompt);
            } else {
                return callOpenAICompatible(apiKey, apiUrl, model, prompt);
            }
        } catch (Exception e) {
            return AIResponse.error("AI 调用失败: " + e.getMessage());
        }
    }
    
    /**
     * 调用 OpenAI 兼容 API（OpenAI, DeepSeek, GLM, Moonshot, Qwen 等）
     */
    private AIResponse callOpenAICompatible(String apiKey, String apiUrl, String model, String prompt) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);
        
        Map<String, Object> requestBody = Map.of(
            "model", model != null && !model.isBlank() ? model : "gpt-3.5-turbo",
            "messages", List.of(
                Map.of("role", "user", "content", prompt)
            ),
            "max_tokens", 2000,
            "temperature", 0.7
        );
        
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
        
        @SuppressWarnings("unchecked")
        Map<String, Object> response = restTemplate.postForObject(apiUrl, entity, Map.class);
        
        if (response != null) {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
            if (choices != null && !choices.isEmpty()) {
                @SuppressWarnings("unchecked")
                Map<String, String> message = (Map<String, String>) choices.get(0).get("message");
                if (message != null) {
                    return AIResponse.success(message.get("content"));
                }
            }
        }
        
        return AIResponse.error("AI 响应格式错误");
    }
    
    /**
     * 调用 Google Gemini API
     */
    private AIResponse callGemini(String apiKey, String apiUrl, String model, String prompt) {
        // Gemini API 使用不同的格式
        String url = apiUrl.replace("{model}", model != null ? model : "gemini-1.5-flash");
        url = url + "?key=" + apiKey;
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        
        Map<String, Object> requestBody = Map.of(
            "contents", List.of(
                Map.of("parts", List.of(
                    Map.of("text", prompt)
                ))
            )
        );
        
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
        
        @SuppressWarnings("unchecked")
        Map<String, Object> response = restTemplate.postForObject(url, entity, Map.class);
        
        if (response != null) {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
            if (candidates != null && !candidates.isEmpty()) {
                @SuppressWarnings("unchecked")
                Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
                if (content != null) {
                    @SuppressWarnings("unchecked")
                    List<Map<String, String>> parts = (List<Map<String, String>>) content.get("parts");
                    if (parts != null && !parts.isEmpty()) {
                        return AIResponse.success(parts.get(0).get("text"));
                    }
                }
            }
        }
        
        return AIResponse.error("Gemini 响应格式错误");
    }
    
    /**
     * 调用智谱 AI (GLM) API - 使用 JWT 认证
     */
    private AIResponse callZhipu(String apiKey, String apiUrl, String model, String prompt) {
        String token = generateZhipuToken(apiKey);
        if (token == null) {
            return AIResponse.error("智谱 API Key 格式错误，应为 {id}.{secret} 格式");
        }
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);
        
        Map<String, Object> requestBody = Map.of(
            "model", model != null && !model.isBlank() ? model : "glm-4-flash",
            "messages", List.of(
                Map.of("role", "user", "content", prompt)
            ),
            "max_tokens", 2000,
            "temperature", 0.7
        );
        
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
        
        @SuppressWarnings("unchecked")
        Map<String, Object> response = restTemplate.postForObject(apiUrl, entity, Map.class);
        
        if (response != null) {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
            if (choices != null && !choices.isEmpty()) {
                @SuppressWarnings("unchecked")
                Map<String, String> message = (Map<String, String>) choices.get(0).get("message");
                if (message != null) {
                    return AIResponse.success(message.get("content"));
                }
            }
        }
        
        return AIResponse.error("智谱 AI 响应格式错误");
    }
    
    /**
     * 生成智谱 AI JWT Token
     * API Key 格式: {api_key_id}.{api_key_secret}
     */
    private String generateZhipuToken(String apiKey) {
        try {
            String[] parts = apiKey.split("\\.");
            if (parts.length != 2) {
                return null;
            }
            
            String apiKeyId = parts[0];
            String apiKeySecret = parts[1];
            
            long now = System.currentTimeMillis();
            long exp = now + 3600 * 1000; // 1小时过期
            
            // JWT Header
            String header = Base64.getUrlEncoder().withoutPadding().encodeToString(
                "{\"alg\":\"HS256\",\"sign_type\":\"SIGN\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8)
            );
            
            // JWT Payload
            String payload = Base64.getUrlEncoder().withoutPadding().encodeToString(
                String.format("{\"api_key\":\"%s\",\"exp\":%d,\"timestamp\":%d}", apiKeyId, exp, now)
                    .getBytes(StandardCharsets.UTF_8)
            );
            
            // JWT Signature
            String signContent = header + "." + payload;
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(apiKeySecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKeySpec);
            byte[] signatureBytes = mac.doFinal(signContent.getBytes(StandardCharsets.UTF_8));
            String signature = Base64.getUrlEncoder().withoutPadding().encodeToString(signatureBytes);
            
            return signContent + "." + signature;
        } catch (Exception e) {
            return null;
        }
    }
    
    /**
     * 测试智谱 AI 连接
     */
    private AIResponse testZhipu(String apiKey, String apiUrl, String model) {
        try {
            AIResponse response = callZhipu(apiKey, apiUrl, model, "你好，请回复 OK");
            if (response.success()) {
                return AIResponse.success("连接成功");
            }
            return response;
        } catch (Exception e) {
            return AIResponse.error("连接失败: " + e.getMessage());
        }
    }
    
    /**
     * 测试 OpenAI 兼容 API
     */
    private AIResponse testOpenAICompatible(String apiKey, String apiUrl, String model) {
        try {
            AIResponse response = callOpenAICompatible(apiKey, apiUrl, model, "Hello, this is a test. Reply with 'OK'.");
            if (response.success()) {
                return AIResponse.success("连接成功");
            }
            return response;
        } catch (Exception e) {
            return AIResponse.error("连接失败: " + e.getMessage());
        }
    }
    
    /**
     * 测试 Gemini API
     */
    private AIResponse testGemini(String apiKey, String apiUrl, String model) {
        try {
            AIResponse response = callGemini(apiKey, apiUrl, model, "Hello, this is a test. Reply with 'OK'.");
            if (response.success()) {
                return AIResponse.success("连接成功");
            }
            return response;
        } catch (Exception e) {
            return AIResponse.error("连接失败: " + e.getMessage());
        }
    }
    
    // ========== Mock 实现（演示用）==========
    
    private AIResponse mockComplete(String text) {
        String continuation = "\n\n[AI 续写示例] 这是模拟的续写内容。请在 AI 设置中配置真实的 API Key 以获得实际的 AI 响应。";
        return AIResponse.success(text + continuation);
    }
    
    private AIResponse mockTranslate(String text, String targetLang) {
        if ("zh".equals(targetLang)) {
            return AIResponse.success("[翻译示例] 这是 \"" + text + "\" 的中文翻译。请配置 AI API 以获得真实翻译。");
        } else {
            return AIResponse.success("[Translation Example] This is the English translation of \"" + text + "\". Please configure AI API for real translation.");
        }
    }
    
    private AIResponse mockGrammar(String text) {
        return AIResponse.success("[语法检查示例]\n" + text + "\n\n请配置 AI API 以获得真实的语法检查结果。");
    }
    
    private AIResponse mockChat(String text) {
        return AIResponse.success("你好！我是 AI 助手（演示模式）。\n\n你说的是：\"" + text.substring(0, Math.min(50, text.length())) + "...\"\n\n请在 AI 设置中配置 API Key 以启用真实的 AI 对话功能。");
    }
}
