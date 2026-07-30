package com.example.bank.demo.controller;

import com.example.bank.demo.model.Agency;
import com.example.bank.demo.model.User;
import com.example.bank.demo.service.AgencyService;
import com.example.bank.demo.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001", "http://localhost:5173"}, allowCredentials = "true")
public class AdminController {
    
    private static final Logger logger = LoggerFactory.getLogger(AdminController.class);
    
    @Autowired
    private UserService userService;

    @Autowired
    private AgencyService agencyService;

    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers(@RequestHeader("Authorization") String authHeader) {
        try {
            userService.validateAdmin(authHeader);

            List<User> users = userService.getAllUsers();
            users.forEach(user -> {
                user.setPassword(null);
                user.setAccounts(null);
            });
            return ResponseEntity.ok(users);
        } catch (Exception e) {
            logger.error("Error fetching users", e);
            throw e; // Handled by GlobalExceptionHandler
        }
    }

    @PostMapping("/users")
    public ResponseEntity<?> createUser(
            @RequestBody User user,
            @RequestHeader("Authorization") String authHeader) {
        try {
            userService.validateAdmin(authHeader);
            return ResponseEntity.status(403).body(Map.of(
                "error", "La création d'utilisateurs est réservée aux directeurs (personnel) et caissiers (clients)."
            ));
        } catch (Exception e) {
            logger.error("Error blocking user creation", e);
            throw e;
        }
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<User> getUserById(
            @PathVariable Long id,
            @RequestHeader("Authorization") String authHeader) {
        logger.info("Received request to get user with ID: {}", id);
        try {
            userService.validateAdmin(authHeader);
            User user = userService.getUserById(id);
            logger.info("Found user: {}", user.getUsername());
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            logger.error("Error getting user with ID: {}", id, e);
            throw e;
        }
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<?> updateUser(
            @PathVariable Long id, 
            @RequestBody User userDetails,
            @RequestHeader("Authorization") String authHeader) {
        logger.info("Received request to update user with ID: {}", id);
        try {
            userService.validateAdmin(authHeader);
            User updatedUser = userService.updateUserAsAdmin(id, userDetails);
            logger.info("Updated user: {}", updatedUser.getUsername());
            return ResponseEntity.ok(updatedUser);
        } catch (Exception e) {
            logger.error("Error updating user with ID: {}", id, e);
            throw e;
        }
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id, @RequestHeader("Authorization") String authHeader) {
        try {
            User currentUser = userService.validateAdmin(authHeader);

            if (currentUser.getId().equals(id)) {
                return ResponseEntity.badRequest().body(Map.of(
                    "error", "Vous ne pouvez pas supprimer votre propre compte"
                ));
            }

            userService.deleteUser(id);
            return ResponseEntity.ok(Map.of("message", "Utilisateur supprimé avec succès"));
        } catch (Exception e) {
            logger.error("Error deleting user with ID: {}", id, e);
            throw e;
        }
    }

    @PostMapping("/agencies")
    public ResponseEntity<?> createAgency(
        @RequestBody Map<String, Object> request,
        @RequestHeader("Authorization") String authHeader) {
        try {
            userService.validateAdmin(authHeader);

            String code = (String) request.get("code");
            String name = (String) request.get("name");
            String address = (String) request.get("address");
            String phone = (String) request.get("phone");
            String email = (String) request.get("email");

            if (code == null || !code.matches("^[A-Z0-9]{2,10}$")) {
                return ResponseEntity.badRequest().body("Code agence invalide (2-10 caractères alphanumériques)");
            }
            if (name == null || name.isBlank()) {
                return ResponseEntity.badRequest().body("Le nom de l'agence est requis");
            }
            if (email == null || !email.matches("^[\\w.-]+@[\\w.-]+\\.\\w+$")) {
                return ResponseEntity.badRequest().body("Email invalide");
            }
            if (phone == null || phone.isBlank()) {
                return ResponseEntity.badRequest().body("Le téléphone est requis");
            }
            if (request.get("directorId") == null) {
                return ResponseEntity.badRequest().body("Un directeur doit être assigné");
            }

            Agency agency = new Agency();
            agency.setCode(code.toUpperCase());
            agency.setName(name);
            agency.setAddress(address);
            agency.setPhone(phone);
            agency.setEmail(email);

            Long directorId = Long.parseLong(request.get("directorId").toString());
            Agency createdAgency = agencyService.createAgency(agency, directorId);

            return ResponseEntity.ok(createdAgency);
        } catch (Exception e) {
            throw e;
        }
    }

    @GetMapping("/agencies")
    public ResponseEntity<?> getAllAgencies(@RequestHeader("Authorization") String authHeader) {
        try {
            userService.validateAdmin(authHeader);

            List<Agency> agencies = agencyService.getAllAgencies();
            agencies.forEach(agency -> {
                if (agency.getDirector() != null) {
                    agency.getDirector().setAccounts(null);
                    agency.getDirector().setPassword(null);
                }
            });
            return ResponseEntity.ok(agencies);
        } catch (Exception e) {
            logger.error("Error fetching agencies", e);
            throw e;
        }
    }

    @DeleteMapping("/agencies/{id}")
    public ResponseEntity<?> deleteAgency(
        @PathVariable Long id,
        @RequestHeader("Authorization") String authHeader) {
        try {
            userService.validateAdmin(authHeader);

            agencyService.deleteAgency(id);
            return ResponseEntity.ok().body(Map.of("message", "Agence supprimée avec succès"));
        } catch (Exception e) {
            throw e;
        }
    }

    @PutMapping("/agencies/{id}")
    public ResponseEntity<?> updateAgency(
        @PathVariable Long id,
        @RequestBody Map<String, Object> request,
        @RequestHeader("Authorization") String authHeader) {
        try {
            userService.validateAdmin(authHeader);

            Agency agency = agencyService.getAgencyById(id);
            agency.setCode((String) request.get("code"));
            agency.setName((String) request.get("name"));
            agency.setAddress((String) request.get("address"));
            agency.setPhone((String) request.get("phone"));
            agency.setEmail((String) request.get("email"));

            if (request.get("directorId") != null) {
                Long directorId = Long.parseLong(request.get("directorId").toString());
                User director = userService.getUserById(directorId);
                agency.setDirector(director);
            }

            Agency updatedAgency = agencyService.updateAgency(id, agency);
            return ResponseEntity.ok(updatedAgency);
        } catch (Exception e) {
            throw e;
        }
    }
}