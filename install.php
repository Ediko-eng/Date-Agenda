<?php
declare(strict_types=1);

require __DIR__ . '/inc/config.php';

$messages = [];

try {
    try {
        $root = new PDO(
            sprintf('mysql:host=%s;port=%d;charset=utf8mb4', DB_HOST, DB_PORT),
            DB_USER,
            DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );
        $root->exec('CREATE DATABASE IF NOT EXISTS `' . DB_NAME . '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
        $messages[] = 'Database "' . DB_NAME . '" ready.';
    } catch (Throwable $e) {
        $messages[] = 'Note: could not create database automatically (' . $e->getMessage() . '). Assuming it already exists.';
    }

    $pdo = db();

    $pdo->exec('CREATE TABLE IF NOT EXISTS users (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        full_name VARCHAR(100) NOT NULL DEFAULT "",
        gender VARCHAR(20) NOT NULL DEFAULT "",
        birth_date DATE NULL,
        address TEXT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
    $messages[] = 'Table "users" ready.';

    // Upgrade older installs that predate the profile columns.
    $userCols = [];
    foreach ($pdo->query("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'") as $c) {
        $userCols[$c['COLUMN_NAME']] = true;
    }
    $userUpgrades = [
        'full_name'     => 'VARCHAR(100) NOT NULL DEFAULT ""',
        'gender'        => 'VARCHAR(20) NOT NULL DEFAULT ""',
        'birth_date'    => 'DATE NULL',
        'address'       => 'TEXT NULL',
        'last_login_at' => 'DATETIME NULL',
    ];
    foreach ($userUpgrades as $col => $def) {
        if (!isset($userCols[$col])) $pdo->exec("ALTER TABLE users ADD COLUMN {$col} {$def}");
    }

    $pdo->exec('CREATE TABLE IF NOT EXISTS invitations (
        id VARCHAR(24) NOT NULL PRIMARY KEY,
        user_id INT UNSIGNED NULL,
        date DATETIME NULL,
        location VARCHAR(255) NOT NULL DEFAULT "",
        pickup_location VARCHAR(255) NOT NULL DEFAULT "",
        dress_code VARCHAR(50) NOT NULL DEFAULT "",
        activity VARCHAR(255) NOT NULL DEFAULT "",
        song_url VARCHAR(500) NOT NULL DEFAULT "",
        status VARCHAR(20) NOT NULL DEFAULT "pending",
        photos LONGTEXT NULL,
        created_by VARCHAR(50) NULL,
        creator_name VARCHAR(100) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_inv_user (user_id),
        CONSTRAINT fk_inv_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
    $messages[] = 'Table "invitations" ready.';

    // Upgrade older installs that predate the creator display-name column.
    $invHasCreatorName = (bool) $pdo->query("SELECT COUNT(*) FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invitations' AND COLUMN_NAME = 'creator_name'")->fetchColumn();
    if (!$invHasCreatorName) {
        $pdo->exec('ALTER TABLE invitations ADD COLUMN creator_name VARCHAR(100) NULL AFTER created_by');
    }

    $pdo->exec('CREATE TABLE IF NOT EXISTS responses (
        invitation_id VARCHAR(24) NOT NULL,
        user_id INT UNSIGNED NULL,
        decision ENUM("accepted","declined") NOT NULL,
        responder_name VARCHAR(100) NULL,
        message TEXT NULL,
        responded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (invitation_id),
        INDEX idx_resp_user (user_id),
        CONSTRAINT fk_resp_inv FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE CASCADE,
        CONSTRAINT fk_resp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
    $messages[] = 'Table "responses" ready.';

    // Upgrade older installs that kept accept/decline as columns on invitations.
    $hasLegacy = (bool) $pdo->query("SELECT COUNT(*) FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invitations' AND COLUMN_NAME = 'accepted_by'")->fetchColumn();
    if ($hasLegacy) {
        $pdo->exec("INSERT INTO responses (invitation_id, user_id, decision, responder_name, message, responded_at)
            SELECT id, NULL,
                   CASE WHEN status = 'accepted' THEN 'accepted' WHEN status = 'declined' THEN 'declined' END,
                   COALESCE(accepted_by, declined_by), message, COALESCE(responded_at, created_at)
            FROM invitations WHERE status IN ('accepted', 'declined')
            ON DUPLICATE KEY UPDATE
                decision = VALUES(decision), responder_name = VALUES(responder_name),
                message = VALUES(message), responded_at = VALUES(responded_at)");
        $pdo->exec('ALTER TABLE invitations
            DROP COLUMN IF EXISTS accepted_by,
            DROP COLUMN IF EXISTS declined_by,
            DROP COLUMN IF EXISTS message,
            DROP COLUMN IF EXISTS responded_at');
        $messages[] = 'Migrated accept/decline data into "responses" and removed legacy columns.';
    }
    $pdo->exec('CREATE TABLE IF NOT EXISTS views (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        invitation_id VARCHAR(24) NOT NULL,
        ip VARCHAR(45) NOT NULL,
        user_agent VARCHAR(512) NOT NULL DEFAULT "",
        referer VARCHAR(512) NOT NULL DEFAULT "",
        browser VARCHAR(40) NOT NULL DEFAULT "",
        os VARCHAR(40) NOT NULL DEFAULT "",
        device VARCHAR(20) NOT NULL DEFAULT "",
        viewer VARCHAR(64) NOT NULL DEFAULT "",
        viewed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_views_inv (invitation_id),
        CONSTRAINT fk_views_inv FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
    $messages[] = 'Table "views" ready.';

    $pdo->exec('CREATE TABLE IF NOT EXISTS photos (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        invitation_id VARCHAR(24) NOT NULL,
        data LONGTEXT NOT NULL,
        uploaded_by VARCHAR(64) NOT NULL DEFAULT "",
        caption VARCHAR(255) NOT NULL DEFAULT "",
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_photos_inv (invitation_id),
        CONSTRAINT fk_photos_inv FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
    $messages[] = 'Table "photos" ready.';

    $pdo->exec('CREATE TABLE IF NOT EXISTS logins (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NULL,
        username VARCHAR(64) NOT NULL DEFAULT "",
        ip VARCHAR(45) NOT NULL DEFAULT "",
        user_agent VARCHAR(512) NOT NULL DEFAULT "",
        browser VARCHAR(40) NOT NULL DEFAULT "",
        os VARCHAR(40) NOT NULL DEFAULT "",
        device VARCHAR(20) NOT NULL DEFAULT "",
        logged_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_logins_user (user_id),
        INDEX idx_logins_time (logged_at),
        CONSTRAINT fk_logins_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
    $messages[] = 'Table "logins" ready.';

    $exists = (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
    if ($exists === 0) {
        $stmt = $pdo->prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
        $stmt->execute([DEFAULT_ADMIN_USER, password_hash(DEFAULT_ADMIN_PASS, PASSWORD_DEFAULT)]);
        $messages[] = 'Default account created: ' . DEFAULT_ADMIN_USER . ' / ' . DEFAULT_ADMIN_PASS . ' (id 1)';
    } else {
        $messages[] = 'Users already exist, skipped seeding.';
    }
} catch (Throwable $e) {
    http_response_code(500);
    $messages[] = 'ERROR: ' . $e->getMessage();
}
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Install &middot; Date Agenda</title>
<style>
body{font-family:system-ui,"Segoe UI",sans-serif;background:#f4fafd;color:#161d1f;display:grid;place-items:center;min-height:100vh;margin:0}
.card{background:#fff;border-radius:16px;padding:32px;max-width:520px;box-shadow:0 12px 40px rgba(58,102,96,.15)}
h1{color:#3a6660;margin-top:0}
li{margin:6px 0}
a.btn{display:inline-block;margin-top:16px;background:#3a6660;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none}
.hint{color:#707977;font-size:13px}
</style>
</head>
<body>
<main class="card">
    <h1>Date Agenda &middot; Installation</h1>
    <ul>
        <?php foreach ($messages as $m): ?>
            <li><?= e($m) ?></li>
        <?php endforeach; ?>
    </ul>
    <a class="btn" href="index.html">Open Date Agenda &rarr;</a>
    <p class="hint">Delete this install.php after setup.</p>
</main>
</body>
</html>
