package com.example.bank.demo.service;

import com.example.bank.demo.model.Agency;
import com.example.bank.demo.model.User;
import com.example.bank.demo.repository.AgencyRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@Service
public class AgencyService {

    @Autowired
    private AgencyRepository agencyRepository;

    @Autowired
    private UserService userService;

    @Transactional
    public Agency createAgency(Agency agency, Long directorId) {
        if (agencyRepository.existsByCode(agency.getCode())) {
            throw new RuntimeException("Une agence avec ce code existe déjà");
        }

        User director = userService.getUserById(directorId);
        if (!"ROLE_DIRECTOR".equals(director.getRole())) {
            throw new RuntimeException("L'utilisateur sélectionné n'est pas un directeur");
        }

        agency.setDirector(director);
        agency.setCreatedAt(LocalDateTime.now());
        agency.setIsActive(true);
        return agencyRepository.save(agency);
    }

    public List<Agency> getAllAgencies() {
        return agencyRepository.findAll();
    }

    public Agency getAgencyById(Long id) {
        return agencyRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Agence non trouvée"));
    }

    @Transactional
    public Agency updateAgency(Long id, Agency agencyDetails) {
        Agency agency = getAgencyById(id);
        agency.setName(agencyDetails.getName());
        agency.setAddress(agencyDetails.getAddress());
        agency.setPhone(agencyDetails.getPhone());
        agency.setEmail(agencyDetails.getEmail());
        
        if (agencyDetails.getDirector() != null) {
            User director = userService.getUserById(agencyDetails.getDirector().getId());
            if (!"ROLE_DIRECTOR".equals(director.getRole())) {
                throw new RuntimeException("L'utilisateur sélectionné n'est pas un directeur");
            }
            agency.setDirector(director);
        }
        
        return agencyRepository.save(agency);
    }

    @Transactional
    public void deleteAgency(Long id) {
        Agency agency = agencyRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Agence non trouvée"));
        
        // Dissocier le directeur
        agency.setDirector(null);
        agencyRepository.delete(agency);
    }

    public Agency getAgencyByDirectorUsername(String username) {
        User director = userService.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("Directeur non trouvé"));
        
        return agencyRepository.findByDirectorId(director.getId())
            .orElseThrow(() -> new RuntimeException("Agence non trouvée pour ce directeur"));
    }

    public Map<String, Object> getAgencyStatistics(Long agencyId) {
        Map<String, Object> stats = new HashMap<>();
        
        // Récupérer les statistiques de l'agence
        List<User> cashiers = userService.getCashiersByAgencyId(agencyId);
        List<User> clients = userService.getClients(); // Filtrer par agence si nécessaire
        
        stats.put("totalCashiers", cashiers.size());
        stats.put("totalClients", clients.size());
        // Ajouter d'autres statistiques selon vos besoins
        
        return stats;
    }
} 