package com.example.bank.demo.controller;

import com.example.bank.demo.model.User;
import com.example.bank.demo.model.Account;
import com.example.bank.demo.service.UserService;
import com.example.bank.demo.service.AccountService;
import com.example.bank.demo.service.TransactionService;
import com.example.bank.demo.service.AgencyService;
import com.example.bank.demo.model.Agency;
import com.example.bank.demo.model.Transaction;
import com.example.bank.demo.model.CashierLog;
import com.example.bank.demo.service.CashierLogService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.Date;
import java.util.stream.Collectors;
import java.time.LocalDateTime;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.math.BigDecimal;

@RestController
@RequestMapping("/api/director")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001", "http://localhost:5173"}, allowCredentials = "true")
public class DirectorController {

    private static final Logger logger = LoggerFactory.getLogger(DirectorController.class);

    @Autowired
    private UserService userService;

    @Autowired
    private AccountService accountService;

    @Autowired
    private TransactionService transactionService;

    @Autowired
    private AgencyService agencyService;

    @Autowired
    private CashierLogService cashierLogService;

    // Obtenir les statistiques de l'agence
    @GetMapping("/stats")
    public ResponseEntity<?> getAgencyStats(@RequestHeader("Authorization") String authHeader) {
        try {
            userService.validateDirector(authHeader);

            Map<String, Object> stats = new HashMap<>();
            stats.put("totalAccounts", accountService.getAllAccounts().size());
            stats.put("totalUsers", userService.getAllUsers().size());
            stats.put("totalTransactions", transactionService.getAllTransactions().size());

            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            throw e;
        }
    }

    // Obtenir la liste du personnel (caissiers)
    @GetMapping("/staff")
    public ResponseEntity<?> getStaffMembers(@RequestHeader("Authorization") String authHeader) {
        try {
            userService.validateDirector(authHeader);

            List<User> staff = userService.getStaffMembers();
            return ResponseEntity.ok(staff);
        } catch (Exception e) {
            throw e;
        }
    }

    // Obtenir la liste des clients
    @GetMapping("/clients")
    public ResponseEntity<?> getAgencyClients(@RequestHeader("Authorization") String authHeader) {
        try {
            User director = userService.validateDirector(authHeader);
            Agency directorAgency = agencyService.getAgencyByDirectorUsername(director.getUsername());
            List<User> clients = userService.getClientsByAgencyId(directorAgency.getId());
            
            // Récupérer les comptes pour chaque client
            List<Map<String, Object>> clientsWithAccounts = clients.stream()
                .map(client -> {
                    Map<String, Object> clientData = new HashMap<>();
                    clientData.put("id", client.getId());
                    clientData.put("username", client.getUsername());
                    clientData.put("fullName", client.getFullName());
                    clientData.put("email", client.getEmail());
                    clientData.put("phone", client.getPhone());
                    clientData.put("address", client.getAddress());
                    clientData.put("accounts", client.getAccounts());
                    return clientData;
                })
                .collect(Collectors.toList());
            
            return ResponseEntity.ok(clientsWithAccounts);
        } catch (Exception e) {
            throw e;
        }
    }

    // Mettre à jour le statut d'un compte
    @PutMapping("/accounts/{accountId}/status")
    public ResponseEntity<?> updateAccountStatus(
            @PathVariable Long accountId,
            @RequestBody Map<String, String> statusUpdate,
            @RequestHeader("Authorization") String authHeader) {
        try {
            userService.validateDirector(authHeader);

            Account updatedAccount = accountService.updateAccountStatus(accountId, statusUpdate.get("status"));
            return ResponseEntity.ok(updatedAccount);
        } catch (Exception e) {
            throw e;
        }
    }

    @GetMapping("/cashiers")
    public ResponseEntity<?> getAgencyCashiers(@RequestHeader("Authorization") String authHeader) {
        try {
            User director = userService.validateDirector(authHeader);
            Agency directorAgency = agencyService.getAgencyByDirectorUsername(director.getUsername());
            List<User> cashiers = userService.getCashiersByAgencyId(directorAgency.getId());
            return ResponseEntity.ok(cashiers);
        } catch (Exception e) {
            throw e;
        }
    }

