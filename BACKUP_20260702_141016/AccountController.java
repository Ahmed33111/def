package com.example.bank.demo.controller;

import com.example.bank.demo.model.Account;
import com.example.bank.demo.model.TransferRequest;
import com.example.bank.demo.model.Transaction;
import com.example.bank.demo.model.User;
import com.example.bank.demo.model.VirementProgramme;
import com.example.bank.demo.model.BankCard;
import com.example.bank.demo.repository.BankCardRepository;
import com.example.bank.demo.service.AccountService;
import com.example.bank.demo.service.TransactionService;
import com.example.bank.demo.service.VirementProgrammeService;
import com.example.bank.demo.repository.UserRepository;
import com.example.bank.demo.service.UserService;
import com.example.bank.demo.repository.AccountRepository;
import com.example.bank.demo.service.NameMatchingService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;
import java.util.Base64;
import java.util.Map;
import java.util.Date;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.stream.Collectors;
import java.math.BigDecimal;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Calendar;
import java.util.UUID;
import java.util.ArrayList;

@RestController
@RequestMapping("/api/accounts")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001", "http://localhost:5173"}, allowCredentials = "true")
public class AccountController {
    private static final Logger logger = LoggerFactory.getLogger(AccountController.class);

    @Autowired
    private AccountService accountService;
    @Autowired
    private TransactionService transactionService;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private VirementProgrammeService virementProgrammeService;
    @Autowired
    private BankCardRepository bankCardRepository;
    @Autowired
    private UserService userService;
    @Autowired
    private AccountRepository accountRepository;
    @Autowired
    private NameMatchingService nameMatchingService;

    @Value("${app.upload.dir:uploads/documents}")
    private String uploadDir;

