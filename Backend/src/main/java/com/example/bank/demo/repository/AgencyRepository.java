package com.example.bank.demo.repository;

import com.example.bank.demo.model.Agency;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AgencyRepository extends JpaRepository<Agency, Long> {
    boolean existsByCode(String code);
    Optional<Agency> findByCode(String code);
    Optional<Agency> findByDirectorId(Long directorId);
} 