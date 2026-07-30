package com.example.bank.demo.controller;

import com.example.bank.demo.model.ClientDocument;
import com.example.bank.demo.model.User;
import com.example.bank.demo.repository.ClientDocumentRepository;
import com.example.bank.demo.service.MlClientService;
import com.example.bank.demo.service.UserService;
import com.example.bank.demo.exception.ForbiddenException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.http.HttpHeaders;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;

@RestController
@CrossOrigin(origins = {"http://localhost:3000","http://localhost:3001","http://localhost:5173"}, allowCredentials = "true")
public class DocumentController {

    private static final Logger logger = LoggerFactory.getLogger(DocumentController.class);

    @Autowired private ClientDocumentRepository documentRepository;
    @Autowired private UserService userService;
    @Autowired private MlClientService mlClientService;

    @Value("${app.upload.dir:uploads/documents}")
    private String uploadDir;

    private String extractUsername(String authHeader) {
        User authenticatedUser = userService.validateUser(authHeader);
        return authenticatedUser.getUsername();
    }

    // Validate that the user is staff (cashier, admin, or director)
    private User validateStaff(String authHeader) {
        User user = userService.validateUser(authHeader);
        if (!userService.isCashier(user.getUsername()) && !userService.isAdmin(user.getUsername()) && !userService.isDirector(user.getUsername())) {
            throw new ForbiddenException("Accès refusé : rôle staff requis (caissier, administrateur ou directeur)");
        }
        return user;
    }

    // ==================== CLIENT ENDPOINTS ====================

