package com.example.bank.demo.repository;

import com.example.bank.demo.model.CashierLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CashierLogRepository extends JpaRepository<CashierLog, Long> {
    List<CashierLog> findByCashierIdOrderByDateDesc(Long cashierId);
    List<CashierLog> findAllByOrderByDateDesc();
    void deleteByCashierId(Long cashierId);
} 