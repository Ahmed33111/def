package com.example.bank.demo;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class DemoApplicationTests {

	@Autowired
	private MockMvc mockMvc;

	@Test
	void contextLoads() {
	}

	@Test
	void rootEndpointReturnsBackendStatus() throws Exception {
		mockMvc.perform(get("/"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.application").value("AppBancaire Backend"))
			.andExpect(jsonPath("$.loginEndpoint").value("/api/auth/login"));
	}

	@Test
	void loginEndpointAuthenticatesDefaultAdmin() throws Exception {
		String credentials = Base64.getEncoder()
			.encodeToString("admin:admin".getBytes(StandardCharsets.UTF_8));

		mockMvc.perform(post("/api/auth/login")
				.header(HttpHeaders.AUTHORIZATION, "Basic " + credentials))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.role").value("ROLE_ADMIN"))
			.andExpect(jsonPath("$.username").value("admin"));
	}

}
