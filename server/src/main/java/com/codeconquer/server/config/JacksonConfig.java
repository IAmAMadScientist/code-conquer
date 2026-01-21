package com.codeconquer.server.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * The project uses spring-boot-starter-webmvc instead of spring-boot-starter-web.
 * In this setup an ObjectMapper bean is not always auto-configured.
 * We provide it explicitly so services can safely inject it.
 */
@Configuration
public class JacksonConfig {

    @Bean
    public ObjectMapper objectMapper() {
        // Register JavaTimeModule etc. when present
        return new ObjectMapper().findAndRegisterModules();
    }
}