    @PostMapping("/cashiers")
    public ResponseEntity<?> createCashier(
        @RequestBody User cashier,
        @RequestHeader("Authorization") String authHeader) {
        try {
            User director = userService.validateDirector(authHeader);
            Agency directorAgency = agencyService.getAgencyByDirectorUsername(director.getUsername());
            
            // Définir le rôle comme CASHIER
            cashier.setRole("ROLE_CASHIER");
            
            // Créer le caissier et l'associer à l'agence
            User createdCashier = userService.createCashierForAgency(cashier, directorAgency.getId());
            return ResponseEntity.ok(createdCashier);
        } catch (Exception e) {
            throw e;
        }
    }

    @GetMapping("/statistics")
    public ResponseEntity<?> getAgencyStatistics(@RequestHeader("Authorization") String authHeader) {
        try {
            User director = userService.validateDirector(authHeader);
            Agency directorAgency = agencyService.getAgencyByDirectorUsername(director.getUsername());
            
            // Récupérer les statistiques
            List<User> agencyClients = userService.getClientsByAgencyId(directorAgency.getId());
            List<User> agencyCashiers = userService.getCashiersByAgencyId(directorAgency.getId());
            List<Transaction> agencyTransactions = transactionService.getTransactionsByAgencyId(directorAgency.getId());
            
            // Calculer les statistiques mensuelles
            LocalDateTime startOfMonth = LocalDate.now().withDayOfMonth(1).atStartOfDay();
            List<Transaction> monthlyTransactions = agencyTransactions.stream()
                .filter(t -> t.getDate().toInstant()
                    .atZone(ZoneId.systemDefault())
                    .toLocalDateTime()
                    .isAfter(startOfMonth))
                .collect(Collectors.toList());

            BigDecimal monthlyDeposits = monthlyTransactions.stream()
                .filter(t -> "DEPOSIT".equals(t.getType()))
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal monthlyWithdrawals = monthlyTransactions.stream()
                .filter(t -> "WITHDRAW".equals(t.getType()))
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

            Map<String, Object> statistics = new HashMap<>();
            statistics.put("totalClients", agencyClients.size());
            statistics.put("totalCashiers", agencyCashiers.size());
            statistics.put("totalTransactions", agencyTransactions.size());
            statistics.put("monthlyTransactionCount", monthlyTransactions.size());
            statistics.put("monthlyDeposits", monthlyDeposits);
            statistics.put("monthlyWithdrawals", monthlyWithdrawals);
            
            return ResponseEntity.ok(statistics);
        } catch (Exception e) {
            throw e;
        }
    }

    @DeleteMapping("/cashiers/{cashierId}")
    public ResponseEntity<?> deleteCashier(
        @PathVariable Long cashierId,
        @RequestHeader("Authorization") String authHeader
    ) {
        try {
            User director = userService.validateDirector(authHeader);
            Agency directorAgency = agencyService.getAgencyByDirectorUsername(director.getUsername());
            
            // Vérifier que le caissier appartient à l'agence du directeur
            User cashier = userService.getUserById(cashierId);
            if (!cashier.getAgency().getId().equals(directorAgency.getId())) {
                return ResponseEntity.status(403).body(Map.of("error", "Ce caissier n'appartient pas à votre agence"));
            }
            
            userService.deleteUser(cashierId);
            return ResponseEntity.ok(Map.of("message", "Caissier supprimé avec succès"));
        } catch (Exception e) {
            throw e;
        }
    }

    @PutMapping("/cashiers/{cashierId}")
    public ResponseEntity<?> updateCashier(
        @PathVariable Long cashierId,
        @RequestBody User cashierDetails,
        @RequestHeader("Authorization") String authHeader
    ) {
        try {
            User director = userService.validateDirector(authHeader);
            Agency directorAgency = agencyService.getAgencyByDirectorUsername(director.getUsername());
            
            // Vérifier que le caissier appartient à l'agence du directeur
            User cashier = userService.getUserById(cashierId);
            if (!cashier.getAgency().getId().equals(directorAgency.getId())) {
                return ResponseEntity.status(403).body(Map.of("error", "Ce caissier n'appartient pas à votre agence"));
            }
            
            cashierDetails.setId(cashierId);
            cashierDetails.setRole("ROLE_CASHIER");
            cashierDetails.setAgency(directorAgency);
            
            User updatedCashier = userService.updateCashier(cashierDetails);
            return ResponseEntity.ok(updatedCashier);
        } catch (Exception e) {
            throw e;
        }
    }

