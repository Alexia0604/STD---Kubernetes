package com.chat_app.backend.service;

import com.chat_app.backend.model.Message;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.annotation.PostConstruct;

@Service
public class RedisMessagePublisher implements MessageListener {
    
    private static final Logger logger = LoggerFactory.getLogger(RedisMessagePublisher.class);
    private static final String CHAT_CHANNEL = "chat-messages";
    
    private final String POD_NAME = System.getenv("POD_NAME") != null ? System.getenv("POD_NAME") : "local-dev";

    @Autowired
    private RedisTemplate<String, String> redisTemplate;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private RedisMessageListenerContainer redisMessageListenerContainer;

    @Autowired
    private ObjectMapper objectMapper;

    @PostConstruct
    public void init() {
        System.out.println("=== INITIALIZING REDIS MESSAGE LISTENER ===");
        
        // Înregistrează acest service direct ca MessageListener
        redisMessageListenerContainer.addMessageListener(this, new ChannelTopic(CHAT_CHANNEL));
        logger.info("[{}] Redis message listener initialized on channel: {}", POD_NAME, CHAT_CHANNEL);
    }

    public void publish(Message message) {
        try {
            logger.info("[{}] Publishing message to Redis - User: {}, Content: {}", 
                        POD_NAME, message.getUsername(), message.getContent());
            
            // Convert message to JSON
            String messageJson = objectMapper.writeValueAsString(message);
            
            // Publish to Redis
            redisTemplate.convertAndSend(CHAT_CHANNEL, messageJson);
            
            logger.info("[{}] Message published to Redis successfully", POD_NAME);
        } catch (Exception e) {
            logger.error("[{}] Error publishing message to Redis: {}", POD_NAME, e.getMessage(), e);
        }
    }

    @Override
    public void onMessage(org.springframework.data.redis.connection.Message redisMessage, byte[] pattern) {
        try {
            String messageJson = new String(redisMessage.getBody());
            logger.info("[{}] Raw message received from Redis: {}", POD_NAME, messageJson);
            
            Message message = objectMapper.readValue(messageJson, Message.class);
            logger.info("[{}] Parsed message from Redis - User: {}, Content: {}", 
                        POD_NAME, message.getUsername(), message.getContent());
            
            // Broadcast to all WebSocket clients
            messagingTemplate.convertAndSend("/topic/messages", message);
            logger.info("[{}] Broadcasted message to WebSocket clients on /topic/messages", POD_NAME);
            
        } catch (Exception e) {
            logger.error("[{}] Error processing Redis message: {}", POD_NAME, e.getMessage(), e);
        }
    }
}