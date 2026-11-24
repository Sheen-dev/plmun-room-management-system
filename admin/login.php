<?php
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

header("Content-Type: application/json; charset=UTF-8");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");

require_once __DIR__ . "/db.php";

function respond($success, $message, $statusCode = 200, $extra = []) {
    http_response_code($statusCode);
    echo json_encode(array_merge([
        "success" => $success,
        "message" => $message
    ], $extra));
    exit;
}

$data = json_decode(file_get_contents("php://input"), true) ?? [];
$adminId = strtoupper(trim($data["admin_id"] ?? ""));
$password = $data["password"] ?? "";

if ($adminId === "" || $password === "") {
    respond(false, "Please enter your administrator ID and password.", 400);
}

try {
    // A missing table is usually caused by not running the one-time setup file.
    $tableCheck = $pdo->query("SHOW TABLES LIKE 'admin_accounts'");
    if (!$tableCheck->fetchColumn()) {
        respond(
            false,
            "Administrator accounts are not set up yet. Open admin/setup_admin_accounts.php once, then try again.",
            503
        );
    }

    $stmt = $pdo->prepare("
        SELECT admin_id, full_name, password_hash
        FROM admin_accounts
        WHERE UPPER(admin_id) = ?
        LIMIT 1
    ");
    $stmt->execute([$adminId]);
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$admin || !password_verify($password, $admin["password_hash"])) {
        respond(false, "Incorrect administrator ID or password.", 401);
    }

    unset($_SESSION["user"]);
    session_regenerate_id(true);

    $_SESSION["admin"] = [
        "admin_id" => $admin["admin_id"],
        "full_name" => $admin["full_name"]
    ];

    respond(true, "Administrator login successful.", 200, [
        "admin" => $_SESSION["admin"]
    ]);

} catch (PDOException $error) {
    error_log(
        "PLMun Room Management System admin login database error (" .
        $error->getCode() . "): " . $error->getMessage()
    );

    $sqlState = (string) $error->getCode();

    if ($sqlState === "42S02" || $sqlState === "42S22") {
        respond(
            false,
            "The administrator table is missing or has an outdated structure. Run admin/setup_admin_accounts.php once.",
            503
        );
    }

    respond(
        false,
        "The database could not verify this administrator. Check that MySQL is running and that admin/db.php uses the correct database.",
        500
    );

} catch (Throwable $error) {
    error_log(
        "PLMun Room Management System admin login error: " . $error->getMessage()
    );

    respond(false, "An unexpected sign-in error occurred. Check the PHP error log.", 500);
}
