package com.example.bank.demo.service;

import com.example.bank.demo.model.User;
import com.example.bank.demo.exception.UnauthorizedException;
import com.example.bank.demo.exception.ForbiddenException;
import com.example.bank.demo.model.Account;
import com.example.bank.demo.model.Currency;
import com.example.bank.demo.repository.UserRepository;
import com.example.bank.demo.repository.TransactionRepository;
import com.example.bank.demo.repository.BankCardRepository;
import com.example.bank.demo.repository.AccountRepository;
import com.example.bank.demo.repository.CashierLogRepository;
import com.example.bank.demo.repository.AgencyRepository;
import com.example.bank.demo.model.Agency;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import jakarta.annotation.PostConstruct;
import java.util.List;
import org.springframework.transaction.annotation.Transactional;
import java.util.stream.Collectors;
import java.math.BigDecimal;

@Service
public class UserService {
    
    private static final Logger logger = LoggerFactory.getLogger(UserService.class);
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private BankCardRepository bankCardRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private CashierLogRepository cashierLogRepository;

    @Autowired
    private AgencyRepository agencyRepository;

    @Transactional
    public User createUser(User user) {
        if (userRepository.existsByUsername(user.getUsername())) {
            throw new RuntimeException("Username already exists");
        }
        
        if (!user.getRole().startsWith("ROLE_")) {
            user.setRole("ROLE_" + user.getRole());
        }
        
        if (!user.getPassword().startsWith("$2a$")) {
            user.setPassword(passwordEncoder.encode(user.getPassword()));
        }
        
        return userRepository.save(user);
    }

    public List<User> getAllUsers() {
        logger.info("Getting all users");
        try {
            List<User> users = userRepository.findAll();
            logger.info("Found {} users", users.size());
            return users;
        } catch (Exception e) {
            logger.error("Error getting all users", e);
            throw e;
        }
    }

    public User getUserById(Long id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public User updateUser(Long id, User userDetails) {
        User user = getUserById(id);
        user.setEmail(userDetails.getEmail());
        user.setFullName(userDetails.getFullName());
        return userRepository.save(user);
    }

    @Transactional
    public void deleteUser(Long id) {
        User user = getUserById(id);
        
        // Supprimer d'abord les comptes associés
        if (user.getAccounts() != null && !user.getAccounts().isEmpty()) {
            user.getAccounts().forEach(account -> {
                // Supprimer les transactions associées au compte
                transactionRepository.deleteByAccountId(account.getId());
                // Supprimer les cartes bancaires associées au compte
                bankCardRepository.deleteByAccountId(account.getId());
            });
            accountRepository.deleteByUserId(id);
        }
        
        // Supprimer les logs associés si l'utilisateur est un caissier
        if ("ROLE_CASHIER".equals(user.getRole())) {
            cashierLogRepository.deleteByCashierId(id);
        }
        
        // Supprimer l'utilisateur
        userRepository.deleteById(id);
    }

    public User authenticate(String username, String password) {
        logger.info("Attempting to authenticate user: {}", username);
        try {
            return userRepository.findByUsernameWithAgency(username)
                .filter(user -> passwordEncoder.matches(password, user.getPassword()))
                .orElse(null);
        } catch (Exception e) {
            logger.error("Error during authentication", e);
            throw e;
        }
    }

    public User authenticate(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Basic ")) {
            throw new UnauthorizedException("Session périmée ou authentification requise");
        }
        try {
            String base64Credentials = authHeader.substring("Basic".length()).trim();
            String credentials = new String(java.util.Base64.getDecoder().decode(base64Credentials));
            String[] values = credentials.split(":", 2);
            if (values.length < 2) {
                throw new UnauthorizedException("Session périmée ou authentification requise");
            }
            String username = values[0];
            String password = values[1];
            User user = authenticate(username, password);
            if (user == null) {
                throw new UnauthorizedException("Identifiants incorrects ou session expirée");
            }
            return user;
        } catch (UnauthorizedException e) {
            throw e;
        } catch (Exception e) {
            throw new UnauthorizedException("Session périmée ou authentification requise");
        }
    }

    public User validateUser(String authHeader) {
        return authenticate(authHeader);
    }

