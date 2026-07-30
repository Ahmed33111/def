package com.example.bank.demo.service;

import com.example.bank.demo.model.Account;
import com.example.bank.demo.model.VirementProgramme;
import com.example.bank.demo.model.VirementStatus;
import com.example.bank.demo.repository.VirementProgrammeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class VirementProgrammeService {
    
    private static final Logger logger = LoggerFactory.getLogger(VirementProgrammeService.class);
    
    @Autowired
    private VirementProgrammeRepository virementProgrammeRepository;
    
    @Autowired
    private AccountService accountService;

    @Transactional
    public VirementProgramme programmerVirement(Account compteSource, 
                                              String numeroCompteDestination,
                                              String beneficiaireName,
                                              BigDecimal montant,
                                              LocalDateTime dateExecution) {
        logger.info("Programmation d'un virement : montant={}, date={}", montant, dateExecution);
        
        // Vérifier que la date d'exécution est dans le futur
        if (dateExecution.isBefore(LocalDateTime.now())) {
            throw new RuntimeException("La date d'exécution doit être dans le futur");
        }
        
        VirementProgramme virement = new VirementProgramme();
        virement.setCompteSource(compteSource);
        virement.setNumeroCompteDestination(numeroCompteDestination);
        virement.setBeneficiaireName(beneficiaireName);
        virement.setMontant(montant);
        virement.setDateExecution(dateExecution);
        virement.setExecuted(false);
        virement.setStatus(VirementStatus.EN_ATTENTE);
        
        return virementProgrammeRepository.save(virement);
    }

    @Scheduled(fixedRate = 60000) // Vérifie toutes les minutes
    @Transactional
    public void executeVirementsEchus() {
        logger.info("Vérification des virements programmés à exécuter");
        LocalDateTime now = LocalDateTime.now();
        List<VirementProgramme> virementsAExecuter = 
            virementProgrammeRepository.findByDateExecutionBeforeAndExecutedFalse(now);

        logger.info("Nombre de virements à exécuter : {}", virementsAExecuter.size());

        for (VirementProgramme virement : virementsAExecuter) {
            try {
                logger.info("Exécution du virement programmé ID={}", virement.getId());
                
                // Exécuter le virement directement sans vérification de mot de passe
                Account sourceAccount = virement.getCompteSource();
                if (sourceAccount.getBalance().compareTo(virement.getMontant()) >= 0) {
                    sourceAccount.setBalance(sourceAccount.getBalance().subtract(virement.getMontant()));
                    
                    // Trouver le compte destinataire
                    Account destinationAccount = accountService.findByAccountNumber(virement.getNumeroCompteDestination())
                        .orElseThrow(() -> new RuntimeException("Compte destinataire non trouvé"));
                    
                    destinationAccount.setBalance(destinationAccount.getBalance().add(virement.getMontant()));
                    
                    // Créer les transactions
                    accountService.createTransactionPair(
                        sourceAccount,
                        destinationAccount,
                        virement.getMontant(),
                        "Virement programmé"
                    );
                    
                    virement.setExecuted(true);
                    virement.setStatus(VirementStatus.EXECUTE);
                    virementProgrammeRepository.save(virement);
                    
                    logger.info("Virement programmé ID={} exécuté avec succès", virement.getId());
                } else {
                    virement.setStatus(VirementStatus.REFUSE);
                    virement.setRefusReason("Solde insuffisant pour effectuer le virement");
                    logger.error("Solde insuffisant pour le virement programmé ID={}", virement.getId());
                }
                virement.setExecuted(true);
                virementProgrammeRepository.save(virement);
            } catch (Exception e) {
                virement.setStatus(VirementStatus.REFUSE);
                virement.setRefusReason("Erreur technique : " + e.getMessage());
                virement.setExecuted(true);
                virementProgrammeRepository.save(virement);
                logger.error("Erreur lors de l'exécution du virement programmé ID=" + virement.getId(), e);
            }
        }
    }

    public List<VirementProgramme> getVirementsProgrammes(Long userId) {
        logger.info("Récupération des virements programmés pour l'utilisateur ID={}", userId);
        return virementProgrammeRepository.findByCompteSource_User_IdOrderByDateExecutionDesc(userId);
    }

    @Transactional
    public void annulerVirement(Long virementId, Long userId) {
        VirementProgramme virement = virementProgrammeRepository.findById(virementId)
            .orElseThrow(() -> new RuntimeException("Virement programmé non trouvé"));

        // Vérifier que le virement appartient à l'utilisateur
        if (!virement.getCompteSource().getUser().getId().equals(userId)) {
            throw new RuntimeException("Non autorisé à annuler ce virement");
        }

        // Vérifier que le virement n'est pas déjà exécuté
        if (virement.isExecuted() || virement.getStatus() != VirementStatus.EN_ATTENTE) {
            throw new RuntimeException("Ce virement ne peut plus être annulé");
        }

        // Supprimer le virement
        virementProgrammeRepository.delete(virement);
    }
} 
