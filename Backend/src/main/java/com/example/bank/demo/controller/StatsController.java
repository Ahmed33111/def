package com.example.bank.demo.controller;

import com.example.bank.demo.model.*;
import com.example.bank.demo.repository.*;
import com.example.bank.demo.service.UserService;
import com.example.bank.demo.service.AgencyService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/stats")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001", "http://localhost:5173"}, allowCredentials = "true")
public class StatsController {
    private static final Logger logger = LoggerFactory.getLogger(StatsController.class);

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private BankCardRepository bankCardRepository;

    @Autowired
    private AgencyRepository agencyRepository;

    @Autowired
    private AgencyService agencyService;

    @GetMapping("/dashboard")
    public ResponseEntity<?> getDashboardStats(@RequestHeader("Authorization") String authHeader) {
        try {
            User currentUser = userService.validateUser(authHeader);
            String role = currentUser.getRole();

            Map<String, Object> response = new HashMap<>();
            
            if ("ROLE_ADMIN".equals(role) || "ADMIN".equals(role)) {
                response = getAdminStats();
            } else if ("ROLE_DIRECTOR".equals(role) || "DIRECTOR".equals(role)) {
                Agency agency = agencyRepository.findByDirectorId(currentUser.getId())
                        .orElseThrow(() -> new RuntimeException("Agence non trouvée pour ce directeur"));
                response = getAgencyStats(agency.getId());
            } else if ("ROLE_CASHIER".equals(role) || "CASHIER".equals(role)) {
                if (currentUser.getAgency() == null) {
                    throw new RuntimeException("Caissier non associé à une agence");
                }
                response = getAgencyStats(currentUser.getAgency().getId());
            } else if ("ROLE_USER".equals(role) || "USER".equals(role)) {
                response = getUserStats(currentUser.getId());
            } else {
                return ResponseEntity.status(403).body("Rôle non supporté");
            }

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error in getDashboardStats: {}", e.getMessage(), e);
            Map<String, Object> emptyDashboard = new HashMap<>();
            emptyDashboard.put("kpis", Map.of(
                "totalBalance", 0,
                "totalAccounts", 0,
                "totalCards", 0,
                "totalTransactions", 0,
                "totalAgencies", 0,
                "totalClients", 0,
                "totalStaff", 0
            ));
            emptyDashboard.put("evolution", java.util.Collections.emptyList());
            emptyDashboard.put("heatmap", java.util.Collections.emptyList());
            emptyDashboard.put("accountBreakdown", java.util.Collections.emptyMap());
            emptyDashboard.put("cardBreakdown", java.util.Collections.emptyMap());
            emptyDashboard.put("agencyComparison", java.util.Collections.emptyList());
            return ResponseEntity.ok(emptyDashboard);
        }
    }

