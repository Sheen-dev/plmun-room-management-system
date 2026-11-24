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

$role = strtoupper(trim($_POST["user_role"] ?? ""));
$userId = trim($_POST["user_id"] ?? "");
$newPassword = (string) ($_POST["password"] ?? "");

if (!in_array($role, ["STUDENT", "PROFESSOR"], true)) {
    respond(false, "Invalid account type.", 400);
}

if ($userId === "" || strlen($userId) > 20) {
    respond(false, "Invalid user ID.", 400);
}

$passwordLength = strlen($newPassword);

if ($passwordLength < 8 || $passwordLength > 72) {
    respond(false, "Password must be between 8 and 72 bytes long.", 400);
}

try {
    $passwordHash = password_hash($newPassword, PASSWORD_DEFAULT);

    if ($role === "STUDENT") {
        $update = $pdo->prepare("
            UPDATE students
            SET password = ?
            WHERE student_id = ?
            LIMIT 1
        ");
    } else {
        $update = $pdo->prepare("
            UPDATE professors
            SET password = ?
            WHERE professor_id = ?
            LIMIT 1
        ");
    }

    $update->execute([
        $passwordHash,
        $userId
    ]);

    if ($update->rowCount() !== 1) {
        respond(false, "The selected user account was not found.", 404);
    }

    respond(
        true,
        "User password updated successfully. The user can now sign in using the new password."
    );

} catch (Throwable $error) {
    error_log("Change user password error: " . $error->getMessage());

    respond(false, "Unable to update the user password.", 500);
}