    @GetMapping
    public ResponseEntity<List<Account>> getAccounts(@RequestHeader("Authorization") String authHeader) {
        try {
            String username = extractUsername(authHeader);
            
            List<Account> accounts = accountService.getAccountsByUsername(username);
            return ResponseEntity.ok(accounts);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping
    public ResponseEntity<Account> createAccount(@RequestBody Account account) {
        try {
            Account createdAccount = accountService.createAccount(account);
            return ResponseEntity.ok(createdAccount);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/transfer")
    public ResponseEntity<?> transferMoney(@RequestBody TransferRequest request, @RequestHeader("Authorization") String authHeader) {
        try {
            logger.info("Received transfer request: {}", request);
            
            String username = extractUsername(authHeader);
            User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

            Account fromAccount = accountService.getAccountById(request.getFromAccountId())
                .orElseThrow(() -> new RuntimeException("Source account not found"));
            
            Account toAccount = accountService.findByAccountNumber(request.getToAccountNumber())
                .orElseThrow(() -> new RuntimeException("Compte destinataire non trouvé"));

            // Vérifier que le nom du bénéficiaire correspond
            if (!nameMatchingService.areNamesMatching(request.getBeneficiaryName(), toAccount.getUser().getFullName())) {
                return ResponseEntity.badRequest().body(Map.of(
                    "error", "Le nom du bénéficiaire ne correspond pas au titulaire du compte"
                ));
            }

            if (!fromAccount.getUser().getId().equals(user.getId())) {
                logger.error("Unauthorized access: user {} trying to access account {}", username, request.getFromAccountId());
                throw new RuntimeException("Unauthorized access to account");
            }

            accountService.transferMoney(
                request.getFromAccountId(),
                request.getToAccountNumber(),
                request.getAmount(),
                request.getPassword(),
                request.getBeneficiaryName()
            );
            return ResponseEntity.ok().body(Map.of(
                "message", "Virement effectué avec succès"
            ));
        } catch (Exception e) {
            logger.error("Transfer error:", e);
            return ResponseEntity.badRequest().body(Map.of(
                "error", e.getMessage()
            ));
        }
    }

    @GetMapping("/{accountId}/transactions")
    public ResponseEntity<List<Transaction>> getAccountTransactions(
            @PathVariable Long accountId,
            @RequestHeader("Authorization") String authHeader) {
        try {
            // Authorization header is kept for consistency
            List<Transaction> transactions = transactionService.getTransactionsByAccountId(accountId);
            return ResponseEntity.ok(transactions);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/statistics")
    public ResponseEntity<?> getAccountStatistics(@RequestHeader("Authorization") String authHeader) {
        try {
            String username = extractUsername(authHeader);
            
            Map<String, Object> statistics = accountService.getAccountStatistics(username);
            return ResponseEntity.ok(statistics);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/statistics/expenses")
    public ResponseEntity<?> getExpenseStatistics(@RequestHeader("Authorization") String authHeader) {
        try {
            String username = extractUsername(authHeader);
            
            Map<String, Object> statistics = accountService.getExpenseStatistics(username);
            return ResponseEntity.ok(statistics);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/statistics/balance-history")
    public ResponseEntity<?> getBalanceHistory(@RequestHeader("Authorization") String authHeader) {
        try {
            String username = extractUsername(authHeader);
            
            Map<String, Object> history = accountService.getBalanceHistory(username);
            return ResponseEntity.ok(history);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/transaction-statistics")
    public ResponseEntity<?> getTransactionStatistics(@RequestHeader("Authorization") String authHeader) {
        try {
            String username = extractUsername(authHeader);
            
            User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
                
            Map<String, Object> statistics = transactionService.getTransactionStatistics(user.getId());
            return ResponseEntity.ok(statistics);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/transfer/programme")
public ResponseEntity<?> programmerVirement(@RequestBody TransferRequest request,
                                            @RequestHeader("Authorization") String authHeader) {
    try {
        logger.info("Received scheduled transfer request: {}", request);
        
        String username = extractUsername(authHeader);
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        // ✅ VALIDATION COMPLÈTE DES CHAMPS
        if (request.getFromAccountId() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Compte source requis"));
        }
        if (request.getToAccountNumber() == null || request.getToAccountNumber().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Numéro de compte destinataire requis"));
        }
        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Montant invalide (doit être positif)"));
        }
        if (request.getBeneficiaryName() == null || request.getBeneficiaryName().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Nom du bénéficiaire requis"));
        }
        if (request.getScheduledDateTime() == null || request.getScheduledDateTime().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Date de programmation requise"));
        }
        
        Account fromAccount = accountService.getAccountById(request.getFromAccountId())
            .orElseThrow(() -> new RuntimeException("Source account not found"));
        
        Account toAccount = accountService.findByAccountNumber(request.getToAccountNumber())
            .orElseThrow(() -> new RuntimeException("Compte destinataire non trouvé"));
        
        // ✅ Validation du nom du bénéficiaire (plus tolérante)
        if (!nameMatchingService.areNamesMatching(request.getBeneficiaryName(), toAccount.getUser().getFullName())) {
            logger.warn("Name mismatch: provided='{}', expected='{}'", 
                request.getBeneficiaryName(), toAccount.getUser().getFullName());
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Le nom du bénéficiaire ne correspond pas au titulaire du compte",
                "expected", toAccount.getUser().getFullName()
            ));
        }
        
        if (!fromAccount.getUser().getId().equals(user.getId())) {
            logger.error("Unauthorized access: user {} trying to access account {}", username, request.getFromAccountId());
            throw new RuntimeException("Unauthorized access to account");
        }
        
        // ✅ Vérifier que le compte source n'est pas clôturé
        if ("CLOSED".equals(fromAccount.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Le compte source est clôturé"));
        }
        
        // ✅ Vérifier le solde suffisant
        if (fromAccount.getBalance().compareTo(request.getAmount()) < 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Solde insuffisant"));
        }
        
        // ✅ Parsing et validation de la date
        LocalDateTime dateExecution;
        try {
            dateExecution = LocalDateTime.parse(request.getScheduledDateTime());
            if (dateExecution.isBefore(LocalDateTime.now())) {
                return ResponseEntity.badRequest().body(Map.of(
                    "error", "La date de programmation doit être dans le futur"
                ));
            }
        } catch (java.time.format.DateTimeParseException e) {
            logger.error("Invalid date format: {}", request.getScheduledDateTime());
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Format de date invalide. Utilisez le format ISO 8601 (YYYY-MM-DDTHH:mm:ss)"
            ));
        }
        
        VirementProgramme virement = virementProgrammeService.programmerVirement(
            fromAccount,
            request.getToAccountNumber(),
            request.getBeneficiaryName(),
            request.getAmount(),
            dateExecution
        );
        
        logger.info("Virement programmé avec succès: id={}, from={}, to={}, amount={}, date={}",
            virement.getId(), fromAccount.getAccountNumber(), 
            request.getToAccountNumber(), request.getAmount(), dateExecution);
        
        return ResponseEntity.ok().body(Map.of(
            "message", "Virement programmé avec succès",
            "virementId", virement.getId()
        ));
    } catch (Exception e) {
        logger.error("Error programming transfer:", e);
        return ResponseEntity.badRequest().body(Map.of(
            "error", e.getMessage() != null ? e.getMessage() : "Erreur lors de la programmation du virement"
        ));
    }
}

    @GetMapping("/transfers/programmes")
    public ResponseEntity<?> getVirementsProgrammes(@RequestHeader("Authorization") String authHeader) {
        try {
            String username = extractUsername(authHeader);
            User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

            List<VirementProgramme> virements = virementProgrammeService.getVirementsProgrammes(user.getId());
            return ResponseEntity.ok(virements);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", e.getMessage()
            ));
        }
    }

    @GetMapping("/{accountId}/cards")
    public ResponseEntity<?> getAccountCards(
        @PathVariable Long accountId,
        @RequestHeader("Authorization") String authHeader) {
        try {
            String username = extractUsername(authHeader);
            User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
            
            Account account = accountService.getAccountById(accountId)
                .orElseThrow(() -> new RuntimeException("Account not found"));
            
            if (!account.getUser().getId().equals(user.getId())) {
                return ResponseEntity.status(403).build();
            }
            
            List<BankCard> cards = bankCardRepository.findByAccountId(accountId);
            List<Map<String, Object>> cardDtos = cards.stream().map(this::toCardDto).collect(Collectors.toList());
            return ResponseEntity.ok(cardDtos);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/pay-bill")
    public ResponseEntity<?> payBill(@RequestBody Map<String, Object> request, @RequestHeader("Authorization") String authHeader) {
        try {
            String username = extractUsername(authHeader);
            User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

            Long accountId = Long.parseLong(request.get("accountId").toString());
            BigDecimal amount = new BigDecimal(request.get("amount").toString());
            String serviceType = request.get("serviceType").toString();
            String reference = request.get("reference").toString();
            String password = request.get("password").toString();

            // Vérifier le mot de passe
            if (!userService.verifyPassword(user.getId(), password)) {
                return ResponseEntity.status(401).body(Map.of("error", "Mot de passe incorrect"));
            }

            // Récupérer le compte
            Account account = accountService.getAccountById(accountId)
                .orElseThrow(() -> new RuntimeException("Account not found"));

            // Vérifier que le compte appartient à l'utilisateur
            if (!account.getUser().getId().equals(user.getId())) {
                return ResponseEntity.status(403).body(Map.of("error", "Unauthorized access to account"));
            }

            // Vérifier le solde
            if (account.getBalance().compareTo(amount) < 0) {
                return ResponseEntity.status(400).body(Map.of("error", "Solde insuffisant"));
            }

            // Mettre à jour le solde
            account.setBalance(account.getBalance().subtract(amount));
            accountRepository.save(account);

            // Créer la transaction
            Transaction transaction = new Transaction();
            transaction.setAccount(account);
            transaction.setAmount(amount);
            transaction.setType("BILL_PAYMENT");
            transaction.setDescription("Paiement " + serviceType + " - Réf: " + reference);
            transaction.setDate(new Date());
            transaction.setFromAccount(account.getAccountNumber());
            transaction.setToAccount(serviceType);
            transactionService.createTransaction(transaction);
        
            return ResponseEntity.ok(Map.of(
                "message", "Paiement effectué avec succès",
                "newBalance", account.getBalance()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/bills")
    public ResponseEntity<List<Map<String, Object>>> getPaidBills(@RequestHeader("Authorization") String authHeader) {
        try {
            String username = extractUsername(authHeader);
            User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

            // Récupérer factures
            List<Transaction> billTransactions = transactionService.getTransactionsByUserAndType(user.getId(), "BILL_PAYMENT");
            
            List<Map<String, Object>> paidBills = billTransactions.stream()
                .map(transaction -> {
                    Map<String, Object> bill = new HashMap<>();
                    bill.put("id", transaction.getId());
                    bill.put("serviceType", transaction.getToAccount()); // Le type de service est stocké dans toAccount
                    bill.put("amount", transaction.getAmount());
                    bill.put("reference", transaction.getDescription().split("Réf: ")[1]); // Extraire la référence
                    bill.put("date", transaction.getDate());
                    bill.put("status", "PAID");
                    bill.put("accountNumber", transaction.getFromAccount());
                    return bill;
                })
                .collect(Collectors.toList());

            return ResponseEntity.ok(paidBills);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/transactions/all")
    public ResponseEntity<List<Transaction>> getAllTransactions(@RequestHeader("Authorization") String authHeader) {
        try {
            String username = extractUsername(authHeader);
            User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

            // Pour un caissier, on récupère toutes les transactions
            if (userService.isCashier(username)) {
                List<Transaction> allTransactions = transactionService.getAllTransactions();
                // Trier les transactions par date décroissante
                allTransactions.sort((t1, t2) -> t2.getDate().compareTo(t1.getDate()));
                return ResponseEntity.ok(allTransactions);
            }

            // Pour un utilisateur normal, on ne récupère que ses transactions
            List<Transaction> userTransactions = transactionService.getTransactionsByUserId(user.getId());
            return ResponseEntity.ok(userTransactions);
        } catch (Exception e) {
            logger.error("Error fetching all transactions:", e);
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/transfers/programmes/{virementId}")
    public ResponseEntity<?> annulerVirementProgramme(
        @PathVariable Long virementId,
        @RequestHeader("Authorization") String authHeader) {
        try {
            String username = extractUsername(authHeader);
            User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

            virementProgrammeService.annulerVirement(virementId, user.getId());
            
            return ResponseEntity.ok().body(Map.of(
                "message", "Virement programmé annulé avec succès"
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", e.getMessage()
            ));
        }
    }

    private String extractUsername(String authHeader) {
        User authenticatedUser = userService.validateUser(authHeader);
        return authenticatedUser.getUsername();
    }

    // ==================== CARD MANAGEMENT ====================

    @GetMapping("/cards/{cardId}")
    public ResponseEntity<?> getCardDetails(
            @PathVariable Long cardId,
            @RequestHeader("Authorization") String authHeader) {
        try {
            String username = extractUsername(authHeader);
            User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

            BankCard card = bankCardRepository.findById(cardId)
                .orElseThrow(() -> new RuntimeException("Card not found"));

            if (!card.getAccount().getUser().getId().equals(user.getId())) {
                return ResponseEntity.status(403).build();
            }

            return ResponseEntity.ok(toCardDto(card));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/cards/{cardId}/security")
    public ResponseEntity<?> updateCardSecurity(
            @PathVariable Long cardId,
            @RequestBody Map<String, Boolean> settings,
            @RequestHeader("Authorization") String authHeader) {
        try {
            String username = extractUsername(authHeader);
            User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

            BankCard card = bankCardRepository.findById(cardId)
                .orElseThrow(() -> new RuntimeException("Card not found"));

            if (!card.getAccount().getUser().getId().equals(user.getId())) {
                return ResponseEntity.status(403).body(Map.of("error", "Accès non autorisé"));
            }

            if (settings.containsKey("contactlessEnabled")) card.setContactlessEnabled(settings.get("contactlessEnabled"));
            if (settings.containsKey("onlinePaymentEnabled")) card.setOnlinePaymentEnabled(settings.get("onlinePaymentEnabled"));
            if (settings.containsKey("internationalEnabled")) card.setInternationalEnabled(settings.get("internationalEnabled"));

            bankCardRepository.save(card);
            return ResponseEntity.ok(toCardDto(card));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/cards/{cardId}/opposition")
    public ResponseEntity<?> toggleCardOpposition(
            @PathVariable Long cardId,
            @RequestBody Map<String, Boolean> body,
            @RequestHeader("Authorization") String authHeader) {
        try {
            String username = extractUsername(authHeader);
            User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

            BankCard card = bankCardRepository.findById(cardId)
                .orElseThrow(() -> new RuntimeException("Card not found"));

            if (!card.getAccount().getUser().getId().equals(user.getId())) {
                return ResponseEntity.status(403).body(Map.of("error", "Accès non autorisé"));
            }

            boolean block = body.getOrDefault("blocked", !card.isBlocked());
            card.setBlocked(block);
            bankCardRepository.save(card);

            return ResponseEntity.ok(toCardDto(card));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/cards/{cardId}/limits")
    public ResponseEntity<?> updateCardLimits(
            @PathVariable Long cardId,
            @RequestBody Map<String, String> limits,
            @RequestHeader("Authorization") String authHeader) {
        try {
            String username = extractUsername(authHeader);
            User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

            BankCard card = bankCardRepository.findById(cardId)
                .orElseThrow(() -> new RuntimeException("Card not found"));

            if (!card.getAccount().getUser().getId().equals(user.getId())) {
                return ResponseEntity.status(403).body(Map.of("error", "Accès non autorisé"));
            }

            if (limits.containsKey("dailyWithdrawalLimit")) {
                BigDecimal val = new BigDecimal(limits.get("dailyWithdrawalLimit"));
                if (val.compareTo(BigDecimal.ZERO) <= 0 || val.compareTo(new BigDecimal("50000")) > 0) {
                    return ResponseEntity.badRequest().body(Map.of("error", "Le plafond de retrait doit être entre 1 et 50 000 TND"));
                }
                card.setDailyWithdrawalLimit(val);
            }
            if (limits.containsKey("dailyPaymentLimit")) {
                BigDecimal val = new BigDecimal(limits.get("dailyPaymentLimit"));
                if (val.compareTo(BigDecimal.ZERO) <= 0 || val.compareTo(new BigDecimal("100000")) > 0) {
                    return ResponseEntity.badRequest().body(Map.of("error", "Le plafond de paiement doit être entre 1 et 100 000 TND"));
                }
                card.setDailyPaymentLimit(val);
            }

            bankCardRepository.save(card);
            return ResponseEntity.ok(toCardDto(card));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/cards/{cardId}/topup")
    public ResponseEntity<?> topupCard(
            @PathVariable Long cardId,
            @RequestBody Map<String, String> body,
            @RequestHeader("Authorization") String authHeader) {
        try {
            String username = extractUsername(authHeader);
            User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

            BankCard card = bankCardRepository.findById(cardId)
                .orElseThrow(() -> new RuntimeException("Card not found"));

            if (!card.getAccount().getUser().getId().equals(user.getId())) {
                return ResponseEntity.status(403).body(Map.of("error", "Accès non autorisé"));
            }

            BigDecimal amount = new BigDecimal(body.getOrDefault("amount", "0"));
            if (amount.compareTo(BigDecimal.ZERO) <= 0) {
                return ResponseEntity.badRequest().body(Map.of("error", "Le montant doit être positif"));
            }

            String password = body.getOrDefault("password", "");
            if (!userService.verifyPassword(user.getId(), password)) {
                return ResponseEntity.status(401).body(Map.of("error", "Mot de passe incorrect"));
            }

            // Deduct from account
            Account account = card.getAccount();
            if (account.getBalance().compareTo(amount) < 0) {
                return ResponseEntity.badRequest().body(Map.of("error", "Solde insuffisant"));
            }
            account.setBalance(account.getBalance().subtract(amount));
            accountRepository.save(account);

            // Add to card prepaid balance
            card.setPrepaidBalance(card.getPrepaidBalance().add(amount));
            bankCardRepository.save(card);

            // Create transaction
            Transaction transaction = new Transaction();
            transaction.setAccount(account);
            transaction.setAmount(amount);
            transaction.setType("DEBIT");
            transaction.setDescription("Rechargement carte " + card.getCardSubType() + " - " + maskCardNumber(card.getCardNumber()));
            transaction.setDate(new Date());
            transaction.setFromAccount(account.getAccountNumber());
            transaction.setToAccount("CARD_TOPUP");
            transactionService.createTransaction(transaction);

            return ResponseEntity.ok(toCardDto(card));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private String maskCardNumber(String cardNumber) {
        if (cardNumber == null || cardNumber.length() < 4) return "****";
        return "**** **** **** " + cardNumber.substring(cardNumber.length() - 4);
    }

    private Map<String, Object> toCardDto(BankCard card) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", card.getId());
        dto.put("cardNumber", maskCardNumber(card.getCardNumber()));
        dto.put("cardType", card.getCardType().name());
        dto.put("expirationDate", card.getExpirationDate() != null ? card.getExpirationDate().toString() : "");
        dto.put("cardSubType", card.getCardSubType());
        dto.put("blocked", card.isBlocked());
        dto.put("contactlessEnabled", card.isContactlessEnabled());
        dto.put("onlinePaymentEnabled", card.isOnlinePaymentEnabled());
        dto.put("internationalEnabled", card.isInternationalEnabled());
        dto.put("dailyWithdrawalLimit", card.getDailyWithdrawalLimit());
        dto.put("dailyPaymentLimit", card.getDailyPaymentLimit());
        dto.put("prepaidBalance", card.getPrepaidBalance());
        if (card.getAccount() != null && card.getAccount().getUser() != null) {
            dto.put("holderName", card.getAccount().getUser().getFullName());
        }
        return dto;
    }

    // ==================== DOCUMENT DOWNLOAD ====================

    /**
     * Generate and download a monthly statement PDF for a given account and month.
     * Query params: accountId, year, month (1-12)
     */
    @GetMapping("/documents/statement")
    public ResponseEntity<byte[]> downloadMonthlyStatement(
            @RequestParam Long accountId,
            @RequestParam int year,
            @RequestParam int month,
            @RequestHeader("Authorization") String authHeader) {
        try {
            String username = extractUsername(authHeader);
            User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

            Account account = accountService.getAccountById(accountId)
                .orElseThrow(() -> new RuntimeException("Account not found"));

            if (!account.getUser().getId().equals(user.getId())) {
                return ResponseEntity.status(403).build();
            }

            List<Transaction> transactions = transactionService.getTransactionsByAccountId(accountId);
            List<Transaction> monthlyTx = transactions.stream().filter(t -> {
                if (t.getDate() == null) return false;
                Calendar cal = Calendar.getInstance();
                cal.setTime(t.getDate());
                return cal.get(Calendar.YEAR) == year && (cal.get(Calendar.MONTH) + 1) == month;
            }).collect(Collectors.toList());

            byte[] pdf = generateStatementPdf(account, user, year, month, monthlyTx);

            String monthName = new java.text.DateFormatSymbols(java.util.Locale.FRENCH).getMonths()[month - 1];
            String filename = "releve_" + account.getAccountNumber() + "_" + monthName + "_" + year + ".pdf";

            return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
        } catch (Exception e) {
            logger.error("Error generating monthly statement:", e);
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Generate and download a balance certificate PDF.
     */
    @GetMapping("/documents/certificate")
    public ResponseEntity<byte[]> downloadBalanceCertificate(
            @RequestParam Long accountId,
            @RequestHeader("Authorization") String authHeader) {
        try {
            String username = extractUsername(authHeader);
            User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

            Account account = accountService.getAccountById(accountId)
                .orElseThrow(() -> new RuntimeException("Account not found"));

            if (!account.getUser().getId().equals(user.getId())) {
                return ResponseEntity.status(403).build();
            }

            byte[] pdf = generateCertificatePdf(account, user);

            String filename = "certificat_solde_" + account.getAccountNumber() + "_" +
                LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd")) + ".pdf";

            return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
        } catch (Exception e) {
            logger.error("Error generating balance certificate:", e);
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Generate and download a fiscal/tax history PDF.
     */
    @GetMapping("/documents/fiscal")
    public ResponseEntity<byte[]> downloadFiscalHistory(
            @RequestParam Long accountId,
            @RequestParam int year,
            @RequestHeader("Authorization") String authHeader) {
        try {
            String username = extractUsername(authHeader);
            User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

            Account account = accountService.getAccountById(accountId)
                .orElseThrow(() -> new RuntimeException("Account not found"));

            if (!account.getUser().getId().equals(user.getId())) {
                return ResponseEntity.status(403).build();
            }

            List<Transaction> transactions = transactionService.getTransactionsByAccountId(accountId);
            List<Transaction> yearlyTx = transactions.stream().filter(t -> {
                if (t.getDate() == null) return false;
                Calendar cal = Calendar.getInstance();
                cal.setTime(t.getDate());
                return cal.get(Calendar.YEAR) == year;
            }).collect(Collectors.toList());

            byte[] pdf = generateFiscalPdf(account, user, year, yearlyTx);

            String filename = "historique_fiscal_" + account.getAccountNumber() + "_" + year + ".pdf";

            return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
        } catch (Exception e) {
            logger.error("Error generating fiscal history:", e);
            return ResponseEntity.badRequest().build();
        }
    }

    // ==================== DOCUMENT UPLOAD ====================

    /**
     * Upload personal documents (KYC, physical deposit proof, account management, credit request).
     * docType: KYC | DEPOSIT_PROOF | ACCOUNT_MANAGEMENT | CREDIT_REQUEST
     */
    @PostMapping("/documents/upload")
    public ResponseEntity<?> uploadDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam("docType") String docType,
            @RequestParam(value = "description", required = false) String description,
            @RequestHeader("Authorization") String authHeader) {
        try {
            String username = extractUsername(authHeader);
            User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Le fichier est vide"));
            }

            // Validate file type
            String originalFilename = file.getOriginalFilename();
            if (originalFilename == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Nom de fichier invalide"));
            }
            String extension = originalFilename.substring(originalFilename.lastIndexOf('.') + 1).toLowerCase();
            List<String> allowed = List.of("pdf", "jpg", "jpeg", "png");
            if (!allowed.contains(extension)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Format non autorisé. Formats acceptés: PDF, JPG, PNG"));
            }

            // Validate docType
            List<String> validTypes = List.of("KYC", "DEPOSIT_PROOF", "ACCOUNT_MANAGEMENT", "CREDIT_REQUEST");
            if (!validTypes.contains(docType)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Type de document invalide"));
            }

            // Create upload directory
            Path uploadPath = Paths.get(uploadDir, String.valueOf(user.getId()), docType);
            Files.createDirectories(uploadPath);

            // Save with unique name
            String uniqueFilename = UUID.randomUUID().toString() + "." + extension;
            Path filePath = uploadPath.resolve(uniqueFilename);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            logger.info("Document uploaded: user={}, type={}, file={}", username, docType, uniqueFilename);

            return ResponseEntity.ok(Map.of(
                "message", "Document téléversé avec succès",
                "filename", uniqueFilename,
                "docType", docType,
                "originalName", originalFilename,
                "size", file.getSize()
            ));
        } catch (IOException e) {
            logger.error("Error uploading document:", e);
            return ResponseEntity.internalServerError().body(Map.of("error", "Erreur lors du téléversement"));
        } catch (Exception e) {
            logger.error("Error uploading document:", e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * List uploaded documents for the authenticated user.
     */
    @GetMapping("/documents/uploaded")
    public ResponseEntity<?> listUploadedDocuments(@RequestHeader("Authorization") String authHeader) {
        try {
            String username = extractUsername(authHeader);
            User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

            List<Map<String, Object>> result = new ArrayList<>();
            Path userDir = Paths.get(uploadDir, String.valueOf(user.getId()));

            if (Files.exists(userDir)) {
                String[] docTypes = {"KYC", "DEPOSIT_PROOF", "ACCOUNT_MANAGEMENT", "CREDIT_REQUEST"};
                for (String docType : docTypes) {
                    Path typeDir = userDir.resolve(docType);
                    if (Files.exists(typeDir)) {
                        Files.list(typeDir).forEach(p -> {
                            try {
                                Map<String, Object> doc = new HashMap<>();
                                doc.put("filename", p.getFileName().toString());
                                doc.put("docType", docType);
                                doc.put("size", Files.size(p));
                                doc.put("uploadedAt", Files.getLastModifiedTime(p).toMillis());
                                result.add(doc);
                            } catch (IOException ignored) {}
                        });
                    }
                }
            }

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            logger.error("Error listing documents:", e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ==================== PDF GENERATION HELPERS ====================

    private byte[] generateStatementPdf(Account account, User user, int year, int month, List<Transaction> transactions) throws Exception {
        String[] monthNames = new java.text.DateFormatSymbols(java.util.Locale.FRENCH).getMonths();
        String monthName = monthNames[month - 1];

        // Build simple PDF using raw bytes (pure Java, no external library needed)
        // We generate a clean text-based PDF manually
        String title = "RELEVE DE COMPTE - " + monthName.toUpperCase() + " " + year;
        StringBuilder content = new StringBuilder();
        content.append(title).append("\n");
        content.append("================================================\n");
        content.append("Titulaire : ").append(user.getFullName()).append("\n");
        content.append("Compte    : ").append(account.getAccountNumber()).append("\n");
        content.append("Periode   : ").append(monthName).append(" ").append(year).append("\n");
        content.append("Solde actuel : ").append(account.getBalance()).append(" TND\n");
        content.append("================================================\n\n");
        content.append(String.format("%-12s %-10s %-40s %15s%n", "Date", "Type", "Description", "Montant (TND)"));
        content.append("--------------------------------------------------------\n");

        double totalCredit = 0, totalDebit = 0;
        for (Transaction t : transactions) {
            String date = t.getDate() != null ? new java.text.SimpleDateFormat("dd/MM/yyyy").format(t.getDate()) : "";
            String type = t.getType() != null ? t.getType() : "";
            String desc = t.getDescription() != null ? t.getDescription() : "";
            if (desc.length() > 38) desc = desc.substring(0, 35) + "...";
            double amt = t.getAmount() != null ? t.getAmount().doubleValue() : 0;
            boolean isCredit = "CREDIT".equals(type) || "DEPOSIT".equals(type);
            if (isCredit) totalCredit += amt; else totalDebit += amt;
            content.append(String.format("%-12s %-10s %-40s %+15.3f%n", date, type, desc, isCredit ? amt : -amt));
        }
        content.append("\n");
        content.append(String.format("Total credits : %+.3f TND%n", totalCredit));
        content.append(String.format("Total debits  : %+.3f TND%n", -totalDebit));
        content.append("\nDocument généré le : ").append(LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"))).append("\n");
        content.append("E-Bank - Document officiel\n");

        return buildSimplePdf(title, content.toString());
    }

    private byte[] generateCertificatePdf(Account account, User user) throws Exception {
        String title = "CERTIFICAT DE SOLDE";
        StringBuilder content = new StringBuilder();
        content.append(title).append("\n");
        content.append("================================================\n\n");
        content.append("Nous, E-Bank, certifions que :\n\n");
        content.append("  Titulaire    : ").append(user.getFullName()).append("\n");
        content.append("  Compte       : ").append(account.getAccountNumber()).append("\n");
        content.append("  Statut       : ").append(account.getStatus()).append("\n");
        content.append("  Solde actuel : ").append(String.format("%.3f TND", account.getBalance().doubleValue())).append("\n\n");
        content.append("Date de certification : ").append(LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"))).append("\n\n");
        content.append("Ce certificat est valable 30 jours à compter de sa date d'émission.\n\n");
        content.append("================================================\n");
        content.append("E-Bank - Document officiel\n");
        return buildSimplePdf(title, content.toString());
    }

    private byte[] generateFiscalPdf(Account account, User user, int year, List<Transaction> transactions) throws Exception {
        String title = "HISTORIQUE FISCAL " + year;
        StringBuilder content = new StringBuilder();
        content.append(title).append("\n");
        content.append("================================================\n");
        content.append("Titulaire : ").append(user.getFullName()).append("\n");
        content.append("Compte    : ").append(account.getAccountNumber()).append("\n");
        content.append("Annee     : ").append(year).append("\n");
        content.append("================================================\n\n");

        double[] monthly = new double[12];
        double totalYear = 0;
        for (Transaction t : transactions) {
            if (t.getDate() == null) continue;
            Calendar cal = Calendar.getInstance();
            cal.setTime(t.getDate());
            int m = cal.get(Calendar.MONTH);
            boolean isCredit = "CREDIT".equals(t.getType()) || "DEPOSIT".equals(t.getType());
            double amt = t.getAmount() != null ? t.getAmount().doubleValue() : 0;
            if (isCredit) { monthly[m] += amt; totalYear += amt; }
        }

        String[] mNames = new java.text.DateFormatSymbols(java.util.Locale.FRENCH).getMonths();
        content.append("Récapitulatif mensuel des crédits :\n\n");
        for (int i = 0; i < 12; i++) {
            content.append(String.format("  %-12s : %12.3f TND%n", mNames[i], monthly[i]));
        }
        content.append("\n");
        content.append(String.format("  Total annuel : %.3f TND%n", totalYear));
        content.append("\nDocument généré le : ").append(LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"))).append("\n");
        content.append("E-Bank - Document officiel\n");
        return buildSimplePdf(title, content.toString());
    }

    /**
     * Build a minimal valid PDF from text content (no external library required).
     */
    private byte[] buildSimplePdf(String title, String textContent) throws Exception {
        ByteArrayOutputStream result = new ByteArrayOutputStream();
        writePdfBytes(result, title, textContent);
        return result.toByteArray();
    }

    private void writePdfBytes(ByteArrayOutputStream out, String title, String textContent) throws Exception {
        // Build a proper minimal PDF

        String[] lines = textContent.split("\n", -1);
        StringBuilder streamContent = new StringBuilder();
        streamContent.append("BT\n/F1 9 Tf\n40 800 Td\n13 TL\n");
        for (String line : lines) {
            String escaped = line
                .replace("\\", "\\\\")
                .replace("(", "\\(")
                .replace(")", "\\)");
            streamContent.append("(").append(escaped).append(") Tj T*\n");
        }
        streamContent.append("ET\n");
        byte[] streamBytes = streamContent.toString().getBytes("ISO-8859-1");

        // Write header
        String header = "%PDF-1.4\n";
        out.write(header.getBytes("ISO-8859-1"));

        long[] obj = new long[6];

        // obj 1: catalog
        obj[1] = out.size();
        String o1 = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
        out.write(o1.getBytes("ISO-8859-1"));

        // obj 2: pages
        obj[2] = out.size();
        String o2 = "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n";
        out.write(o2.getBytes("ISO-8859-1"));

        // obj 4: font
        obj[4] = out.size();
        String o4 = "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n";
        out.write(o4.getBytes("ISO-8859-1"));

        // obj 5: content stream
        obj[5] = out.size();
        String o5header = "5 0 obj\n<< /Length " + streamBytes.length + " >>\nstream\n";
        out.write(o5header.getBytes("ISO-8859-1"));
        out.write(streamBytes);
        out.write("\nendstream\nendobj\n".getBytes("ISO-8859-1"));

        // obj 3: page
        obj[3] = out.size();
        String o3 = "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 5 0 R /Resources << /Font << /F1 4 0 R >> >> >>\nendobj\n";
        out.write(o3.getBytes("ISO-8859-1"));

        // xref
        long xrefPos = out.size();
        StringBuilder xref = new StringBuilder();
        xref.append("xref\n0 6\n");
        xref.append("0000000000 65535 f \n");
        for (int i = 1; i <= 5; i++) {
            xref.append(String.format("%010d 00000 n \n", obj[i]));
        }
        xref.append("trailer\n<< /Size 6 /Root 1 0 R >>\n");
        xref.append("startxref\n").append(xrefPos).append("\n%%EOF\n");
        out.write(xref.toString().getBytes("ISO-8859-1"));
    }
}
