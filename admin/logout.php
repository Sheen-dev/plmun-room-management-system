<?php
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

header("Content-Type: application/json; charset=UTF-8");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");

unset($_SESSION["admin"]);
session_regenerate_id(true);

echo json_encode([
    "success" => true,
    "message" => "Administrator logged out successfully."
]);
