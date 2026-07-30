package com.example.bank.demo.service;

import com.example.bank.demo.model.Transaction;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.Map;
import java.util.HashMap;
import java.util.List;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalDate;

@Service
public class AgencyStatsService {

    @Autowired
    private AccountService accountService;

    @Autowired
    private TransactionService transactionService;

    @Autowired
    private UserService userService;

    public Map<String, Object> getAgencyStats() {
        Map<String, Object> stats = new HashMap<>();
        
        // Statistiques générales
        stats.put("totalAccounts", accountService.getAllAccounts().size());
        stats.put("totalClients", userService.getClients().size());
        stats.put("totalStaff", userService.getStaffMembers().size());
        
        // Statistiques des transactions
        LocalDateTime startOfMonth = LocalDate.now().atStartOfDay();
        List<Transaction> monthlyTransactions = transactionService.getTransactionsAfterDate(startOfMonth);
        
        BigDecimal totalDeposits = monthlyTransactions.stream()
            .filter(t -> t.getType().equals("DEPOSIT"))
            .map(Transaction::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
            
        BigDecimal totalWithdrawals = monthlyTransactions.stream()
            .filter(t -> t.getType().equals("WITHDRAW"))
            .map(Transaction::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
            
        stats.put("monthlyDeposits", totalDeposits);
        stats.put("monthlyWithdrawals", totalWithdrawals);
        stats.put("monthlyTransactionCount", monthlyTransactions.size());

        return stats;
    }
} 
