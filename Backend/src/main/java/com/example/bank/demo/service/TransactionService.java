package com.example.bank.demo.service;

import com.example.bank.demo.model.Transaction;
import com.example.bank.demo.repository.TransactionRepository;
import com.example.bank.demo.model.User;
import com.example.bank.demo.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.stream.Collectors;
import java.util.Calendar;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Comparator;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.math.BigDecimal;

@Service
public class TransactionService {
    private static final Logger logger = LoggerFactory.getLogger(TransactionService.class);

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private RiskScoreService riskScoreService;

    @Autowired
    private UserRepository userRepository;

    @Transactional
    public Transaction createTransaction(Transaction transaction) {
        try {
            logger.info("Creating transaction: amount={}, type={}, from={}, to={}", 
                transaction.getAmount(), 
                transaction.getType(),
                transaction.getFromAccount(),
                transaction.getToAccount());
                
            if (transaction.getDate() == null) {
                transaction.setDate(new Date());
            }
            
            if (transaction.getStatus() == null) {
                transaction.setStatus("SUCCESS");
            }
            
            if (transaction.getCategory() != null && transaction.getCategory().getId() == null) {
                transaction.setCategory(null);
            }

            // Calculate risk score before saving
            try {
                if (transaction.getAccount() != null && transaction.getAccount().getUser() != null) {
                    User user = transaction.getAccount().getUser();
                    RiskScoreService.RiskResult risk = riskScoreService.calculateRisk(transaction, user);
                    transaction.setRiskScore(risk.score);
                    transaction.setRiskLevel(risk.level);
                    transaction.setNeedsReview(risk.needsReview);
                    if (risk.needsReview) {
                        logger.warn("High-risk transaction detected: score={}, amount={}, user={}",
                            risk.score, transaction.getAmount(), user.getUsername());
                    }
                }
            } catch (Exception riskEx) {
                logger.warn("Risk scoring failed (non-blocking): {}", riskEx.getMessage());
            }
            
            Transaction savedTransaction = transactionRepository.save(transaction);
            logger.info("Transaction created with ID: {}", savedTransaction.getId());
            
            transactionRepository.flush();
            
            return savedTransaction;
        } catch (Exception e) {
            logger.error("Error creating transaction", e);
            throw new RuntimeException("Failed to create transaction", e);
        }
    }

    @Transactional(readOnly = true)
    public List<Transaction> getTransactionsByAccountId(Long accountId) {
        logger.info("Fetching transactions for account: {}", accountId);
        try {
            List<Transaction> transactions = transactionRepository.findByAccountIdOrderByDateDesc(accountId);
            logger.info("Found {} transactions", transactions.size());
            
            // Trier les transactions par date décroissante
            transactions.sort((t1, t2) -> t2.getDate().compareTo(t1.getDate()));
            
            return transactions;
        } catch (Exception e) {
            logger.error("Error fetching transactions for account: {}", accountId, e);
            throw new RuntimeException("Failed to fetch transactions", e);
        }
    }

    @Transactional(readOnly = true)
    public List<Transaction> getTransactionsByUserId(Long userId) {
        return transactionRepository.findByAccount_UserIdOrderByDateDesc(userId);
    }

