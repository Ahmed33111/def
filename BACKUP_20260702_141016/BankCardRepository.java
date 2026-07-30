package com.example.bank.demo.repository;

import com.example.bank.demo.model.BankCard;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BankCardRepository extends JpaRepository<BankCard, Long> {
    boolean existsByCardNumber(String cardNumber);
    List<BankCard> findByAccountId(Long accountId);
    void deleteByAccountId(Long accountId);
} 