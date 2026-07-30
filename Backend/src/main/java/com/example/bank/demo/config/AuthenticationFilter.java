package com.example.bank.demo.config;

import com.example.bank.demo.model.User;
import com.example.bank.demo.service.UserService;
import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import java.io.IOException;

@Component
public class AuthenticationFilter implements Filter {

    @Autowired
    private UserService userService;

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        String path = httpRequest.getRequestURI();
        String method = httpRequest.getMethod();

        // Autoriser les requêtes OPTIONS (preflight CORS)
        if ("OPTIONS".equalsIgnoreCase(method)) {
            chain.doFilter(request, response);
            return;
        }

        // Autoriser les routes d'authentification publique et la console H2
        if (path.startsWith("/api/auth/") || path.equals("/error") || path.contains("/h2-console")) {
            chain.doFilter(request, response);
            return;
        }

        // Sécuriser toutes les routes /api/
        if (path.startsWith("/api/")) {
            String authHeader = httpRequest.getHeader("Authorization");
            if (authHeader == null || !authHeader.startsWith("Basic ")) {
                httpResponse.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                httpResponse.setContentType("application/json;charset=UTF-8");
                httpResponse.getWriter().write("{\"error\":\"Session périmée ou authentification requise\"}");
                return;
            }

            try {
                User user = userService.authenticate(authHeader);

                // Vérification du rôle par rapport au chemin d'accès
                if (path.startsWith("/api/admin/") && !userService.isAdmin(user.getUsername())) {
                    httpResponse.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    httpResponse.setContentType("application/json;charset=UTF-8");
                    httpResponse.getWriter().write("{\"error\":\"Accès refusé : rôle administrateur requis\"}");
                    return;
                }

                if (path.startsWith("/api/cashier/") && !userService.isCashier(user.getUsername())) {
                    httpResponse.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    httpResponse.setContentType("application/json;charset=UTF-8");
                    httpResponse.getWriter().write("{\"error\":\"Accès refusé : rôle caissier requis\"}");
                    return;
                }

                if (path.startsWith("/api/director/") && !userService.isDirector(user.getUsername())) {
                    httpResponse.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    httpResponse.setContentType("application/json;charset=UTF-8");
                    httpResponse.getWriter().write("{\"error\":\"Accès refusé : rôle directeur requis\"}");
                    return;
                }

            } catch (Exception e) {
                httpResponse.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                httpResponse.setContentType("application/json;charset=UTF-8");
                httpResponse.getWriter().write("{\"error\":\"Identifiants incorrects ou session expirée\"}");
                return;
            }
        }

        chain.doFilter(request, response);
    }
}
