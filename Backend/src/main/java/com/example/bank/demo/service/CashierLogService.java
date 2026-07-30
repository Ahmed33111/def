package com.example.bank.demo.service;

import com.example.bank.demo.model.CashierLog;
import com.example.bank.demo.model.User;
import com.example.bank.demo.repository.CashierLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
import java.math.BigDecimal;

@Service
public class CashierLogService {

    @Autowired
    private CashierLogRepository cashierLogRepository;

    public CashierLog createLog(String type, String description, User cashier, String status) {
        CashierLog log = new CashierLog();
        log.setType(type);
        log.setDescription(description);
        log.setDate(LocalDateTime.now());
        log.setCashier(cashier);
        log.setStatus(status);
        return cashierLogRepository.save(log);
    }

    public CashierLog createDetailedLog(
            String type,
            String description,
            User cashier,
            String status,
            BigDecimal amount,
            String accountNumber,
            String userName,
            String details
    ) {
        CashierLog log = new CashierLog();
        log.setType(type);
        log.setDescription(description);
        log.setDate(LocalDateTime.now());
        log.setCashier(cashier);
        log.setStatus(status);
        log.setAmount(amount);
        log.setAccountNumber(accountNumber);
        log.setUserName(userName);
        log.setDetails(details);
        return cashierLogRepository.save(log);
    }

    public List<CashierLog> getLogsByCashier(Long cashierId) {
        return cashierLogRepository.findByCashierIdOrderByDateDesc(cashierId);
    }

    public List<CashierLog> getAllLogs() {
        return cashierLogRepository.findAllByOrderByDateDesc();
    }
} 