package com.example.bank.demo.service;

import com.example.bank.demo.model.Transaction;
import com.example.bank.demo.model.User;
import com.example.bank.demo.repository.TransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Calendar;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class RiskScoreService {

    @Autowired
    private TransactionRepository transactionRepository;

    public static class RiskResult {
        public final int score;
        public final String level;
        public final boolean needsReview;
        public final Map<String, Integer> factors;

        public RiskResult(int score, Map<String, Integer> factors) {
            this.score = Math.min(score, 100);
            this.factors = factors;
            if (this.score > 70) {
                this.level = "HIGH";
                this.needsReview = true;
            } else if (this.score >= 30) {
                this.level = "MEDIUM";
                this.needsReview = false;
            } else {
                this.level = "LOW";
                this.needsReview = false;
            }
        }
    }

    public RiskResult calculateRisk(Transaction transaction, User user) {
        int score = 0;
        Map<String, Integer> factors = new HashMap<>();

        BigDecimal amount = transaction.getAmount();
        if (amount == null) amount = BigDecimal.ZERO;

        // --- Factor 1: Amount > 3x average of last 30 days (+30) ---
        try {
            List<Transaction> recent30 = transactionRepository
                .findByAccount_UserIdOrderByDateDesc(user.getId());
            Calendar cal = Calendar.getInstance();
            cal.add(Calendar.DATE, -30);
            Date thirtyDaysAgo = cal.getTime();
            List<Transaction> last30 = recent30.stream()
                .filter(t -> t.getDate() != null && t.getDate().after(thirtyDaysAgo))
                .collect(Collectors.toList());

            if (!last30.isEmpty()) {
                BigDecimal sum = last30.stream()
                    .map(t -> t.getAmount() != null ? t.getAmount() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
                BigDecimal avg = sum.divide(BigDecimal.valueOf(last30.size()), 2, java.math.RoundingMode.HALF_UP);
                BigDecimal threshold = avg.multiply(BigDecimal.valueOf(3));
                if (amount.compareTo(threshold) > 0) {
                    score += 30;
                    factors.put("HIGH_AMOUNT_VS_AVG", 30);
                }
            }

            // --- Factor 2: Hour between 02:00 and 06:00 (+20) ---
            if (transaction.getDate() != null) {
                Calendar txCal = Calendar.getInstance();
                txCal.setTime(transaction.getDate());
                int hour = txCal.get(Calendar.HOUR_OF_DAY);
                if (hour >= 2 && hour < 6) {
                    score += 20;
                    factors.put("SUSPICIOUS_HOUR", 20);
                }
            }

            // --- Factor 3: >3 transactions in last 10 minutes (+25) ---
            if (transaction.getDate() != null) {
                Date txDate = transaction.getDate();
                long tenMinutesAgo = txDate.getTime() - 10 * 60 * 1000L;
                long recentCount = recent30.stream()
                    .filter(t -> t.getDate() != null && t.getDate().getTime() >= tenMinutesAgo
                        && t.getDate().getTime() <= txDate.getTime())
                    .count();
                if (recentCount > 3) {
                    score += 25;
                    factors.put("RAPID_TRANSACTIONS", 25);
                }
            }

            // --- Factor 4: New beneficiary (+15) ---
            String toAccount = transaction.getToAccount();
            if (toAccount != null && !toAccount.isBlank()
                    && !"CASH".equals(toAccount) && !"BANK".equals(toAccount)) {
                boolean isNewBeneficiary = recent30.stream()
                    .noneMatch(t -> toAccount.equals(t.getToAccount()));
                if (isNewBeneficiary) {
                    score += 15;
                    factors.put("NEW_BENEFICIARY", 15);
                }
            }

            // --- Factor 5: Amount > 5000 TND (+10) ---
            if (amount.compareTo(BigDecimal.valueOf(5000)) > 0) {
                score += 10;
                factors.put("LARGE_AMOUNT", 10);
            }

        } catch (Exception e) {
            // Safe fallback: return score as-is
        }

        return new RiskResult(score, factors);
    }
}
