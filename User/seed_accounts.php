<?php
require_once __DIR__ . "/../admin/db.php";

header("Content-Type: text/plain; charset=UTF-8");

$passwordHash = password_hash("Plmun@123", PASSWORD_DEFAULT);

$sampleEmail = "Sample";

$students = [
    ["24175832", "Miguel Santos", "BSIT", 20, "3rd Year"],
    ["24179316", "Angela Mae Reyes", "BSIT", 19, "2nd Year"],
    ["24174609", "Joshua Daniel Cruz", "BSIT", 18, "1st Year"],
    ["24178245", "Sofia Isabelle Garcia", "BSIT", 22, "4th Year"]
];

$professors = [
    ["TCH-8821", "Roberto Miguel Dela Cruz", "Information Technology", 38, "Instructor"],
    ["TCH-7354", "Maria Cristina Mendoza", "Computer Science", 42, "Assistant Professor"],
    ["TCH-6193", "Daniel Patrick Ramos", "Accountancy", 35, "Instructor"],
    ["TCH-9042", "Elizabeth Anne Flores", "Business Administration", 45, "Associate Professor"]
];

try {
    $pdo->beginTransaction();

    /* =========================================
       SAMPLE STUDENTS
    ========================================= */

    $studentSQL = "
        INSERT INTO students
            (student_id, full_name, course, email, age, year_level, role, password)
        VALUES (?, ?, 'BSIT', ?, ?, ?, 'STUDENT', ?)
        ON DUPLICATE KEY UPDATE
            full_name = VALUES(full_name),
            course = 'BSIT',
            email = VALUES(email),
            age = VALUES(age),
            year_level = VALUES(year_level),
            password = VALUES(password)
    ";

    $studentStmt = $pdo->prepare($studentSQL);

    foreach ($students as $student) {
        $studentStmt->execute([
            $student[0],
            $student[1],
            $sampleEmail,
            $student[3],
            $student[4],
            $passwordHash
        ]);
    }

    /* =========================================
       SAMPLE PROFESSORS
    ========================================= */

    $professorSQL = "
        INSERT INTO professors
            (professor_id, full_name, department, email, age, designation, role, password)
        VALUES (?, ?, ?, ?, ?, ?, 'PROFESSOR', ?)
        ON DUPLICATE KEY UPDATE
            full_name = VALUES(full_name),
            department = VALUES(department),
            email = VALUES(email),
            age = VALUES(age),
            designation = VALUES(designation),
            password = VALUES(password)
    ";

    $professorStmt = $pdo->prepare($professorSQL);

    foreach ($professors as $professor) {
        $professorStmt->execute([
            $professor[0],
            $professor[1],
            $professor[2],
            $sampleEmail,
            $professor[3],
            $professor[4],
            $passwordHash
        ]);
    }

    $pdo->commit();

    echo "Sample student and professor accounts saved successfully!\n";
    echo "All sample student courses are BSIT.\n";
    echo "Email values are set to Sample.\n";
    echo "Password for sample student and professor accounts: Plmun@123\n";

} catch (Throwable $error) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log("Seed sample accounts error: " . $error->getMessage());

    http_response_code(500);

    echo "Error: " . $error->getMessage();
}