package com.chat_app.backend.controller;

import com.chat_app.backend.model.Message;
import com.chat_app.backend.repository.MessageRepository;
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

    @MessageMapping("/chat.sendMessage")
    @SendTo("/topic/messages")
    public Message sendMessage(Message message) {
        message.setTimestamp(LocalDateTime.now());
        messageRepository.save(message);
        return message;
    }

    @MessageMapping("/chat.getMessages")
    @SendTo("/topic/messages")
    public List<Message> getMessages() {
        return messageRepository.findAllByOrderByTimestampAsc();
    }
}