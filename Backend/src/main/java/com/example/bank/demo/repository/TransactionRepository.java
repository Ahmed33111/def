package com.example.bank.demo.repository;

import com.example.bank.demo.model.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Date;
import java.util.List;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    List<Transaction> findByAccountIdOrderByDateDesc(Long accountId);
    List<Transaction> findByAccount_UserIdOrderByDateDesc(Long userId);
    List<Transaction> findByAccount_User_IdAndType(Long userId, String type);
    
    @Query("SELECT t FROM Transaction t WHERE t.type IN ('DEPOSIT', 'WITHDRAW') OR " +
           "(t.type = 'DEBIT' AND NOT EXISTS (" +
           "    SELECT t2 FROM Transaction t2 " +
           "    WHERE t2.type = 'CREDIT' " +
           "    AND t2.fromAccount = t.toAccount " +
           "    AND t2.toAccount = t.fromAccount " +
           "    AND t2.amount = t.amount " +
           "    AND t2.date = t.date" +
           ")) ORDER BY t.date DESC")
    List<Transaction> findAllOrderByDateDesc();

    void deleteByAccountId(Long accountId);

    @Query("SELECT DISTINCT t FROM Transaction t " +
           "JOIN FETCH t.account acc " +
           "JOIN FETCH acc.user u " +
           "WHERE u.agency.id = :agencyId " +
           "ORDER BY t.date DESC")
    List<Transaction> findTransactionsByAgencyId(Long agencyId);

    @Query("SELECT t FROM Transaction t " +
           "JOIN FETCH t.account a " +
           "JOIN FETCH a.user u " +
           "WHERE u.agency.id = :agencyId " +
           "AND t.date >= :startDate " +
           "AND t.date <= :endDate " +
           "AND t.status = 'SUCCESS' " +
           "AND t.type IN ('DEPOSIT', 'WITHDRAW', 'CREDIT', 'DEBIT')")
    List<Transaction> findByAgencyIdAndDateBetween(
        @Param("agencyId") Long agencyId,
        @Param("startDate") Date startDate,
        @Param("endDate") Date endDate
    );

    @Query("SELECT COUNT(t) FROM Transaction t " +
           "JOIN t.account a " +
           "JOIN a.user u " +
           "WHERE u.agency.id = :agencyId " +
           "AND t.date >= :startDate " +
           "AND t.date <= :endDate " +
           "AND t.status = 'SUCCESS'")
    Long countTransactionsByAgencyAndDateRange(
        @Param("agencyId") Long agencyId,
        @Param("startDate") Date startDate,
        @Param("endDate") Date endDate
    );

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t " +
           "JOIN t.account a " +
           "JOIN a.user u " +
           "WHERE u.agency.id = :agencyId " +
           "AND t.type = :type " +
           "AND t.date >= :startDate " +
           "AND t.date <= :endDate " +
           "AND t.status = 'SUCCESS'")
    java.math.BigDecimal sumAmountByTypeAndDateRange(
        @Param("agencyId") Long agencyId,
        @Param("type") String type,
        @Param("startDate") Date startDate,
        @Param("endDate") Date endDate
    );
} 