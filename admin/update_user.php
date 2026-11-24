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
$fullName = trim($_POST["full_name"] ?? "");
$program = trim($_POST["program"] ?? "");
$age = filter_var($_POST["age"] ?? null, FILTER_VALIDATE_INT);
$level = trim($_POST["level"] ?? "");

if (!in_array($role, ["STUDENT", "PROFESSOR"], true)) {
    respond(false, "Please select a valid account type.", 400);
}

if ($userId === "" || strlen($userId) > 20) {
    respond(false, "The selected user ID is invalid.", 400);
}

if ($fullName === "" || strlen($fullName) > 150) {
    respond(false, "Please enter a valid full name.", 400);
}

if ($age === false || $age < 16 || $age > 100) {
    respond(false, "Please enter a valid age between 16 and 100.", 400);
}

if ($role === "STUDENT") {
    $program = "BSIT";
    $maxLevelLength = 30;
} else {
    if ($program === "" || strlen($program) > 100) {
        respond(false, "Please enter a valid department.", 400);
    }

    $maxLevelLength = 50;
}

if ($level === "" || strlen($level) > $maxLevelLength) {
    respond(
        false,
        $role === "STUDENT"
            ? "Please enter a valid year level."
            : "Please enter a valid designation.",
        400
    );
}

// Email is intentionally set to a placeholder.
$email = "Sample";

try {
    if ($role === "STUDENT") {
        $update = $pdo->prepare("
            UPDATE students
            SET
                full_name = ?,
                course = 'BSIT',
                email = ?,
                age = ?,
                year_level = ?
            WHERE student_id = ?
            LIMIT 1
        ");

        $update->execute([
            $fullName,
            $email,
            $age,
            $level,
            $userId
        ]);

    } else {
        $update = $pdo->prepare("
            UPDATE professors
            SET
                full_name = ?,
                department = ?,
                email = ?,
                age = ?,
                designation = ?
            WHERE professor_id = ?
            LIMIT 1
        ");

        $update->execute([
            $fullName,
            $program,
            $email,
            $age,
            $level,
            $userId
        ]);
    }

    if ($update->rowCount() === 0) {
        // Check whether the account exists even if no field changed.
        if ($role === "STUDENT") {
            $check = $pdo->prepare("
                SELECT 1 FROM students WHERE student_id = ? LIMIT 1
            ");
        } else {
            $check = $pdo->prepare("
                SELECT 1 FROM professors WHERE professor_id = ? LIMIT 1
            ");
        }

        $check->execute([$userId]);

        if (!$check->fetchColumn()) {
            respond(false, "The selected user account was not found.", 404);
        }
    }

    respond(true, "User information updated successfully.");

} catch (Throwable $error) {
    error_log("Update user error: " . $error->getMessage());

    respond(false, "Unable to update user information.", 500);
}