    @PostMapping("/accounts/{accountId}/deposit")
    public ResponseEntity<?> deposit(
        @PathVariable Long accountId,
        @RequestBody Map<String, Object> request,
        @RequestHeader("Authorization") String authHeader
    ) {
        try {
            User director = userService.validateDirector(authHeader);
            Agency directorAgency = agencyService.getAgencyByDirectorUsername(director.getUsername());
            
            Account account = accountService.getAccountById(accountId)
                .orElseThrow(() -> new RuntimeException("Compte non trouvé"));
                
            // Vérifier que le compte appartient à l'agence du directeur
            if (!account.getUser().getAgency().getId().equals(directorAgency.getId())) {
                return ResponseEntity.status(403).body(Map.of("error", "Ce compte n'appartient pas à votre agence"));
            }

            BigDecimal amount = new BigDecimal(request.get("amount").toString());
            String description = request.get("description") != null ? 
                request.get("description").toString() : "Dépôt par le directeur";

            account.setBalance(account.getBalance().add(amount));
            accountService.updateAccount(account);

            // Créer la transaction
            Transaction transaction = new Transaction();
            transaction.setAccount(account);
            transaction.setAmount(amount);
            transaction.setType("DEPOSIT");
            transaction.setDescription(description);
            transaction.setDate(new Date());
            transaction.setFromAccount("DIRECTOR");
            transaction.setToAccount(account.getAccountNumber());
            transactionService.createTransaction(transaction);

            return ResponseEntity.ok(Map.of(
                "message", "Dépôt effectué avec succès",
                "newBalance", account.getBalance()
            ));
        } catch (Exception e) {
            throw e;
        }
    }

    @PostMapping("/accounts/{accountId}/withdraw")
    public ResponseEntity<?> withdraw(
        @PathVariable Long accountId,
        @RequestBody Map<String, Object> request,
        @RequestHeader("Authorization") String authHeader
    ) {
        try {
            User director = userService.validateDirector(authHeader);
            Agency directorAgency = agencyService.getAgencyByDirectorUsername(director.getUsername());
            
            Account account = accountService.getAccountById(accountId)
                .orElseThrow(() -> new RuntimeException("Compte non trouvé"));
                
            // Vérifier que le compte appartient à l'agence du directeur
            if (!account.getUser().getAgency().getId().equals(directorAgency.getId())) {
                return ResponseEntity.status(403).body(Map.of("error", "Ce compte n'appartient pas à votre agence"));
            }

            BigDecimal amount = new BigDecimal(request.get("amount").toString());
            String description = request.get("description") != null ? 
                request.get("description").toString() : "Retrait par le directeur";

            if (account.getBalance().compareTo(amount) < 0) {
                return ResponseEntity.badRequest().body(Map.of("error", "Solde insuffisant"));
            }

            account.setBalance(account.getBalance().subtract(amount));
            accountService.updateAccount(account);

            // Créer la transaction
            Transaction transaction = new Transaction();
            transaction.setAccount(account);
            transaction.setAmount(amount);
            transaction.setType("WITHDRAW");
            transaction.setDescription(description);
            transaction.setDate(new Date());
            transaction.setFromAccount(account.getAccountNumber());
            transaction.setToAccount("DIRECTOR");
            transactionService.createTransaction(transaction);

            return ResponseEntity.ok(Map.of(
                "message", "Retrait effectué avec succès",
                "newBalance", account.getBalance()
            ));
        } catch (Exception e) {
            throw e;
        }
    }

