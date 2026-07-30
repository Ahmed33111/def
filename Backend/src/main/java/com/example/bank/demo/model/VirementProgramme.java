package com.example.bank.demo.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.math.BigDecimal;

@Entity
@Table(name = "virement_programme")
public class VirementProgramme {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "compte_source_id")
    private Account compteSource;

    private String numeroCompteDestination;
    private String beneficiaireName;
    @Column(precision = 19, scale = 2)
    private BigDecimal montant;
    private LocalDateTime dateExecution;
    private boolean executed;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private VirementStatus status = VirementStatus.EN_ATTENTE;

    @Column(name = "refus_reason")
    private String refusReason;

    // Getters et Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Account getCompteSource() {
        return compteSource;
    }

    public void setCompteSource(Account compteSource) {
        this.compteSource = compteSource;
    }

    public String getNumeroCompteDestination() {
        return numeroCompteDestination;
    }

    public void setNumeroCompteDestination(String numeroCompteDestination) {
        this.numeroCompteDestination = numeroCompteDestination;
    }

    public String getBeneficiaireName() {
        return beneficiaireName;
    }

    public void setBeneficiaireName(String beneficiaireName) {
        this.beneficiaireName = beneficiaireName;
    }

    public BigDecimal getMontant() {
        return montant;
    }

    public void setMontant(BigDecimal montant) {
        this.montant = montant;
    }

    public LocalDateTime getDateExecution() {
        return dateExecution;
    }

    public void setDateExecution(LocalDateTime dateExecution) {
        this.dateExecution = dateExecution;
    }

    public boolean isExecuted() {
        return executed;
    }

    public void setExecuted(boolean executed) {
        this.executed = executed;
    }

    public VirementStatus getStatus() {
        return status;
    }

    public void setStatus(VirementStatus status) {
        this.status = status;
    }

    public String getRefusReason() {
        return refusReason;
    }

    public void setRefusReason(String refusReason) {
        this.refusReason = refusReason;
    }
} 