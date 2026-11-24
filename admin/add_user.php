<?php
require_once __DIR__ . "/db.php";

header("Content-Type: application/json; charset=UTF-8");

function respond($success, $message, $statusCode = 200, $extra = []) {
    http_response_code($statusCode);

    echo json_encode(array_merge([
        "success" => $success,
        "message" => $message
    ], $extra));

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
$password = $_POST["password"] ?? "";

if (!in_array($role, ["STUDENT", "PROFESSOR"], true)) {
    respond(false, "Please select Student or Professor.", 400);
}

if ($role === "STUDENT") {
    $program = "BSIT";
}

if ($userId === "" || strlen($userId) > 20) {
    respond(false, "Please enter a valid user ID.", 400);
}

if ($fullName === "" || strlen($fullName) > 150) {
    respond(false, "Please enter a valid full name.", 400);
}

if ($program === "" || strlen($program) > 100) {
    respond(false, "Please enter the course or department.", 400);
}

if ($age === false || $age < 16 || $age > 100) {
    respond(false, "Please enter a valid age.", 400);
}

$maxLevelLength = $role === "STUDENT" ? 30 : 50;

if ($level === "" || strlen($level) > $maxLevelLength) {
    respond(false, "Please enter the year level or designation.", 400);
}

$passwordLength = strlen($password);

if ($passwordLength < 8 || $passwordLength > 72) {
    respond(false, "Password must be between 8 and 72 bytes long.", 400);
}

// Email is intentionally a placeholder.
$email = "Sample";

try {
    // IDs must be unique across both account types.
    $duplicate = $pdo->prepare("
        SELECT 1 FROM students WHERE student_id = ?
        UNION ALL
        SELECT 1 FROM professors WHERE professor_id = ?
        LIMIT 1
    ");

    $duplicate->execute([$userId, $userId]);

    if ($duplicate->fetchColumn()) {
        respond(false, "That user ID already exists.", 409);
    }

    $passwordHash = password_hash($password, PASSWORD_DEFAULT);

    if ($role === "STUDENT") {
        $insert = $pdo->prepare("
            INSERT INTO students
                (student_id, full_name, course, email, age, year_level, role, password)
            VALUES (?, ?, ?, ?, ?, ?, 'STUDENT', ?)
        ");

        $insert->execute([
            $userId,
            $fullName,
            "BSIT",
            $email,
            $age,
            $level,
            $passwordHash
        ]);

    } else {
        $insert = $pdo->prepare("
            INSERT INTO professors
                (professor_id, full_name, department, email, age, designation, role, password)
            VALUES (?, ?, ?, ?, ?, ?, 'PROFESSOR', ?)
        ");

        $insert->execute([
            $userId,
            $fullName,
            $program,
            $email,
            $age,
            $level,
            $passwordHash
        ]);
    }

    respond(
        true,
        "User account added successfully.",
        200,
        ["email" => "Sample"]
    );

} catch (PDOException $error) {
    error_log("Add user error: " . $error->getMessage());

    if (($error->errorInfo[1] ?? null) == 1062) {
        respond(false, "That user ID already exists.", 409);
    }

    respond(false, "Unable to add the user account. Please check the database.", 500);

} catch (Throwable $error) {
    error_log("Add user error: " . $error->getMessage());

    respond(false, "An unexpected error occurred.", 500);
}