    @DeleteMapping("/accounts/{accountId}")
    public ResponseEntity<?> deleteAccount(
        @PathVariable Long accountId,
        @RequestHeader("Authorization") String authHeader
    ) {
        try {
            User director = userService.validateDirector(authHeader);

            // Vérifier que le compte appartient à l'agence du directeur
            Agency directorAgency = agencyService.getAgencyByDirectorUsername(director.getUsername());
            Account account = accountService.getAccountById(accountId)
                .orElseThrow(() -> new RuntimeException("Compte non trouvé"));

            if (!account.getUser().getAgency().getId().equals(directorAgency.getId())) {
                return ResponseEntity.status(403).body(Map.of(
                    "error", "Ce compte n'appartient pas à votre agence"
                ));
            }

            // Supprimer le compte
            accountService.deleteAccount(accountId);

            return ResponseEntity.ok(Map.of(
                "message", "Compte supprimé avec succès"
            ));
        } catch (Exception e) {
            throw e;
        }
    }

    @GetMapping("/cashier-logs")
    public ResponseEntity<?> getAgencyCashierLogs(@RequestHeader("Authorization") String authHeader) {
        try {
            User director = userService.validateDirector(authHeader);
            Agency directorAgency = agencyService.getAgencyByDirectorUsername(director.getUsername());
            
            // Récupérer tous les caissiers de l'agence
            List<User> agencyCashiers = userService.getCashiersByAgencyId(directorAgency.getId());
            
            // Récupérer les logs pour chaque caissier
            List<CashierLog> allLogs = new ArrayList<>();
            for (User cashier : agencyCashiers) {
                List<CashierLog> cashierLogs = cashierLogService.getLogsByCashier(cashier.getId());
                allLogs.addAll(cashierLogs);
            }
            
            // Trier les logs par date décroissante
            allLogs.sort((log1, log2) -> log2.getDate().compareTo(log1.getDate()));
            
            // Calculer des statistiques sur les logs
            Map<String, Object> logsStats = new HashMap<>();
            logsStats.put("totalLogs", allLogs.size());
            
            // Compter les différents types d'opérations
            Map<String, Long> operationCounts = allLogs.stream()
                .collect(Collectors.groupingBy(CashierLog::getType, Collectors.counting()));
            logsStats.put("operationCounts", operationCounts);
            
            // Compter les succès et échecs
            long successCount = allLogs.stream()
                .filter(log -> "SUCCESS".equals(log.getStatus()))
                .count();
            long failureCount = allLogs.stream()
                .filter(log -> "FAILED".equals(log.getStatus()))
                .count();
            logsStats.put("successCount", successCount);
            logsStats.put("failureCount", failureCount);
            
            // Calculer le montant total des opérations
            BigDecimal totalAmount = allLogs.stream()
                .filter(log -> log.getAmount() != null)
                .map(CashierLog::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            logsStats.put("totalAmount", totalAmount);
            
            // Retourner à la fois les logs et les statistiques
            Map<String, Object> response = new HashMap<>();
            response.put("logs", allLogs);
            response.put("statistics", logsStats);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            throw e;
        }
    }

    @PostMapping("/statistics/filtered")
    public ResponseEntity<?> getFilteredStatistics(
        @RequestBody Map<String, String> request,
        @RequestHeader("Authorization") String authHeader
    ) {
        try {
            User director = userService.validateDirector(authHeader);
            logger.info("Calculating statistics for director: {}", director.getUsername());
            
            Agency directorAgency = agencyService.getAgencyByDirectorUsername(director.getUsername());
            logger.info("Found agency: {} with ID: {}", directorAgency.getName(), directorAgency.getId());
            
            // Parse les dates
            LocalDateTime startDate = LocalDateTime.parse(request.get("startDate").replace("Z", ""));
            LocalDateTime endDate = LocalDateTime.parse(request.get("endDate").replace("Z", ""));
            
            logger.info("Parsed dates - start: {}, end: {}", startDate, endDate);
            
            // Convertir en Date
            Date start = Date.from(startDate.atZone(ZoneId.systemDefault()).toInstant());
            Date end = Date.from(endDate.atZone(ZoneId.systemDefault()).toInstant());
            
            logger.info("Converted dates - start: {}, end: {}", start, end);
            
            // Obtenir les statistiques
            Map<String, Object> stats = transactionService.getAgencyStatsByDateRange(
                directorAgency.getId(), start, end
            );
            
            logger.info("Calculated stats: {}", stats);
            return ResponseEntity.ok(stats);
            
        } catch (Exception e) {
            logger.error("Error calculating statistics: {}", e.getMessage());
            throw e;
        }
    }
}
