UPDATE users
SET password_hash = '$2b$12$QLgfy6jWbfKEtUSM/zqQcOZ7E7UPHN7pCqYo.9v907A/iXgZzy8Yu',
    role = 'admin',
    updated_at = NOW()
WHERE username = 'admin';

INSERT INTO users (username, email, password_hash, display_name, role)
SELECT 'admin', 'admin@phoenix.local', '$2b$12$QLgfy6jWbfKEtUSM/zqQcOZ7E7UPHN7pCqYo.9v907A/iXgZzy8Yu', 'Phoenix Admin', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');