    @PostMapping("/api/documents/upload")
    public ResponseEntity<?> uploadDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam("docType") String docType,
            @RequestParam(value = "description", required = false) String description,
            @RequestHeader("Authorization") String authHeader) {
        try {
            String username = extractUsername(authHeader);
            User user = userService.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

            if (file.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "Fichier vide"));

            String originalFilename = file.getOriginalFilename();
            String ext = originalFilename != null && originalFilename.contains(".")
                ? originalFilename.substring(originalFilename.lastIndexOf('.') + 1).toLowerCase() : "";
            List<String> allowed = List.of("pdf", "jpg", "jpeg", "png");
            if (!allowed.contains(ext))
                return ResponseEntity.badRequest().body(Map.of("error", "Format non autorisé. Formats: PDF, JPG, PNG"));

            List<String> validTypes = List.of("KYC","DEPOSIT_PROOF","ACCOUNT_MANAGEMENT","CREDIT_REQUEST");
            if (!validTypes.contains(docType))
                return ResponseEntity.badRequest().body(Map.of("error", "Type de document invalide"));

            Path uploadPath = Paths.get(uploadDir, String.valueOf(user.getId()), docType);
            Files.createDirectories(uploadPath);
            String uniqueName = UUID.randomUUID() + "." + ext;
            Path filePath = uploadPath.resolve(uniqueName);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            // ML classification - pass filename, user description + docType as content
            String mlContent = docType + " " + (description != null ? description : "");
            MlClientService.ClassificationResult classification = mlClientService.classifyDocument(originalFilename, mlContent, docType);

            // Save document record
            ClientDocument doc = new ClientDocument();
            doc.setUser(user);
            doc.setDocumentType(docType);
            doc.setFileName(originalFilename);
            doc.setStoragePath(filePath.toString());
            doc.setMimeType(file.getContentType());
            doc.setFileSize(file.getSize());
            doc.setStatus("PENDING");
            doc.setDetectedType(classification.type);
            doc.setConfidenceScore(classification.confidence);
            doc.setUploadedAt(LocalDateTime.now());
            ClientDocument saved = documentRepository.save(doc);

            Map<String, Object> result = new HashMap<>();
            result.put("message", "Document téléversé avec succès");
            result.put("documentId", saved.getId());
            result.put("fileName", originalFilename);
            result.put("docType", docType);
            result.put("size", file.getSize());
            Map<String, Object> classif = new HashMap<>();
            classif.put("type", classification.type);
            classif.put("confidence", classification.confidence);
            classif.put("matchedKeywords", classification.matchedKeywords);
            result.put("classification", classif);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            logger.error("Upload error:", e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/api/documents/my")
    public ResponseEntity<?> getMyDocuments(@RequestHeader("Authorization") String authHeader) {
        try {
            String username = extractUsername(authHeader);
            User user = userService.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
            List<ClientDocument> docs = documentRepository.findByUserIdOrderByUploadedAtDesc(user.getId());
            return ResponseEntity.ok(docs.stream().map(this::toDto).collect(Collectors.toList()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/api/documents/{id}/accept-classification")
    public ResponseEntity<?> acceptClassification(
            @PathVariable Long id,
            @RequestHeader("Authorization") String authHeader) {
        try {
            ClientDocument doc = documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Document not found"));
            if (doc.getDetectedType() != null) {
                doc.setDocumentType(doc.getDetectedType());
                documentRepository.save(doc);
            }
            return ResponseEntity.ok(toDto(doc));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/api/documents/{id}/change-type")
    public ResponseEntity<?> changeDocumentType(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @RequestHeader("Authorization") String authHeader) {
        try {
            ClientDocument doc = documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Document not found"));
            String newType = body.get("documentType");
            if (newType != null && !newType.isBlank()) {
                doc.setDocumentType(newType);
                documentRepository.save(doc);
            }
            return ResponseEntity.ok(toDto(doc));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ==================== CASHIER ENDPOINTS ====================

    @GetMapping("/api/cashier/documents/pending")
    public ResponseEntity<?> getPendingDocuments(@RequestHeader("Authorization") String authHeader) {
        try {
            validateStaff(authHeader);
            List<ClientDocument> docs = documentRepository.findByStatusOrderByUploadedAtDesc("PENDING");
            return ResponseEntity.ok(docs.stream().map(this::toDto).collect(Collectors.toList()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/api/cashier/documents/stats")
    public ResponseEntity<?> getDocumentStats(@RequestHeader("Authorization") String authHeader) {
        try {
            validateStaff(authHeader);

            long total = documentRepository.count();
            long pending = documentRepository.countByStatus("PENDING");
            long approved = documentRepository.countByStatus("APPROVED");
            long rejected = documentRepository.countByStatus("REJECTED");

            LocalDateTime todayStart = LocalDateTime.now().toLocalDate().atStartOfDay();
            long todayUploads = documentRepository.findUploadedSince(todayStart).size();

            Double avgConf = documentRepository.avgConfidenceScore();

            Map<String, Object> stats = new HashMap<>();
            stats.put("totalDocuments", total);
            stats.put("pendingCount", pending);
            stats.put("approvedCount", approved);
            stats.put("rejectedCount", rejected);
            stats.put("todayUploads", todayUploads);
            stats.put("averageConfidence", avgConf != null ? Math.round(avgConf) : 0);
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/api/cashier/documents/{id}/approve")
    public ResponseEntity<?> approveDocument(
            @PathVariable Long id,
            @RequestHeader("Authorization") String authHeader) {
        try {
            String username = validateStaff(authHeader).getUsername();
            ClientDocument doc = documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Document not found"));
            doc.setStatus("APPROVED");
            doc.setReviewedAt(LocalDateTime.now());
            doc.setReviewedBy(username);
            doc.setRejectionReason(null);
            ClientDocument saved = documentRepository.save(doc);
            return ResponseEntity.ok(toDto(saved));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/api/cashier/documents/{id}/reject")
    public ResponseEntity<?> rejectDocument(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @RequestHeader("Authorization") String authHeader) {
        try {
            String username = validateStaff(authHeader).getUsername();
            ClientDocument doc = documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Document not found"));
            doc.setStatus("REJECTED");
            doc.setReviewedAt(LocalDateTime.now());
            doc.setReviewedBy(username);
            doc.setRejectionReason(body.getOrDefault("reason", "Non spécifié"));
            ClientDocument saved = documentRepository.save(doc);
            return ResponseEntity.ok(toDto(saved));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/api/cashier/documents/filter")
    public ResponseEntity<?> filterDocuments(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String documentType,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            @RequestHeader("Authorization") String authHeader) {
        try {
            validateStaff(authHeader);

            String s = (status != null && !status.isBlank()) ? status : null;
            String dt = (documentType != null && !documentType.isBlank()) ? documentType : null;
            LocalDateTime from = (dateFrom != null && !dateFrom.isBlank()) ? LocalDateTime.parse(dateFrom + "T00:00:00") : null;
            LocalDateTime to = (dateTo != null && !dateTo.isBlank()) ? LocalDateTime.parse(dateTo + "T23:59:59") : null;

            List<ClientDocument> docs = documentRepository.findFiltered(s, dt, from, to);
            return ResponseEntity.ok(docs.stream().map(this::toDto).collect(Collectors.toList()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ==================== FILE PREVIEW/DOWNLOAD ====================

    @DeleteMapping("/api/documents/{id}")
    public ResponseEntity<?> deleteDocument(
            @PathVariable Long id,
            @RequestHeader("Authorization") String authHeader) {
        try {
            String username = extractUsername(authHeader);
            User user = userService.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

            ClientDocument doc = documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Document not found"));

            // Only the owner can delete their own documents
            if (!doc.getUser().getId().equals(user.getId())) {
                return ResponseEntity.status(403).body(Map.of("error", "Vous ne pouvez pas supprimer ce document"));
            }

            // Delete the physical file
            try {
                Path filePath = Paths.get(doc.getStoragePath());
                Files.deleteIfExists(filePath);
            } catch (Exception e) {
                logger.warn("Could not delete physical file: {}", e.getMessage());
            }

            // Delete the database record
            documentRepository.delete(doc);

            return ResponseEntity.ok(Map.of("message", "Document supprimé avec succès"));
        } catch (Exception e) {
            logger.error("Delete document error:", e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ==================== FILE PREVIEW/DOWNLOAD ====================

    @GetMapping("/api/documents/{id}/file")
    public ResponseEntity<Resource> downloadDocument(
            @PathVariable Long id,
            @RequestHeader("Authorization") String authHeader) {
        try {
            String username = extractUsername(authHeader);
            User user = userService.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

            ClientDocument doc = documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Document not found"));

            // Check access: owner, cashier, admin, or director
            boolean isOwner = doc.getUser().getId().equals(user.getId());
            boolean isStaff = userService.isCashier(username) || userService.isAdmin(username) || userService.isDirector(username);
            if (!isOwner && !isStaff) {
                return ResponseEntity.status(403).build();
            }

            Path filePath = Paths.get(doc.getStoragePath());
            if (!Files.exists(filePath)) {
                return ResponseEntity.notFound().build();
            }

            Resource resource = new UrlResource(filePath.toUri());
            String contentType = doc.getMimeType() != null ? doc.getMimeType() : "application/octet-stream";

            return ResponseEntity.ok()
                .contentType(org.springframework.http.MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + doc.getFileName() + "\"")
                .body(resource);
        } catch (Exception e) {
            logger.error("File download error:", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    // ==================== DTO MAPPER ====================

    private Map<String, Object> toDto(ClientDocument doc) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("documentId", doc.getId());
        dto.put("documentType", doc.getDocumentType());
        dto.put("fileName", doc.getFileName());
        dto.put("fileSize", doc.getFileSize());
        dto.put("mimeType", doc.getMimeType());
        dto.put("status", doc.getStatus());
        dto.put("confidenceScore", doc.getConfidenceScore());
        dto.put("detectedType", doc.getDetectedType());
        dto.put("uploadedAt", doc.getUploadedAt());
        dto.put("reviewedAt", doc.getReviewedAt());
        dto.put("rejectionReason", doc.getRejectionReason());
        dto.put("reviewedBy", doc.getReviewedBy());
        if (doc.getUser() != null) {
            dto.put("clientName", doc.getUser().getFullName());
            dto.put("clientEmail", doc.getUser().getEmail());
            dto.put("clientPhone", doc.getUser().getPhone());
            dto.put("clientId", doc.getUser().getId());
        }
        return dto;
    }
}