    public User validateCashier(String authHeader) {
        User user = authenticate(authHeader);
        if (!isCashier(user.getUsername())) {
            throw new ForbiddenException("Accès refusé : rôle caissier requis");
        }
        return user;
    }

    public User validateAdmin(String authHeader) {
        User user = authenticate(authHeader);
        if (!isAdmin(user.getUsername())) {
            throw new ForbiddenException("Accès refusé : rôle administrateur requis");
        }
        return user;
    }

    public User validateDirector(String authHeader) {
        User user = authenticate(authHeader);
        if (!isDirector(user.getUsername())) {
            throw new ForbiddenException("Accès refusé : rôle directeur requis");
        }
        return user;
    }

    public boolean isAdmin(String username) {
        return userRepository.findByUsername(username)
            .map(user -> {
                String role = user.getRole();
                return role != null && (role.equals("ROLE_ADMIN") || role.equals("ADMIN"));
            })
            .orElse(false);
    }

    public boolean isCashier(String username) {
        return userRepository.findByUsername(username)
            .map(user -> {
                String role = user.getRole();
                return role != null && (role.equals("ROLE_CASHIER") || role.equals("CASHIER"));
            })
            .orElse(false);
    }

    @PostConstruct
    public void init() {
        logger.info("Initializing default users and agency");
        try {
            // Create default agency if not exists
            Agency defaultAgency;
            if (!agencyRepository.existsByCode("AGN001")) {
                defaultAgency = new Agency();
                defaultAgency.setCode("AGN001");
                defaultAgency.setName("Agence Principale");
                defaultAgency.setAddress("1 Rue de la Banque, Tunis");
                defaultAgency.setPhone("+216 71 123 456");
                defaultAgency.setEmail("agence@bank.com");
                defaultAgency.setIsActive(true);
                agencyRepository.save(defaultAgency);
            } else {
                defaultAgency = agencyRepository.findByCode("AGN001").orElseThrow();
            }

            User admin = upsertDefaultUser(
                "admin",
                "admin",
                "ROLE_ADMIN",
                "admin@bank.com",
                "Administrateur Système",
                "123 Admin Street",
                "+1234567890",
                null
            );
            
            User director = upsertDefaultUser(
                "director",
                "director",
                "ROLE_DIRECTOR",
                "director@bank.com",
                "Directeur Agence",
                "789 Director Street",
                "+1122334455",
                defaultAgency
            );

            // Update agency with director
            if (defaultAgency.getDirector() == null) {
                defaultAgency.setDirector(director);
                agencyRepository.save(defaultAgency);
            }
            
            upsertDefaultUser(
                "cashier",
                "cashier",
                "ROLE_CASHIER",
                "cashier@bank.com",
                "Caissier Principal",
                "456 Cashier Avenue",
                "+0987654321",
                defaultAgency
            );
            
            // Add default client user
            User client = upsertDefaultUser(
                "client",
                "client",
                "ROLE_USER",
                "client@bank.com",
                "Client Test",
                "789 Client Street",
                "+216 12 345 678",
                defaultAgency
            );
            
            // Create a default account for the client
            if (!accountRepository.existsByAccountNumber("TN59 10 006 0351 1835 9847 8831")) {
                Account clientAccount = new Account();
                clientAccount.setAccountNumber("TN59 10 006 0351 1835 9847 8831");
                clientAccount.setBalance(BigDecimal.valueOf(5000.00));
                clientAccount.setUser(client);
                clientAccount.setStatus("ACTIVE");
                clientAccount.setCurrency(Currency.TND);
                accountRepository.save(clientAccount);
                logger.info("Created default account for client");
            }
        } catch (Exception e) {
            logger.error("Error creating default users/agency", e);
            throw e;
        }
    }

