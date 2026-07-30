INSERT INTO expense_category (name, color)
SELECT 'Alimentation', '#FF6384'
WHERE NOT EXISTS (SELECT 1 FROM expense_category WHERE name = 'Alimentation');

-- Schema changes (column sizes, new columns) are handled by spring.jpa.hibernate.ddl-auto=update
-- based on JPA entity @Column annotations. No manual ALTER TABLE needed here.

INSERT INTO expense_category (name, color)
SELECT 'Transport', '#36A2EB'
WHERE NOT EXISTS (SELECT 1 FROM expense_category WHERE name = 'Transport');

INSERT INTO expense_category (name, color)
SELECT 'Logement', '#FFCE56'
WHERE NOT EXISTS (SELECT 1 FROM expense_category WHERE name = 'Logement');

INSERT INTO expense_category (name, color)
SELECT 'Loisirs', '#4BC0C0'
WHERE NOT EXISTS (SELECT 1 FROM expense_category WHERE name = 'Loisirs');

INSERT INTO expense_category (name, color)
SELECT 'Sante', '#9966FF'
WHERE NOT EXISTS (SELECT 1 FROM expense_category WHERE name = 'Sante');

INSERT INTO expense_category (name, color)
SELECT 'Autres', '#FF9F40'
WHERE NOT EXISTS (SELECT 1 FROM expense_category WHERE name = 'Autres');
