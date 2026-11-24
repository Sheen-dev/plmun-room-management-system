<?php
require_once __DIR__ . "/db.php";

header("Content-Type: application/json; charset=UTF-8");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");

function respond($success, $message, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode([
        "success" => $success,
        "message" => $message
    ]);
    exit;
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    respond(false, "Invalid request method.", 405);
}

if (empty($_SESSION["admin"]["admin_id"])) {
    respond(false, "Administrator login is required.", 401);
}

$currentPassword = (string) ($_POST["current_password"] ?? "");
$newPassword = (string) ($_POST["new_password"] ?? "");
$adminId = trim((string) $_SESSION["admin"]["admin_id"]);

if ($currentPassword === "" || $newPassword === "") {
    respond(false, "Please enter your current password and a new password.", 400);
}

$newPasswordLength = strlen($newPassword);
if ($newPasswordLength < 8 || $newPasswordLength > 72) {
    respond(false, "New password must be between 8 and 72 bytes long.", 400);
}

if (hash_equals($currentPassword, $newPassword)) {
    respond(false, "Your new password must be different from your current password.", 400);
}

try {
    $lookup = $pdo->prepare("
        SELECT password_hash
        FROM admin_accounts
        WHERE admin_id = ?
        LIMIT 1
    ");
    $lookup->execute([$adminId]);
    $admin = $lookup->fetch(PDO::FETCH_ASSOC);

    if (!$admin || !password_verify($currentPassword, $admin["password_hash"])) {
        respond(false, "Your current password is incorrect.", 401);
    }

    $newPasswordHash = password_hash($newPassword, PASSWORD_DEFAULT);
    if ($newPasswordHash === false) {
        throw new RuntimeException("Password hashing failed.");
    }

    $update = $pdo->prepare("
        UPDATE admin_accounts
        SET password_hash = ?
        WHERE admin_id = ?
        LIMIT 1
    ");
    $update->execute([$newPasswordHash, $adminId]);

    if ($update->rowCount() !== 1) {
        respond(false, "The administrator account could not be updated.", 500);
    }

    respond(true, "Administrator password changed successfully.");
} catch (Throwable $error) {
    error_log("Change administrator password error: " . $error->getMessage());
    respond(false, "Unable to change the administrator password. Please try again.", 500);
}
