<?php
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

header("Content-Type: application/json; charset=UTF-8");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");

if (empty($_SESSION["admin"]) || !is_array($_SESSION["admin"])) {
    http_response_code(401);
    echo json_encode([
        "success" => false,
        "message" => "No active administrator session."
    ]);
    exit;
}

echo json_encode([
    "success" => true,
    "admin" => [
        "admin_id" => $_SESSION["admin"]["admin_id"] ?? "",
        "full_name" => $_SESSION["admin"]["full_name"] ?? "Administrator"
    ]
]);
