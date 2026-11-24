
<?php

header("Content-Type: application/json; charset=UTF-8");

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

$scriptPath = str_replace("\\", "/", $_SERVER["SCRIPT_NAME"] ?? "");
$endpoint = basename($scriptPath);

$isAdminFolder = preg_match('~(?:^|/)admin/[^/]+$~i', $scriptPath) === 1;
$isUserFolder = preg_match('~(?:^|/)user/[^/]+$~i', $scriptPath) === 1;

$adminOnlyEndpoints = [
    "add_room.php",
    "add_user.php",
    "clear_bookings.php",
    "delete_room.php",
    "delete_user.php",
    "get_bookings.php",
    "get_users.php",
    "save_room_schedule.php",
    "update_user.php",
    "change_user_password.php"
];

$sharedRoomEndpoints = [
    "get_rooms.php",
    "get_room_schedule.php"
];

$userOnlyEndpoints = [
    "book_room.php",
    "get_bookings.php"
];

if (
    $isAdminFolder &&
    in_array($endpoint, $adminOnlyEndpoints, true) &&
    empty($_SESSION["admin"])
) {
    http_response_code(401);

    echo json_encode([
        "success" => false,
        "message" => "Administrator login is required."
    ]);

    exit;
}

if (
    $isAdminFolder &&
    in_array($endpoint, $sharedRoomEndpoints, true) &&
    empty($_SESSION["admin"]) &&
    empty($_SESSION["user"])
) {
    http_response_code(401);

    echo json_encode([
        "success" => false,
        "message" => "Please log in before accessing room information."
    ]);

    exit;
}

if (
    $isUserFolder &&
    in_array($endpoint, $userOnlyEndpoints, true) &&
    empty($_SESSION["user"])
) {
    http_response_code(401);

    echo json_encode([
        "success" => false,
        "message" => "Please log in first."
    ]);

    exit;
}

$host = "sql103.infinityfree.com";
$dbname = "if0_43363000_room_management";
$username = "if0_43363000";
$password = "WhimZamora123";

try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
        $username,
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]
    );

} catch (PDOException $error) {
    error_log("Database connection error: " . $error->getMessage());

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Database connection failed. Please try again."
    ]);

    exit;
}
