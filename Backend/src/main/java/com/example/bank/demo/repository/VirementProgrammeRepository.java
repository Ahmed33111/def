package com.example.bank.demo.repository;

import com.example.bank.demo.model.VirementProgramme;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;

public interface VirementProgrammeRepository extends JpaRepository<VirementProgramme, Long> {
    List<VirementProgramme> findByCompteSource_User_IdOrderByDateExecutionDesc(Long userId);
    List<VirementProgramme> findByDateExecutionBeforeAndExecutedFalse(LocalDateTime date);
} 