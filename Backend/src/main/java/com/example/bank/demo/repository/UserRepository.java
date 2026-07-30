package com.example.bank.demo.repository;

import com.example.bank.demo.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    boolean existsByUsername(String username);
    List<User> findByRoleAndAgency_Id(String role, Long agencyId);
    
    @Query("SELECT u FROM User u LEFT JOIN FETCH u.agency WHERE u.username = :username")
    Optional<User> findByUsernameWithAgency(@Param("username") String username);
} 