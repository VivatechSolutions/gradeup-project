// secureRequestLogger.js
const fs = require("fs");
const path = require("path");

const blockList = [
  "/.aws/credentials",
  "/phpinfo",
  "/phpinfo.php",
  "/php.php",
  "/php-info.php",
  "/_fragment",
  "/info",
  "/info.php",
  "/index.php/phpinfo",
  "/app_dev.php/_profiler/phpinfo",
  "/_profiler/phpinfo",
  "/_profiler/phpinfo.php",
  "/debug/default",
  "/test.php",
  "/test1.php",
  "/test2.php",
  "/frontend_dev.php/$",
  "/.env",
  "/.env.bak",
  "/.env.example",
  "/.env.local",
  "/.env.old",
  "/.env.prod",
  "/.env.production.local",
  "/.env.stage",
  "/.git/config",
  "/.profile",
  "/.flaskenv",
  "/.ftpconfig",
  "/.sftp.json",
  "/sftp-config.json",
  "/config.js",
  "/config.json",
  "/config/config.json",
  "/gulpfile.js",
  "/web.config",
  "/docker-compose.yml",
  "/Dockerfile",
  "/cdk.json",
  "/serverless.yml",
  "/main.js",
  "/app.js",
  "/server.js",
  "/index.js",
  "/lambda_function.py",
  "/Program.cs",
  "/app.config.js",
  "/appsettings.json",
  "/appsettings.Development.json",
  "/appsettings.Production.json",
  "/package.json",
  "/tsconfig.json",
  "/README.md",
  "/manifest.json",
  "/config/aws.json",
  "/settings.py",
  "/project/settings.py",
  "/config/settings.py",
  "/config/settings.json",
  "/config/settings.yml",
  "/config.yaml",
  "/config.yml",
  "/application.properties",
  "/src/main/resources/application.properties",
  "/src/main/resources/application-dev.properties",
  "/src/main/resources/application-prod.properties",
  "/sites/default/settings.php",
  "/app/etc/env.php",
  "/app/etc/local.xml",
  "/wp-config.php",
  "/config/database.php",
  "/config.php",
  "/cloudformation-template.yaml",
  "/cloudformation-template.json",
  "/template.yaml",
  "/stepfunctions/state-machine-definition.json",
  "/terraform.tfvars",
  "/main.tf",
  "/variables.tf",
  "/k8s/deployment.yaml",
  "/kubernetes/secrets.yaml",
  "/buildspec.yml",
  "/pipeline.yml",
  "/config/development.yaml",
  "/config/production.yaml",
  "/.ebextensions/myconfig.config",
  "/ebextensions.config",
  "/apprunner.yaml",
  "/.elasticbeanstalk/config.yml",
  "/config.nim",
  "/config/config.go",
  "/config.rs",
  "/config/application.rb",
  "/config/environments/development.rb",
  "/config/environments/production.rb",
  "/config/initializers/devise.rb",
  "/api/.env",
  "/apps/.env",
  "/admin/.env",
  "/app/.env",
  "/core/.env",
  "/backend/.env",
  "/server/.env",
  "/src/.env",
  "/internal/.env",
  "/services/.env",
  "/api/v1/.env",
  "/api/v2/.env",
  "/env/.env",
  "/env/dev/.env",
  "/env/prod/.env",
  "/env/test/.env",
  "/config/dev/.env",
  "/config/prod/.env",
  "/admin/dev/.env",
  "/admin/prod/.env",
  "/dev/.env",
  "/production/.env",
];

// Pattern-based blocklist
const blockRegexes = [
  /\.(env|bak|local|old|stage|ini|lock|cache|xml|yaml|yml|json|config|conf|pl|sh|rb|php|py|cs|go|rs|toml|ts|kt|edn|exs?|swift|lua|jl|ml|m|f90|cbl|cfc|cfm)$/i,
  /\/\.git/i,
  /\/\.vscode/i,
  /\/\.idea/i,
  /\/config\//i,
  /\/secrets\//i,
  /\/etc\//i,
  /\/app\//i,
  /\/resources\//i,
  /\/docs\//i,
  /\/src\//i,
  /\/grails-app\//i,
  /\/kubernetes\//i,
  /\/scripts\//i,
  /\/bucket-name\//i,
  /\/cloudformation/i,
  /\/stepfunctions\//i,
  /\/amplify\//i,
  /\/terraform/i,
  /\/CodePipeline/i,
  /\/ebextensions/i,
];

// File for logging blocked requests
// const blockedLogPath = path.join(__dirname, "blocked_requests.log");

// const suspiciousIPs = {};

// const logFile = path.join(__dirname, "suspicious_requests.log");

function secureRequestLogger(req, res, next) {
  const ip =
    req.headers["x-forwarded-for"] ||
    req.connection.remoteAddress ||
    req.socket?.remoteAddress ||
    "unknown";
  const requestPath = req.path.toLowerCase();

  const isBlockedPath =
    blockList.includes(requestPath) ||
    blockRegexes.some((regex) => regex.test(requestPath));

  // Always log request path
  console.log(`----path---`);
  // console.log(`${ip} ${req.method}→ ${requestPath}`);
  console.log(`${req.method}→ ${requestPath}`);

  // console.log(`${req.body}`);
  // console.log(`${res}`);

  // If suspicious, block
  if (isBlockedPath) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] BLOCKED ${ip}  tried to access ${requestPath}\n`;

    // Log to file
    // fs.appendFile(blockedLogPath, logEntry, (err) => {
    //   if (err) console.error("Error writing to blocked log:", err);
    // });

    console.warn(logEntry);
    return res.status(403).send("Forbidden: suspicious path"); 
  }

  next();
  //   const ip = req.ip || req.connection.remoteAddress;
  //   const requestedPath = req.path;

  //   // Always log
  //   console.log(`[${new Date().toISOString()}] ${ip} requested ${requestedPath}`);

  //   // Block & log if suspicious
  //   const isSuspicious = blockedPatterns.some((pattern) => pattern.test(requestedPath));

  //   if (isSuspicious) {
  //     suspiciousIPs[ip] = (suspiciousIPs[ip] || 0) + 1;

  //     const logMessage = `[${new Date().toISOString()}] BLOCKED ${ip} tried to access ${requestedPath}\n`;

  //     // Log to file
  //     fs.appendFile(logFile, logMessage, (err) => {
  //       if (err) console.error("Error writing to log file:", err);
  //     });

  //     console.warn(logMessage);
  //     return res.status(403).send("Access denied.");
  //   }

  //   next();
}

module.exports = secureRequestLogger;
