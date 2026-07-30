from typing import Dict, List, Tuple
import re


class DocumentClassifier:
    """Weighted keyword-based document classifier with filename heuristics."""

    CATEGORIES: Dict[str, Dict[str, int]] = {
        "CIN": {
            # French
            "cin": 25, "carte identite": 25, "carte d'identite": 25,
            "carte nationale": 25, "identite nationale": 25,
            "numero cin": 20, "republique tunisienne": 20,
            "date naissance": 15, "lieu naissance": 15, "nationalite": 15,
            "tunisie": 10, "carte identité": 20, "identité": 15,
            # English
            "identity card": 25, "national id": 25, "id card": 20,
            "national identity": 20, "cni": 20,
            # Filename patterns
            "cin_recto": 30, "cin_verso": 30, "cin-recto": 30, "cin-verso": 30,
            "carte_identite": 30, "carte-identite": 30, "id_card": 25,
            "identity_card": 25, "carteidentite": 25,
        },
        "PASSPORT": {
            # French
            "passeport": 30, "passeport tunisien": 30,
            # English
            "passport": 30, "travel document": 25,
            "mrz": 20, "p<tun": 25, "issuing authority": 15,
            "date expiry": 10, "nationality": 10, "given names": 10,
            "surname": 10, "visa": 10, "biometric": 10,
            # Filename patterns
            "passeport": 30, "passport": 30, "passeport_scan": 30,
            "passport_scan": 30, "travel_doc": 25,
        },
        "PROOF_OF_ADDRESS": {
            # French
            "facture": 25, "adresse": 20, "domicile": 25, "residence": 20,
            "steg": 25, "sonede": 25, "electricite": 20, "eau": 10,
            "telephone fixe": 15, "internet": 10, "loyer": 20,
            "quittance": 25, "attestation domicile": 30, "attestation de domicile": 30,
            "commune": 15, "municipalite": 15, "mairie": 15,
            "justificatif domicile": 30, "justificatif d'adresse": 30,
            # English
            "proof of address": 30, "utility bill": 25,
            "address proof": 25,
            # Filename patterns
            "facture": 25, "quittance": 25, "attestation_domicile": 30,
            "proof_address": 30, "justificatif": 20,
        },
        "DEPOSIT_PROOF": {
            # French
            "justificatif depot": 25, "preuve depot": 25, "justificatif de dépôt": 25,
            "reçu": 15, "recu": 15, "bordereau": 20, "versement": 20,
            "dépôt": 15, "depot": 15, "cheque": 15, "virement recu": 20,
            # English
            "deposit proof": 25, "deposit receipt": 25,
            # Filename patterns
            "depot": 20, "deposit": 20, "recu": 20, "versement": 20,
        },
        "ACCOUNT_MANAGEMENT": {
            # French
            "gestion compte": 25, "relevé de compte": 25, "releve de compte": 25,
            "relevé bancaire": 25, "attestation bancaire": 25,
            "extrait de compte": 20, "ouverture compte": 25,
            "fermeture compte": 25, "modification compte": 20,
            "procuration": 20, "mandat": 15,
            # English
            "account statement": 25, "bank statement": 25,
            "account management": 25,
            # Filename patterns
            "releve": 20, "attestation_bancaire": 25, "gestion_compte": 25,
            "bank_statement": 25,
        },
        "CREDIT_REQUEST": {
            # French
            "demande credit": 25, "demande de crédit": 25, "demande de credit": 25,
            "crédit": 15, "credit": 15, "pret": 15, "prêt": 15,
            "financement": 15, "dossier credit": 25, "simulation credit": 20,
            "offre de prêt": 25, "tableau amortissement": 20,
            # English
            "credit request": 25, "loan application": 25, "credit application": 25,
            # Filename patterns
            "demande_credit": 25, "credit_request": 25, "pret": 20,
            "loan": 20, "financement": 20,
        },
        "OTHER": {},
    }

    # Filename extension scoring boost
    FILENAME_PATTERNS: Dict[str, List[str]] = {
        "CIN": ["cin", "id_card", "identity", "carte_identite", "carte-identite", "cni"],
        "PASSPORT": ["passport", "passeport", "travel"],
        "PROOF_OF_ADDRESS": ["facture", "steg", "sonede", "quittance", "domicile", "address", "justificatif"],
        "DEPOSIT_PROOF": ["depot", "deposit", "recu", "bordereau", "versement"],
        "ACCOUNT_MANAGEMENT": ["releve", "statement", "attestation", "gestion"],
        "CREDIT_REQUEST": ["credit", "pret", "loan", "demande"],
    }

    def classify(self, filename: str, text_content: str) -> Dict:
        # Normalize text
        text = ((filename or "") + " " + (text_content or "")).lower()
        # Remove common extensions for cleaner matching
        clean_filename = re.sub(r'\.(pdf|jpg|jpeg|png|doc|docx)$', '', (filename or "").lower())
        # Replace separators with spaces for better matching
        clean_filename = clean_filename.replace('-', ' ').replace('_', ' ').replace('.', ' ')
        text = clean_filename + " " + text

        scores: Dict[str, int] = {}
        all_matched: Dict[str, List[str]] = {}

        for category, keywords in self.CATEGORIES.items():
            if category == "OTHER":
                continue
            score = 0
            matched = []
            for keyword, weight in keywords.items():
                if keyword.lower() in text:
                    score += weight
                    matched.append(keyword)
            scores[category] = score
            all_matched[category] = matched

        # Find best category
        if not scores or max(scores.values()) == 0:
            return {
                "type": "OTHER",
                "confidence": 0,
                "matched_keywords": [],
            }

        best = max(scores, key=lambda k: scores[k])
        
        # Calculate confidence based on score weight (not percentage of total)
        # More intuitive: higher score = higher confidence
        raw_score = scores[best]
        if raw_score >= 50:
            confidence = min(70 + (raw_score - 50), 98)
        elif raw_score >= 30:
            confidence = 50 + int((raw_score - 30) * 1.0)
        elif raw_score >= 15:
            confidence = 30 + int((raw_score - 15) * 1.3)
        else:
            confidence = min(raw_score * 2, 29)

        confidence = min(confidence, 98)

        matched_keywords = all_matched.get(best, [])

        return {
            "type": best,
            "confidence": confidence,
            "matched_keywords": matched_keywords,
        }
