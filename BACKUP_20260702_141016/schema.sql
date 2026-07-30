-- Création de la table agencies
CREATE TABLE IF NOT EXISTS agencies (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    address VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(100),
    director_id BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Création de la table users
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    full_name VARCHAR(100),
    role VARCHAR(20),
    address VARCHAR(255),
    phone VARCHAR(20),
    agency_id BIGINT,
    FOREIGN KEY (agency_id) REFERENCES agencies(id)
);

-- Création de la table account
CREATE TABLE IF NOT EXISTS account (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    account_number VARCHAR(50) UNIQUE NOT NULL,
    balance DOUBLE NOT NULL,
    user_id BIGINT,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Création de la table expense_category
CREATE TABLE IF NOT EXISTS expense_category (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(20)
);

-- Création de la table transactions
CREATE TABLE IF NOT EXISTS transactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    amount DOUBLE NOT NULL,
    type VARCHAR(10) NOT NULL,
    description VARCHAR(255),
    date TIMESTAMP,
    status VARCHAR(20) DEFAULT 'SUCCESS',
    account_id BIGINT,
    from_account VARCHAR(50),
    to_account VARCHAR(50),
    category_id BIGINT,
    FOREIGN KEY (account_id) REFERENCES account(id),
    FOREIGN KEY (category_id) REFERENCES expense_category(id)
);

-- Création de la table virement_programme
CREATE TABLE IF NOT EXISTS virement_programme (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    compte_source_id BIGINT,
    numero_compte_destination VARCHAR(50) NOT NULL,
    beneficiaire_name VARCHAR(100),
    montant DOUBLE NOT NULL,
    date_execution TIMESTAMP,
    executed BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'EN_ATTENTE',
    refus_reason VARCHAR(255),
    FOREIGN KEY (compte_source_id) REFERENCES account(id)
);

-- Création de la table bank_cards
CREATE TABLE IF NOT EXISTS bank_cards (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    card_number VARCHAR(255) UNIQUE NOT NULL,
    card_type VARCHAR(20) NOT NULL,
    account_id BIGINT,
    expiration_date DATE NOT NULL,
    cvv VARCHAR(255) NOT NULL,
    blocked BOOLEAN DEFAULT FALSE,
    contactless_enabled BOOLEAN DEFAULT TRUE,
    online_payment_enabled BOOLEAN DEFAULT TRUE,
    international_enabled BOOLEAN DEFAULT FALSE,
    daily_withdrawal_limit DOUBLE DEFAULT 1000.00,
    daily_payment_limit DOUBLE DEFAULT 5000.00,
    card_sub_type VARCHAR(30) DEFAULT 'STANDARD',
    prepaid_balance DOUBLE DEFAULT 0.00,
    FOREIGN KEY (account_id) REFERENCES account(id)
);

-- Création de la table cashier_logs
CREATE TABLE IF NOT EXISTS cashier_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    description VARCHAR(255) NOT NULL,
    date TIMESTAMP NOT NULL,
    amount DOUBLE,
    account_number VARCHAR(50),
    user_name VARCHAR(100),
    status VARCHAR(20) NOT NULL,
    details TEXT,
    cashier_id BIGINT,
    FOREIGN KEY (cashier_id) REFERENCES users(id)
);

-- Création de la table client_documents
CREATE TABLE IF NOT EXISTS client_documents (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    mime_type VARCHAR(20),
    file_size BIGINT,
    status VARCHAR(20) DEFAULT 'PENDING',
    detected_type VARCHAR(50),
    confidence_score INT DEFAULT 0,
    uploaded_at DATETIME,
    reviewed_at DATETIME,
    reviewed_by VARCHAR(100),
    rejection_reason VARCHAR(500),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
