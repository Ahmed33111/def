-- Script pour nettoyer les doublons de cartes bancaires
-- Exécuter CE SCRIPT dans MySQL Workbench/phpMyAdmin

-- 1. Identifier les doublons
SELECT card_number, COUNT(*) as count 
FROM bank_cards 
GROUP BY card_number 
HAVING count > 1;

-- 2. Supprimer les doublons (garder le plus ancien)
DELETE FROM bank_cards 
WHERE id NOT IN (
    SELECT MIN(id) 
    FROM (SELECT id, card_number FROM bank_cards) AS temp 
    GROUP BY card_number
);

-- 3. Ajouter la contrainte UNIQUE si elle n'existe pas
ALTER TABLE bank_cards 
ADD CONSTRAINT uk_card_number UNIQUE (card_number);

-- 4. Vérifier
SELECT COUNT(*) as total_cards FROM bank_cards;
