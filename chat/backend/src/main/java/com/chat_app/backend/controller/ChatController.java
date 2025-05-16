package com.chat_app.backend.controller;

import com.chat_app.backend.model.Message;
import com.chat_app.backend.repository.MessageRepository;
import com.chat_app.backend.service.RedisMessagePublisher;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

import java.time.LocalDateTime;
import java.util.List;

@Controller
public class ChatController {

    @Autowired
    private MessageRepository messageRepository;
    
    @Autowired
    private RedisMessagePublisher redisMessagePublisher;

    @MessageMapping("/chat.sendMessage")
    // Am eliminat @SendTo - Redis se ocupă de distribuție
    public void sendMessage(Message message) {
        message.setTimestamp(LocalDateTime.now());
        messageRepository.save(message);
        
        // Redis va distribui mesajul către toate podurile
        redisMessagePublisher.publish(message);
    }

    @MessageMapping("/chat.getMessages")
    @SendTo("/topic/messages")
    public List<Message> getMessages() {
        return messageRepository.findAllByOrderByTimestampAsc();
    }
}