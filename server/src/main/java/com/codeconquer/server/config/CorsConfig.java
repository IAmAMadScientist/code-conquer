package com.codeconquer.server.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig {

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**")
                        // For deployment, the frontend is typically served from the same origin
                        // and /api is reverse-proxied to this backend. For dev and flexible hosting,
                        // allow any origin.
                        .allowedOriginPatterns("*")
                        .allowedMethods("*");
            }
        };
    }
}