    @Transactional(readOnly = true)
    public List<Transaction> getRecentTransactionsByUserId(Long userId) {
        logger.info("Fetching recent transactions for user: {}", userId);
        try {
            // Récupérer toutes les transactions de l'utilisateur
            List<Transaction> transactions = transactionRepository.findByAccount_UserIdOrderByDateDesc(userId);
            
            // Calculer la date d'il y a 30 jours
            Calendar cal = Calendar.getInstance();
            cal.add(Calendar.DATE, -30);
            Date thirtyDaysAgo = cal.getTime();
            
            // Filtrer les transactions des 30 derniers jours
            List<Transaction> recentTransactions = transactions.stream()
                .filter(t -> t.getDate().after(thirtyDaysAgo))
                .collect(Collectors.toList());
            
            logger.info("Found {} recent transactions", recentTransactions.size());
            return recentTransactions;
        } catch (Exception e) {
            logger.error("Error fetching recent transactions", e);
            throw new RuntimeException("Failed to fetch recent transactions", e);
        }
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getTransactionStatistics(Long userId) {
        logger.info("Calculating transaction statistics for user: {}", userId);
        try {
            List<Transaction> transactions = getRecentTransactionsByUserId(userId);
            
            // Calculer les totaux
            BigDecimal totalCredits = transactions.stream()
                .filter(t -> "CREDIT".equals(t.getType()))
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
                
            BigDecimal totalDebits = transactions.stream()
                .filter(t -> "DEBIT".equals(t.getType()))
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
                
            // Trouver la dernière transaction
            Optional<Transaction> lastTransaction = transactions.stream()
                .max(Comparator.comparing(Transaction::getDate));
                
            Map<String, Object> stats = new HashMap<>();
            stats.put("totalCredits", totalCredits);
            stats.put("totalDebits", totalDebits);
            stats.put("lastTransaction", lastTransaction.orElse(null));
            stats.put("transactionCount", transactions.size());
            
            return stats;
        } catch (Exception e) {
            logger.error("Error calculating transaction statistics", e);
            throw new RuntimeException("Failed to calculate transaction statistics", e);
        }
    }

    public List<Transaction> getTransactionsByUserAndType(Long userId, String type) {
        return transactionRepository.findByAccount_User_IdAndType(userId, type);
    }

    @Transactional(readOnly = true)
    public List<Transaction> getAllTransactions() {
        try {
            // Récupérer uniquement les transactions de type virement, retrait et dépôt
            List<Transaction> transactions = transactionRepository.findAllOrderByDateDesc();
            List<Transaction> filteredTransactions = transactions.stream()
                .filter(t -> 
                    "CREDIT".equals(t.getType()) || 
                    "DEBIT".equals(t.getType()) || 
                    "DEPOSIT".equals(t.getType()) || 
                    "WITHDRAW".equals(t.getType())
                )
                .collect(Collectors.toList());
                
            logger.info("Found {} filtered transactions", filteredTransactions.size());
            return filteredTransactions;
        } catch (Exception e) {
            logger.error("Error fetching transactions", e);
            throw new RuntimeException("Failed to fetch transactions", e);
        }
    }

    public List<Transaction> getTransactionsAfterDate(LocalDateTime date) {
        return transactionRepository.findAll().stream()
            .filter(t -> t.getDate().toInstant()
                .atZone(ZoneId.systemDefault())
                .toLocalDateTime()
                .isAfter(date))
            .collect(Collectors.toList());
    }

    public List<Transaction> getTransactionsByAgencyId(Long agencyId) {
        return transactionRepository.findTransactionsByAgencyId(agencyId);
    }

    @Transactional
    public void deleteTransactionsByAccountId(Long accountId) {
        transactionRepository.deleteByAccountId(accountId);
    }

    public List<Transaction> getTransactionsByAgencyAndDateRange(
        Long agencyId, 
        LocalDateTime startDate,
        LocalDateTime endDate
    ) {
        Date startDateAsDate = Date.from(startDate.atZone(ZoneId.systemDefault()).toInstant());
        Date endDateAsDate = Date.from(endDate.atZone(ZoneId.systemDefault()).toInstant());
        return transactionRepository.findByAgencyIdAndDateBetween(agencyId, startDateAsDate, endDateAsDate);
    }

    public Map<String, Object> getAgencyStatsByDateRange(
        Long agencyId, 
        Date startDate,
        Date endDate
    ) {
        logger.info("Getting stats for agency {} from {} to {}", agencyId, startDate, endDate);
        
        Map<String, Object> stats = new HashMap<>();
        
        try {
            // Nombre total de transactions
            Long transactionCount = transactionRepository.countTransactionsByAgencyAndDateRange(
                agencyId, startDate, endDate
            );
            logger.info("Found {} transactions", transactionCount);
            
            // Somme des dépôts
            BigDecimal deposits = transactionRepository.sumAmountByTypeAndDateRange(
                agencyId, "DEPOSIT", startDate, endDate
            );
            if (deposits == null) deposits = BigDecimal.ZERO;
            logger.info("Total deposits: {}", deposits);
            
            // Somme des retraits
            BigDecimal withdrawals = transactionRepository.sumAmountByTypeAndDateRange(
                agencyId, "WITHDRAW", startDate, endDate
            );
            if (withdrawals == null) withdrawals = BigDecimal.ZERO;
            logger.info("Total withdrawals: {}", withdrawals);
            
            // Somme des virements émis
            BigDecimal transfersOut = transactionRepository.sumAmountByTypeAndDateRange(
                agencyId, "DEBIT", startDate, endDate
            );
            if (transfersOut == null) transfersOut = BigDecimal.ZERO;
            logger.info("Total transfers out: {}", transfersOut);
            
            // Somme des virements reçus
            BigDecimal transfersIn = transactionRepository.sumAmountByTypeAndDateRange(
                agencyId, "CREDIT", startDate, endDate
            );
            if (transfersIn == null) transfersIn = BigDecimal.ZERO;
            logger.info("Total transfers in: {}", transfersIn);

            stats.put("transactionCount", transactionCount);
            stats.put("deposits", deposits);
            stats.put("withdrawals", withdrawals);
            stats.put("transfersOut", transfersOut);
            stats.put("transfersIn", transfersIn);
            stats.put("totalAmount", deposits.add(transfersIn).subtract(withdrawals).subtract(transfersOut));
            
            logger.info("Final stats: {}", stats);
            return stats;
        } catch (Exception e) {
            logger.error("Error calculating stats:", e);
            throw e;
        }
    }
}
