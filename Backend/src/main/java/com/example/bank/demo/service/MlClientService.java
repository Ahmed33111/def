package com.example.bank.demo.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.*;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class MlClientService {

    private static final Logger logger = LoggerFactory.getLogger(MlClientService.class);
    private static final String ML_SERVICE_URL = "http://localhost:8000/classify";

    @Autowired
    private RestTemplate restTemplate;

    public static class ClassificationResult {
        public String type;
        public int confidence;
        public List<String> matchedKeywords;

        public ClassificationResult(String type, int confidence, List<String> matchedKeywords) {
            this.type = type;
            this.confidence = confidence;
            this.matchedKeywords = matchedKeywords;
        }
    }

    // Java fallback keyword map (mirrors the Python classifier)
    private static final Map<String, Map<String, Integer>> FALLBACK_CATEGORIES = new LinkedHashMap<>();
    static {
        Map<String, Integer> cin = new LinkedHashMap<>();
        cin.put("cin", 25); cin.put("carte identite", 25); cin.put("carte d'identite", 25);
        cin.put("carte nationale", 25); cin.put("identite nationale", 25); cin.put("numero cin", 20);
        cin.put("republique tunisienne", 20); cin.put("date naissance", 15); cin.put("lieu naissance", 15);
        cin.put("nationalite", 15); cin.put("tunisie", 10); cin.put("carte identité", 20); cin.put("identité", 15);
        cin.put("identity card", 25); cin.put("national id", 25); cin.put("id card", 20);
        cin.put("cin_recto", 30); cin.put("cin_verso", 30); cin.put("cin-recto", 30); cin.put("cin-verso", 30);
        cin.put("carte_identite", 30); cin.put("carte-identite", 30); cin.put("id_card", 25);
        FALLBACK_CATEGORIES.put("CIN", cin);

        Map<String, Integer> passport = new LinkedHashMap<>();
        passport.put("passeport", 30); passport.put("passeport tunisien", 30);
        passport.put("passport", 30); passport.put("travel document", 25);
        passport.put("mrz", 20); passport.put("p<tun", 25); passport.put("biometric", 10);
        passport.put("passeport_scan", 30); passport.put("passport_scan", 30);
        FALLBACK_CATEGORIES.put("PASSPORT", passport);

        Map<String, Integer> address = new LinkedHashMap<>();
        address.put("facture", 25); address.put("adresse", 20); address.put("domicile", 25);
        address.put("steg", 25); address.put("sonede", 25); address.put("electricite", 20);
        address.put("loyer", 20); address.put("quittance", 25); address.put("attestation domicile", 30);
        address.put("attestation de domicile", 30); address.put("commune", 15);
        address.put("justificatif domicile", 30); address.put("justificatif d'adresse", 30);
        address.put("proof of address", 30); address.put("utility bill", 25);
        FALLBACK_CATEGORIES.put("PROOF_OF_ADDRESS", address);

        Map<String, Integer> deposit = new LinkedHashMap<>();
        deposit.put("justificatif depot", 25); deposit.put("preuve depot", 25);
        deposit.put("justificatif de dépôt", 25); deposit.put("reçu", 15); deposit.put("recu", 15);
        deposit.put("bordereau", 20); deposit.put("versement", 20); deposit.put("dépôt", 15);
        deposit.put("depot", 15); deposit.put("cheque", 15); deposit.put("virement recu", 20);
        deposit.put("deposit proof", 25); deposit.put("deposit receipt", 25);
        FALLBACK_CATEGORIES.put("DEPOSIT_PROOF", deposit);

        Map<String, Integer> account = new LinkedHashMap<>();
        account.put("gestion compte", 25); account.put("relevé de compte", 25);
        account.put("releve de compte", 25); account.put("relevé bancaire", 25);
        account.put("attestation bancaire", 25); account.put("extrait de compte", 20);
        account.put("ouverture compte", 25); account.put("fermeture compte", 25);
        account.put("account statement", 25); account.put("bank statement", 25);
        account.put("account management", 25); account.put("releve", 20);
        account.put("attestation_bancaire", 25); account.put("gestion_compte", 25);
        FALLBACK_CATEGORIES.put("ACCOUNT_MANAGEMENT", account);

        Map<String, Integer> credit = new LinkedHashMap<>();
        credit.put("demande credit", 25); credit.put("demande de crédit", 25);
        credit.put("crédit", 15); credit.put("credit", 15); credit.put("pret", 15);
        credit.put("prêt", 15); credit.put("financement", 15); credit.put("dossier credit", 25);
        credit.put("offre de prêt", 25); credit.put("credit request", 25);
        credit.put("loan application", 25); credit.put("demande_credit", 25);
        FALLBACK_CATEGORIES.put("CREDIT_REQUEST", credit);
    }

    // Mapping from user-selected docType to classification type
    private static final Map<String, String> DOCTYPE_TO_TYPE = Map.of(
        "KYC", "KYC",
        "DEPOSIT_PROOF", "DEPOSIT_PROOF",
        "ACCOUNT_MANAGEMENT", "ACCOUNT_MANAGEMENT",
        "CREDIT_REQUEST", "CREDIT_REQUEST"
    );

    /**
     * Classify a document using ML service with fallback.
     * @param filename The original filename
     * @param content Additional text content (description, docType, etc.)
     * @param userDocType The user-selected document type (used as fallback hint)
     */
    public ClassificationResult classifyDocument(String filename, String content, String userDocType) {
        ClassificationResult mlResult = null;

        // Step 1: Try ML service
        try {
            Map<String, String> requestBody = Map.of(
                "filename", filename != null ? filename : "",
                "content", content != null ? content : ""
            );

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, String>> entity = new HttpEntity<>(requestBody, headers);

            ResponseEntity<Map> response = restTemplate.exchange(
                ML_SERVICE_URL, HttpMethod.POST, entity, Map.class
            );

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Map<String, Object> body = response.getBody();
                String type = (String) body.getOrDefault("type", "OTHER");
                int confidence = body.get("confidence") instanceof Integer
                    ? (Integer) body.get("confidence")
                    : ((Number) body.getOrDefault("confidence", 0)).intValue();
                List<String> keywords = (List<String>) body.getOrDefault("matched_keywords", List.of());
                logger.info("ML service result: type={}, confidence={}", type, confidence);
                mlResult = new ClassificationResult(type, confidence, keywords);
            }
        } catch (Exception e) {
            logger.warn("ML service unavailable: {}", e.getMessage());
        }

        // Step 2: Always run fallback classifier
        ClassificationResult fallbackResult = fallbackClassify(filename, content);
        logger.info("Fallback result: type={}, confidence={}", fallbackResult.type, fallbackResult.confidence);

        // Step 3: Pick the best result
        ClassificationResult best;
        if (mlResult != null && !"OTHER".equals(mlResult.type) && mlResult.confidence >= 40) {
            // ML found something with decent confidence - use it
            best = mlResult;
        } else if (!"OTHER".equals(fallbackResult.type) && fallbackResult.confidence > 0) {
            // Fallback found something - use it
            best = fallbackResult;
        } else if (mlResult != null && !"OTHER".equals(mlResult.type)) {
            // ML found something but low confidence - still use it over fallback
            best = mlResult;
        } else {
            best = new ClassificationResult("OTHER", 0, List.of());
        }

        // Step 4: If still OTHER, use user's docType as a hint
        if ("OTHER".equals(best.type) && userDocType != null && !userDocType.isBlank()) {
            String hintedType = DOCTYPE_TO_TYPE.getOrDefault(userDocType, userDocType);
            logger.info("Using user docType '{}' as classification hint → {}", userDocType, hintedType);
            best = new ClassificationResult(hintedType, 60, List.of("user_selected:" + userDocType));
        }

        logger.info("Final classification: type={}, confidence={}, keywords={}", best.type, best.confidence, best.matchedKeywords);
        return best;
    }

    /**
     * Overload for backward compatibility (no docType hint).
     */
    public ClassificationResult classifyDocument(String filename, String content) {
        return classifyDocument(filename, content, null);
    }

    private ClassificationResult fallbackClassify(String filename, String content) {
        String text = ((filename != null ? filename : "") + " " + (content != null ? content : "")).toLowerCase();
        // Clean filename for better matching
        String cleanFilename = filename != null
            ? filename.toLowerCase().replaceAll("\\.(pdf|jpg|jpeg|png|doc|docx)$", "")
                .replace('-', ' ').replace('_', ' ').replace('.', ' ')
            : "";
        text = cleanFilename + " " + text;

        Map<String, Integer> scores = new LinkedHashMap<>();
        Map<String, List<String>> allMatched = new LinkedHashMap<>();

        for (Map.Entry<String, Map<String, Integer>> cat : FALLBACK_CATEGORIES.entrySet()) {
            int score = 0;
            List<String> matched = new ArrayList<>();
            for (Map.Entry<String, Integer> kw : cat.getValue().entrySet()) {
                if (text.contains(kw.getKey())) {
                    score += kw.getValue();
                    matched.add(kw.getKey());
                }
            }
            scores.put(cat.getKey(), score);
            allMatched.put(cat.getKey(), matched);
        }

        int maxScore = scores.values().stream().mapToInt(Integer::intValue).max().orElse(0);
        if (maxScore == 0) {
            return new ClassificationResult("OTHER", 0, List.of());
        }

        String best = scores.entrySet().stream()
            .max(Map.Entry.comparingByValue())
            .map(Map.Entry::getKey)
            .orElse("OTHER");

        int rawScore = scores.get(best);
        int confidence;
        if (rawScore >= 50) confidence = Math.min(70 + (rawScore - 50), 98);
        else if (rawScore >= 30) confidence = 50 + (int)((rawScore - 30) * 1.0);
        else if (rawScore >= 15) confidence = 30 + (int)((rawScore - 15) * 1.3);
        else confidence = Math.min(rawScore * 2, 29);

        confidence = Math.min(confidence, 98);
        List<String> matchedKeywords = allMatched.getOrDefault(best, List.of());

        return new ClassificationResult(best, confidence, matchedKeywords);
    }
}