    private User upsertDefaultUser(
        String username,
        String rawPassword,
        String role,
        String email,
        String fullName,
        String address,
        String phone,
        Agency agency
    ) {
        User user = userRepository.findByUsername(username).orElseGet(User::new);
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(rawPassword));
        user.setRole(role);
        user.setEmail(email);
        user.setFullName(fullName);
        user.setAddress(address);
        user.setPhone(phone);
        user.setAgency(agency);
        return userRepository.save(user);
    }

    public boolean verifyPassword(Long userId, String password) {
        User user = getUserById(userId);
        return passwordEncoder.matches(password, user.getPassword());
    }

    public String encodePassword(String rawPassword) {
        return passwordEncoder.encode(rawPassword);
    }

    @Transactional
    public User updateUserAsCashier(User user) {
        logger.info("Updating user information by cashier for user ID: {}", user.getId());
        try {
            // Vérifier si l'utilisateur existe
            User existingUser = userRepository.findById(user.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));

            // Mettre à jour uniquement les champs autorisés
            existingUser.setFullName(user.getFullName());
            existingUser.setEmail(user.getEmail());
            existingUser.setPhone(user.getPhone());
            existingUser.setAddress(user.getAddress());

            // Sauvegarder les modifications
            User updatedUser = userRepository.save(existingUser);
            logger.info("User information updated successfully");
            return updatedUser;
        } catch (Exception e) {
            logger.error("Error updating user information", e);
            throw new RuntimeException("Failed to update user information", e);
        }
    }

    public boolean existsByUsername(String username) {
        return userRepository.existsByUsername(username);
    }

    public java.util.Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    public boolean matches(String rawPassword, String encodedPassword) {
        return passwordEncoder.matches(rawPassword, encodedPassword);
    }

    public boolean verifyPassword(String username, String password) {
        return userRepository.findByUsername(username)
            .map(user -> passwordEncoder.matches(password, user.getPassword()))
            .orElse(false);
    }

    public boolean isDirector(String username) {
        return userRepository.findByUsername(username)
            .map(user -> {
                String role = user.getRole();
                return role != null && (role.equals("ROLE_DIRECTOR") || role.equals("DIRECTOR"));
            })
            .orElse(false);
    }

    public List<User> getStaffMembers() {
        return userRepository.findAll().stream()
            .filter(user -> {
                String role = user.getRole();
                return role != null && (role.equals("ROLE_CASHIER") || role.equals("CASHIER"));
            })
            .collect(Collectors.toList());
    }

    public List<User> getClients() {
        return userRepository.findAll().stream()
            .filter(user -> "ROLE_USER".equals(user.getRole()))
            .collect(Collectors.toList());
    }

    @Transactional
    public User updateUserAsAdmin(Long id, User userDetails) {
        User user = getUserById(id);
        
        user.setUsername(userDetails.getUsername());
        user.setEmail(userDetails.getEmail());
        user.setFullName(userDetails.getFullName());
        user.setPhone(userDetails.getPhone());
        user.setAddress(userDetails.getAddress());
        user.setRole(userDetails.getRole());
        
        if (userDetails.getPassword() != null && !userDetails.getPassword().isEmpty()) {
            user.setPassword(passwordEncoder.encode(userDetails.getPassword()));
        }
        
        return userRepository.save(user);
    }

    public List<User> getCashiersByAgencyId(Long agencyId) {
        return userRepository.findByRoleAndAgency_Id("ROLE_CASHIER", agencyId);
    }

    @Transactional
    public User createCashierForAgency(User cashier, Long agencyId) {
        if (userRepository.existsByUsername(cashier.getUsername())) {
            throw new RuntimeException("Ce nom d'utilisateur existe déjà");
        }

        Agency agency = agencyRepository.findById(agencyId)
            .orElseThrow(() -> new RuntimeException("Agence non trouvée"));

        cashier.setRole("ROLE_CASHIER");
        cashier.setAgency(agency);
        cashier.setPassword(passwordEncoder.encode(cashier.getPassword()));

        return userRepository.save(cashier);
    }

    public List<User> getClientsByAgencyId(Long agencyId) {
        return userRepository.findByRoleAndAgency_Id("ROLE_USER", agencyId);
    }

    @Transactional
    public User updateCashier(User cashierDetails) {
        User existingCashier = getUserById(cashierDetails.getId());
        
        existingCashier.setFullName(cashierDetails.getFullName());
        existingCashier.setEmail(cashierDetails.getEmail());
        existingCashier.setPhone(cashierDetails.getPhone());
        existingCashier.setAddress(cashierDetails.getAddress());
        
        // Mettre à jour le mot de passe si fourni
        if (cashierDetails.getPassword() != null && !cashierDetails.getPassword().isEmpty()) {
            existingCashier.setPassword(passwordEncoder.encode(cashierDetails.getPassword()));
        }
        
        return userRepository.save(existingCashier);
    }
} 