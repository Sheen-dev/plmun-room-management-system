<?php
/**
 * PLMun Room Management System database setup.
 *
 * This script:
 * - Checks or creates the email columns.
 * - Sets existing emails to "Sample".
 * - Sets student courses to BSIT.
 * - Creates administrator accounts if they do not exist.
 *
 * Existing administrator passwords are preserved.
 */

require_once __DIR__ . "/db.php";

header("Content-Type: text/plain; charset=UTF-8");

try {
    /* =========================================
       EMAIL COLUMNS
    ========================================= */

    foreach (["students", "professors"] as $table) {
        $column = $pdo->query(
            "SHOW COLUMNS FROM `$table` LIKE 'email'"
        )->fetch();

        if (!$column) {
            $pdo->exec("
                ALTER TABLE `$table`
                ADD COLUMN email VARCHAR(190) NOT NULL DEFAULT 'Sample'
            ");
        }
    }

    /* =========================================
       UPDATE EXISTING USER EMAIL VALUES
    ========================================= */

    $pdo->exec("
        UPDATE students
        SET email = 'Sample'
    ");

    $pdo->exec("
        UPDATE professors
        SET email = 'Sample'
    ");

    /* =========================================
       STUDENT COURSE
    ========================================= */

    $pdo->exec("
        UPDATE students
        SET course = 'BSIT'
    ");

    /* =========================================
       CREATE ADMINISTRATOR TABLE
    ========================================= */

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS admin_accounts (
            id INT UNSIGNED NOT NULL AUTO_INCREMENT,
            admin_id VARCHAR(30) NOT NULL,
            full_name VARCHAR(150) NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_admin_accounts_admin_id (admin_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    /* =========================================
       SAMPLE ADMINISTRATOR ACCOUNTS
    ========================================= */

    $adminAccounts = [
        [
            "ADMIN-001",
            "System Administrator",
            "Admin@123"
        ],
        [
            "ADMIN-002",
            "Assistant Administrator",
            "Staff@123"
        ]
    ];

    $insertAdmin = $pdo->prepare("
        INSERT INTO admin_accounts (
            admin_id,
            full_name,
            password_hash
        )
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
            admin_id = VALUES(admin_id)
    ");

    foreach ($adminAccounts as $account) {
        $insertAdmin->execute([
            $account[0],
            $account[1],
            password_hash($account[2], PASSWORD_DEFAULT)
        ]);
    }

    echo "PLMun Room Management System setup completed successfully.\n";
    echo "Student and professor email values are now Sample.\n";
    echo "All student courses are set to BSIT.\n";
    echo "Administrator accounts were checked or created.\n";
    echo "Existing administrator passwords were preserved.\n\n";

    echo "Default administrator accounts, only when newly created:\n";
    echo "ADMIN-001 / Admin@123\n";
    echo "ADMIN-002 / Staff@123\n\n";

    echo "IMPORTANT: Remove this setup file from the admin folder after use.\n";

} catch (Throwable $error) {
    error_log("Admin setup error: " . $error->getMessage());

    http_response_code(500);

    echo "Setup failed: " . $error->getMessage();
}