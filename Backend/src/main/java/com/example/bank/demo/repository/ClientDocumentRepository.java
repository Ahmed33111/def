package com.example.bank.demo.repository;

import com.example.bank.demo.model.ClientDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface ClientDocumentRepository extends JpaRepository<ClientDocument, Long> {

    List<ClientDocument> findByUserIdOrderByUploadedAtDesc(Long userId);

    List<ClientDocument> findByStatusOrderByUploadedAtDesc(String status);

    List<ClientDocument> findAllByOrderByUploadedAtDesc();

    long countByStatus(String status);

    @Query("SELECT d FROM ClientDocument d WHERE d.uploadedAt >= :since ORDER BY d.uploadedAt DESC")
    List<ClientDocument> findUploadedSince(@Param("since") LocalDateTime since);

    @Query("SELECT d FROM ClientDocument d WHERE " +
           "(:status IS NULL OR d.status = :status) AND " +
           "(:documentType IS NULL OR d.documentType = :documentType) AND " +
           "(:dateFrom IS NULL OR d.uploadedAt >= :dateFrom) AND " +
           "(:dateTo IS NULL OR d.uploadedAt <= :dateTo) " +
           "ORDER BY d.uploadedAt DESC")
    List<ClientDocument> findFiltered(
        @Param("status") String status,
        @Param("documentType") String documentType,
        @Param("dateFrom") LocalDateTime dateFrom,
        @Param("dateTo") LocalDateTime dateTo
    );

    @Query("SELECT AVG(d.confidenceScore) FROM ClientDocument d WHERE d.confidenceScore > 0")
    Double avgConfidenceScore();
}