    private Map<String, Object> getAdminStats() {
        Map<String, Object> stats = new HashMap<>();

        List<Account> accounts = accountRepository.findAll();
        List<User> users = userRepository.findAll();
        List<Transaction> transactions = transactionRepository.findAll();
        List<BankCard> cards = bankCardRepository.findAll();
        List<Agency> agencies = agencyRepository.findAll();

        // 1. KPIs
        BigDecimal totalBalance = accounts.stream()
                .filter(a -> !"CLOSED".equals(a.getStatus()))
                .map(Account::getBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long activeAccounts = accounts.stream().filter(a -> "ACTIVE".equals(a.getStatus())).count();
        long activeCards = cards.stream().filter(c -> !c.isBlocked()).count();
        long successTransactions = transactions.stream().filter(t -> "SUCCESS".equals(t.getStatus()) || t.getStatus() == null).count();

        Map<String, Object> kpis = new HashMap<>();
        kpis.put("totalBalance", totalBalance);
        kpis.put("totalAccounts", activeAccounts);
        kpis.put("totalCards", activeCards);
        kpis.put("totalTransactions", successTransactions);
        kpis.put("totalAgencies", agencies.size());
        stats.put("kpis", kpis);

        // 2. Evolution over last 30 days
        List<Map<String, Object>> evolution = getEvolutionData(transactions, null);
        stats.put("evolution", evolution);

        // 3. Currency breakdown (Pie Chart)
        Map<String, Long> accountBreakdown = accounts.stream()
                .filter(a -> !"CLOSED".equals(a.getStatus()))
                .collect(Collectors.groupingBy(a -> a.getCurrency().name(), Collectors.counting()));
        stats.put("accountBreakdown", accountBreakdown);

        // 4. Card subtype breakdown (Donut Chart)
        Map<String, Long> cardBreakdown = cards.stream()
                .collect(Collectors.groupingBy(BankCard::getCardSubType, Collectors.counting()));
        stats.put("cardBreakdown", cardBreakdown);

        // 5. Agency comparison (Bar Chart)
        List<Map<String, Object>> agencyComparison = new ArrayList<>();
        for (Agency agency : agencies) {
            BigDecimal dep = transactions.stream()
                    .filter(t -> t.getAccount() != null && t.getAccount().getUser() != null &&
                            agency.getId().equals(t.getAccount().getUser().getAgency() != null ? t.getAccount().getUser().getAgency().getId() : null))
                    .filter(t -> "DEPOSIT".equals(t.getType()))
                    .map(Transaction::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal wit = transactions.stream()
                    .filter(t -> t.getAccount() != null && t.getAccount().getUser() != null &&
                            agency.getId().equals(t.getAccount().getUser().getAgency() != null ? t.getAccount().getUser().getAgency().getId() : null))
                    .filter(t -> "WITHDRAW".equals(t.getType()))
                    .map(Transaction::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            Map<String, Object> compare = new HashMap<>();
            compare.put("agency", agency.getName());
            compare.put("deposits", dep);
            compare.put("withdrawals", wit);
            agencyComparison.add(compare);
        }
        stats.put("agencyComparison", agencyComparison);

        // 6. Heatmap of activity (Day vs Hour)
        stats.put("heatmap", getHeatmapData(transactions, null));

        return stats;
    }

    private Map<String, Object> getAgencyStats(Long agencyId) {
        Map<String, Object> stats = new HashMap<>();

        List<Account> accounts = accountRepository.findAll().stream()
                .filter(a -> a.getUser() != null && a.getUser().getAgency() != null && agencyId.equals(a.getUser().getAgency().getId()))
                .collect(Collectors.toList());

        List<User> clients = userRepository.findByRoleAndAgency_Id("ROLE_USER", agencyId);
        List<User> staff = userRepository.findByRoleAndAgency_Id("ROLE_CASHIER", agencyId);
        
        List<Transaction> transactions = transactionRepository.findTransactionsByAgencyId(agencyId);
        
        List<BankCard> cards = bankCardRepository.findAll().stream()
                .filter(c -> c.getAccount() != null && c.getAccount().getUser() != null &&
                        agencyId.equals(c.getAccount().getUser().getAgency() != null ? c.getAccount().getUser().getAgency().getId() : null))
                .collect(Collectors.toList());

        // 1. KPIs
        BigDecimal totalBalance = accounts.stream()
                .filter(a -> !"CLOSED".equals(a.getStatus()))
                .map(Account::getBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long activeAccounts = accounts.stream().filter(a -> "ACTIVE".equals(a.getStatus())).count();
        long activeCards = cards.stream().filter(c -> !c.isBlocked()).count();
        long totalTransactions = transactions.size();

        Map<String, Object> kpis = new HashMap<>();
        kpis.put("totalBalance", totalBalance);
        kpis.put("totalAccounts", activeAccounts);
        kpis.put("totalCards", activeCards);
        kpis.put("totalTransactions", totalTransactions);
        kpis.put("totalClients", clients.size());
        kpis.put("totalStaff", staff.size());
        stats.put("kpis", kpis);

        // 2. Evolution
        List<Map<String, Object>> evolution = getEvolutionData(transactions, null);
        stats.put("evolution", evolution);

        // 3. Account Currency breakdown
        Map<String, Long> accountBreakdown = accounts.stream()
                .filter(a -> !"CLOSED".equals(a.getStatus()))
                .collect(Collectors.groupingBy(a -> a.getCurrency().name(), Collectors.counting()));
        stats.put("accountBreakdown", accountBreakdown);

        // 4. Card type breakdown
        Map<String, Long> cardBreakdown = cards.stream()
                .collect(Collectors.groupingBy(BankCard::getCardSubType, Collectors.counting()));
        stats.put("cardBreakdown", cardBreakdown);

        // 5. Agency comparison (Comparing this agency with others' average)
        List<Map<String, Object>> comparison = new ArrayList<>();
        
        BigDecimal thisDep = transactions.stream()
                .filter(t -> "DEPOSIT".equals(t.getType()))
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal thisWit = transactions.stream()
                .filter(t -> "WITHDRAW".equals(t.getType()))
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Object> thisAgencyData = new HashMap<>();
        thisAgencyData.put("name", "Mon Agence");
        thisAgencyData.put("deposits", thisDep);
        thisAgencyData.put("withdrawals", thisWit);
        comparison.add(thisAgencyData);

        // Bank Average
        List<Transaction> allTransactions = transactionRepository.findAll();
        long totalAgenciesCount = Math.max(1, agencyRepository.count());
        BigDecimal avgDep = allTransactions.stream()
                .filter(t -> "DEPOSIT".equals(t.getType()))
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(totalAgenciesCount), 2, BigDecimal.ROUND_HALF_UP);
        BigDecimal avgWit = allTransactions.stream()
                .filter(t -> "WITHDRAW".equals(t.getType()))
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(totalAgenciesCount), 2, BigDecimal.ROUND_HALF_UP);

        Map<String, Object> avgAgencyData = new HashMap<>();
        avgAgencyData.put("name", "Moyenne Banque");
        avgAgencyData.put("deposits", avgDep);
        avgAgencyData.put("withdrawals", avgWit);
        comparison.add(avgAgencyData);
        
        stats.put("agencyComparison", comparison);

        // 6. Heatmap
        stats.put("heatmap", getHeatmapData(transactions, null));

        return stats;
    }

    private Map<String, Object> getUserStats(Long userId) {
        Map<String, Object> stats = new HashMap<>();

        List<Account> accounts = accountRepository.findByUserId(userId);
        List<Long> accountIds = accounts.stream().map(Account::getId).collect(Collectors.toList());

        List<Transaction> transactions = transactionRepository.findByAccount_UserIdOrderByDateDesc(userId);
        
        List<BankCard> cards = new ArrayList<>();
        for (Account a : accounts) {
            cards.addAll(bankCardRepository.findByAccountId(a.getId()));
        }

        // 1. KPIs
        BigDecimal totalBalance = accounts.stream()
                .filter(a -> !"CLOSED".equals(a.getStatus()))
                .map(Account::getBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Net Savings this month
        LocalDate startOfMonth = LocalDate.now().withDayOfMonth(1);
        BigDecimal savings = transactions.stream()
                .filter(t -> {
                    LocalDate d = t.getDate().toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
                    return !d.isBefore(startOfMonth);
                })
                .map(t -> {
                    if ("DEPOSIT".equals(t.getType()) || "CREDIT".equals(t.getType())) {
                        return t.getAmount();
                    } else {
                        return t.getAmount().negate();
                    }
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long activeCards = cards.stream().filter(c -> !c.isBlocked()).count();
        long txCount = transactions.size();

        Map<String, Object> kpis = new HashMap<>();
        kpis.put("totalBalance", totalBalance);
        kpis.put("monthlySavings", savings);
        kpis.put("totalCards", activeCards);
        kpis.put("totalTransactions", txCount);
        stats.put("kpis", kpis);

        // 2. Evolution
        List<Map<String, Object>> evolution = getEvolutionData(transactions, accountIds);
        stats.put("evolution", evolution);

        // 3. Category Breakdown (Pie Chart)
        Map<String, BigDecimal> categoryBreakdown = new HashMap<>();
        for (Transaction t : transactions) {
            String categoryName = t.getCategory() != null ? t.getCategory().getName() : "Autre";
            categoryBreakdown.put(categoryName, categoryBreakdown.getOrDefault(categoryName, BigDecimal.ZERO).add(t.getAmount()));
        }
        stats.put("categoryBreakdown", categoryBreakdown);

        // 4. Card Limits and Usage
        List<Map<String, Object>> cardUsage = cards.stream()
                .map(c -> {
                    Map<String, Object> usage = new HashMap<>();
                    usage.put("card", "**** " + c.getCardNumber().substring(Math.max(0, c.getCardNumber().length() - 4)));
                    usage.put("limit", c.getDailyPaymentLimit());
                    usage.put("usage", c.getPrepaidBalance());
                    return usage;
                })
                .collect(Collectors.toList());
        stats.put("cardUsage", cardUsage);

        // 5. Heatmap
        stats.put("heatmap", getHeatmapData(transactions, accountIds));

        return stats;
    }

    private List<Map<String, Object>> getEvolutionData(List<Transaction> transactions, List<Long> filterAccountIds) {
        List<Map<String, Object>> evolution = new ArrayList<>();
        
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusDays(29);

        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd/MM");

        for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
            LocalDate finalDate = date;
            
            List<Transaction> dayTx = transactions.stream()
                    .filter(t -> {
                        LocalDate d = t.getDate().toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
                        return d.equals(finalDate);
                    })
                    .filter(t -> filterAccountIds == null || filterAccountIds.contains(t.getAccount().getId()))
                    .collect(Collectors.toList());

            BigDecimal dep = dayTx.stream()
                    .filter(t -> "DEPOSIT".equals(t.getType()) || "CREDIT".equals(t.getType()))
                    .map(Transaction::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal wit = dayTx.stream()
                    .filter(t -> "WITHDRAW".equals(t.getType()) || "DEBIT".equals(t.getType()))
                    .map(Transaction::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            Map<String, Object> point = new HashMap<>();
            point.put("date", finalDate.format(dtf));
            point.put("deposits", dep);
            point.put("withdrawals", wit);
            evolution.add(point);
        }

        return evolution;
    }

    private List<Map<String, Object>> getHeatmapData(List<Transaction> transactions, List<Long> filterAccountIds) {
        String[] days = {"Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"};
        
        List<Map<String, Object>> heatmap = new ArrayList<>();

        for (int d = 0; d < 7; d++) {
            final int dayOfWeekIdx = d; // 0=Mon, 6=Sun (we'll map java DayOfWeek which is 1=Mon, 7=Sun)
            int javaDayOfWeek = dayOfWeekIdx + 1;

            for (int hour = 8; hour <= 18; hour += 2) {
                final int finalHourStart = hour;
                final int finalHourEnd = hour + 2;

                long count = transactions.stream()
                        .filter(t -> {
                            java.time.LocalDateTime dt = t.getDate().toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime();
                            int dow = dt.getDayOfWeek().getValue();
                            int hr = dt.getHour();
                            return dow == javaDayOfWeek && hr >= finalHourStart && hr < finalHourEnd;
                        })
                        .filter(t -> filterAccountIds == null || filterAccountIds.contains(t.getAccount().getId()))
                        .count();

                Map<String, Object> cell = new HashMap<>();
                cell.put("day", days[dayOfWeekIdx]);
                cell.put("hour", hour + "h-" + (hour + 2) + "h");
                cell.put("value", count);
                heatmap.add(cell);
            }
        }
        return heatmap;
    }
}
