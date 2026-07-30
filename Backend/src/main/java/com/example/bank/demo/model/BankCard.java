package com.example.bank.demo.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import com.example.bank.demo.util.CryptoConverter;

@Entity
@Table(name = "bank_cards")
public class BankCard {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, length = 255)
    @Convert(converter = CryptoConverter.class)
    private String cardNumber;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private CardType cardType;

    @ManyToOne
    @JoinColumn(name = "account_id")
    private Account account;

    private LocalDate expirationDate;

    @Column(length = 255)
    @Convert(converter = CryptoConverter.class)
    private String cvv;

    // Advanced card management fields
    @Column(nullable = false)
    private boolean blocked = false;

    @Column(nullable = false)
    private boolean contactlessEnabled = true;

    @Column(nullable = false)
    private boolean onlinePaymentEnabled = true;

    @Column(nullable = false)
    private boolean internationalEnabled = false;

    @Column(precision = 10, scale = 2)
    private BigDecimal dailyWithdrawalLimit = new BigDecimal("1000.00");

    @Column(precision = 10, scale = 2)
    private BigDecimal dailyPaymentLimit = new BigDecimal("5000.00");

    @Column(length = 30)
    private String cardSubType = "STANDARD"; // STANDARD, MYCARD, PREPAID, DEVISES

    @Column(precision = 10, scale = 2)
    private BigDecimal prepaidBalance = BigDecimal.ZERO;

    public enum CardType {
        VISA, MASTERCARD
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCardNumber() { return cardNumber; }
    public void setCardNumber(String cardNumber) { this.cardNumber = cardNumber; }

    public CardType getCardType() { return cardType; }
    public void setCardType(CardType cardType) { this.cardType = cardType; }

    public Account getAccount() { return account; }
    public void setAccount(Account account) { this.account = account; }

    public LocalDate getExpirationDate() { return expirationDate; }
    public void setExpirationDate(LocalDate expirationDate) { this.expirationDate = expirationDate; }

    public String getCvv() { return cvv; }
    public void setCvv(String cvv) { this.cvv = cvv; }

    public boolean isBlocked() { return blocked; }
    public void setBlocked(boolean blocked) { this.blocked = blocked; }

    public boolean isContactlessEnabled() { return contactlessEnabled; }
    public void setContactlessEnabled(boolean contactlessEnabled) { this.contactlessEnabled = contactlessEnabled; }

    public boolean isOnlinePaymentEnabled() { return onlinePaymentEnabled; }
    public void setOnlinePaymentEnabled(boolean onlinePaymentEnabled) { this.onlinePaymentEnabled = onlinePaymentEnabled; }

    public boolean isInternationalEnabled() { return internationalEnabled; }
    public void setInternationalEnabled(boolean internationalEnabled) { this.internationalEnabled = internationalEnabled; }

    public BigDecimal getDailyWithdrawalLimit() { return dailyWithdrawalLimit; }
    public void setDailyWithdrawalLimit(BigDecimal dailyWithdrawalLimit) { this.dailyWithdrawalLimit = dailyWithdrawalLimit; }

    public BigDecimal getDailyPaymentLimit() { return dailyPaymentLimit; }
    public void setDailyPaymentLimit(BigDecimal dailyPaymentLimit) { this.dailyPaymentLimit = dailyPaymentLimit; }

    public String getCardSubType() { return cardSubType; }
    public void setCardSubType(String cardSubType) { this.cardSubType = cardSubType; }

    public BigDecimal getPrepaidBalance() { return prepaidBalance; }
    public void setPrepaidBalance(BigDecimal prepaidBalance) { this.prepaidBalance = prepaidBalance; }
} 