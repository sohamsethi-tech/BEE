package com.pothole.backend.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;

import javax.sql.DataSource;
import java.net.URI;
import java.net.URISyntaxException;

/**
 * Render sets DATABASE_URL as postgres://user:pass@host:port/dbname
 */
@Configuration
@Profile("prod")
public class RenderDataSourceConfig {

    @Bean
    @Primary
    public DataSource dataSource(@Value("${DATABASE_URL:}") String databaseUrl)
            throws URISyntaxException {
        if (databaseUrl == null || databaseUrl.isBlank()) {
            throw new IllegalStateException("DATABASE_URL is required in prod (link Postgres on Render).");
        }

        String normalized = databaseUrl;
        if (normalized.startsWith("postgres://")) {
            normalized = "postgresql://" + normalized.substring("postgres://".length());
        }

        URI uri = new URI(normalized);
        String userInfo = uri.getUserInfo();
        String username = "";
        String password = "";
        if (userInfo != null && userInfo.contains(":")) {
            int colon = userInfo.indexOf(':');
            username = userInfo.substring(0, colon);
            password = userInfo.substring(colon + 1);
        }

        int port = uri.getPort() > 0 ? uri.getPort() : 5432;
        String jdbcUrl = "jdbc:postgresql://" + uri.getHost() + ':' + port + uri.getPath();

        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(jdbcUrl);
        config.setUsername(username);
        config.setPassword(password);
        config.setDriverClassName("org.postgresql.Driver");
        config.setMaximumPoolSize(5);
        return new HikariDataSource(config);
    }
}
