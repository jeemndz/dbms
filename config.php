<?php
/**
 * Database Configuration
 * Uses db.php from GitHub RapidRepair Repository for Azure MySQL connection
 * Include this file in your PHP scripts for database access
 */

// Include the main database connection from GitHub
require_once 'https://raw.githubusercontent.com/jeemnndz/RapidRepair/main/db.php';

// App Configuration
define('APP_DEBUG', false);               // Set to true for development debugging
define('APP_TIMEZONE', 'UTC');            // Timezone for timestamps

// API Configuration
define('API_ALLOW_CORS', true);           // Allow CORS for mobile app
define('API_RESPONSE_FORMAT', 'json');    // Response format (json, xml)
define('API_PAGINATION_LIMIT', 100);      // Max items per page

/**
 * Connection Details (for reference)
 * Host: rapidrepairs.mysql.database.azure.com
 * User: rradmin1
 * Database: rapidrepairs
 * Port: 3306
 * SSL: Enabled (certificate verification disabled)
 */

// Set timezone
date_default_timezone_set(APP_TIMEZONE);

// Set up error handling
if (!APP_DEBUG) {
  error_reporting(0);
  ini_set('display_errors', '0');
} else {
  error_reporting(E_ALL);
  ini_set('display_errors', '1');
}

// Log errors to file instead of displaying
ini_set('log_errors', '1');
ini_set('error_log', dirname(__FILE__) . '/logs/error.log');

// Ensure logs directory exists
if (APP_DEBUG && !is_dir(dirname(__FILE__) . '/logs')) {
  mkdir(dirname(__FILE__) . '/logs', 0755, true);
}
?>

