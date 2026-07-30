package com.example.bank.demo.service;

import org.springframework.stereotype.Service;
import java.text.Normalizer;
import java.util.Arrays;
import java.util.List;

@Service
public class NameMatchingService {
    
    public boolean areNamesMatching(String inputName, String actualName) {
        if (inputName == null || actualName == null) {
            return false;
        }

        // Normaliser les noms (enlever accents, mettre en minuscules)
        String normalizedInput = normalizeName(inputName);
        String normalizedActual = normalizeName(actualName);

        // Diviser les noms en parties
        List<String> inputParts = Arrays.asList(normalizedInput.split("\\s+"));
        List<String> actualParts = Arrays.asList(normalizedActual.split("\\s+"));

        // Si le nombre de parties est différent, vérifier si l'une est incluse dans l'autre
        if (inputParts.size() != actualParts.size()) {
            return containsAllWords(normalizedInput, normalizedActual) || 
                   containsAllWords(normalizedActual, normalizedInput);
        }

        // Vérifier toutes les permutations possibles
        return checkAllPermutations(inputParts, actualParts);
    }

    private String normalizeName(String name) {
        // Convertir en minuscules et supprimer les accents
        String normalized = Normalizer.normalize(name.toLowerCase(), Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "")
            .replaceAll("[^a-z\\s]", "")
            .trim();

        // Remplacer les caractères similaires
        normalized = normalized.replace('y', 'i')
                             .replace('w', 'v');

        return normalized;
    }

    private boolean containsAllWords(String text1, String text2) {
        List<String> words1 = Arrays.asList(text1.split("\\s+"));
        List<String> words2 = Arrays.asList(text2.split("\\s+"));

        return words1.stream()
                    .allMatch(word1 -> words2.stream()
                                            .anyMatch(word2 -> areSimilarWords(word1, word2)));
    }

    private boolean areSimilarWords(String word1, String word2) {
        if (word1.equals(word2)) return true;

        // Calcul de la distance de Levenshtein
        int distance = calculateLevenshteinDistance(word1, word2);
        int maxLength = Math.max(word1.length(), word2.length());
        
        // Tolérance plus élevée pour les noms plus longs
        return distance <= Math.max(1, maxLength / 4);
    }

    private boolean checkAllPermutations(List<String> list1, List<String> list2) {
        return list1.stream().allMatch(word1 -> 
            list2.stream().anyMatch(word2 -> areSimilarWords(word1, word2)));
    }

    private int calculateLevenshteinDistance(String word1, String word2) {
        int[][] dp = new int[word1.length() + 1][word2.length() + 1];

        for (int i = 0; i <= word1.length(); i++) {
            for (int j = 0; j <= word2.length(); j++) {
                if (i == 0) {
                    dp[i][j] = j;
                } else if (j == 0) {
                    dp[i][j] = i;
                } else {
                    dp[i][j] = Math.min(
                        Math.min(
                            dp[i - 1][j] + 1,
                            dp[i][j - 1] + 1
                        ),
                        dp[i - 1][j - 1] + (word1.charAt(i - 1) == word2.charAt(j - 1) ? 0 : 1)
                    );
                }
            }
        }

        return dp[word1.length()][word2.length()];
    }
} 