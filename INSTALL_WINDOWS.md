# DWG to PDF Converter - Windows Installation Guide

This comprehensive guide provides step-by-step instructions for installing and configuring the DWG to PDF Converter application on Windows 10 or Windows 11. The application requires Node.js, Python, Redis, and MySQL to function properly.

## System Requirements

Ensure your Windows system meets the following minimum requirements before beginning the installation:

| Component | Requirement |
|-----------|-------------|
| **Operating System** | Windows 10 (64-bit) or Windows 11 |
| **RAM** | Minimum 4GB, recommended 8GB or more |
| **Disk Space** | At least 10GB free space for application and dependencies |
| **CPU** | 2+ cores recommended for optimal performance |
| **Network** | Internet connection for package installation and S3 storage |
| **Administrator Access** | Required for installing system-level dependencies |

## Prerequisites Installation

The application depends on several third-party tools and services that must be installed before the main application setup.

### Install Node.js 22

Node.js provides the runtime environment for the backend server and build tools.

**Download and Install**:

1. Visit the official Node.js website: https://nodejs.org/
2. Download the **Windows Installer (.msi)** for Node.js 22.x LTS (64-bit)
3. Run the installer and follow the installation wizard
4. Accept the license agreement
5. Choose the default installation location: `C:\Program Files\nodejs\`
6. Ensure "Add to PATH" is checked
7. Complete the installation

**Verify Installation**:

Open PowerShell or Command Prompt and verify the installation:

```powershell
node --version
# Should output: v22.x.x

npm --version
# Should output: 10.x.x or later
```

### Install pnpm Package Manager

The project uses pnpm for efficient dependency management and faster installation times.

Open PowerShell as Administrator and install pnpm globally:

```powershell
npm install -g pnpm@10.15.1
```

Verify pnpm installation:

```powershell
pnpm --version
# Should output: 10.15.1
```

### Install Python 3.11

Python powers the DWG/DXF to PDF conversion service.

**Download and Install**:

1. Visit the official Python website: https://www.python.org/downloads/
2. Download **Python 3.11.x** for Windows (64-bit)
3. Run the installer
4. **Important**: Check "Add Python 3.11 to PATH" at the bottom of the installer
5. Click "Install Now" for the recommended installation
6. Wait for the installation to complete
7. Click "Disable path length limit" when prompted (recommended)

**Verify Installation**:

Open a new PowerShell window and verify:

```powershell
python --version
# Should output: Python 3.11.x

pip --version
# Should output: pip 23.x.x or later
```

### Install Redis for Windows

Redis serves as the message broker for the Celery task queue system.

**Download and Install**:

1. Download Redis for Windows from: https://github.com/microsoftarchive/redis/releases
2. Download the latest `.msi` installer (e.g., `Redis-x64-3.0.504.msi`)
3. Run the installer
4. Accept the license agreement
5. Choose the default installation location: `C:\Program Files\Redis\`
6. Check "Add the Redis installation folder to the PATH environment variable"
7. Complete the installation

**Start Redis Service**:

Open PowerShell as Administrator and start the Redis service:

```powershell
Start-Service Redis
```

Verify Redis is running:

```powershell
redis-cli ping
# Should output: PONG
```

**Configure Redis to Start Automatically**:

Set the Redis service to start automatically on system boot:

```powershell
Set-Service -Name Redis -StartupType Automatic
```

### Install MySQL Server

MySQL serves as the primary database for storing user accounts, conversion history, and analytics.

**Download and Install**:

1. Visit the MySQL Community Downloads page: https://dev.mysql.com/downloads/installer/
2. Download the **MySQL Installer for Windows** (web installer or full installer)
3. Run the installer
4. Choose "Developer Default" setup type
5. Click "Next" and allow the installer to check requirements
6. Install any missing requirements (typically Microsoft Visual C++ Redistributable)
7. Click "Execute" to install MySQL Server and related tools
8. Configure MySQL Server:
   - **Server Configuration Type**: Development Computer
   - **Connectivity**: Default (Port 3306)
   - **Authentication Method**: Use Strong Password Encryption
   - **Root Password**: Set a strong root password and remember it
   - **Windows Service**: Configure as Windows Service, start at system startup
   - **Service Name**: MySQL80
9. Complete the configuration and installation

**Verify Installation**:

Open PowerShell and verify MySQL is accessible:

```powershell
mysql --version
# Should output: mysql Ver 8.0.x
```

### Install Git for Windows (Optional)

If you plan to clone the repository from Git, install Git for Windows.

**Download and Install**:

1. Visit: https://git-scm.com/download/win
2. Download the latest Git for Windows installer
3. Run the installer with default options
4. Complete the installation

Verify Git installation:

```powershell
git --version
# Should output: git version 2.x.x
```

## Application Installation

With all prerequisites installed, proceed with setting up the DWG to PDF Converter application.

### Obtain Application Files

**Option 1: Clone from Git Repository**

If the application is hosted in a Git repository:

```powershell
cd C:\
git clone https://github.com/yourusername/dwg-pdf-converter.git
cd dwg-pdf-converter
```

**Option 2: Extract from Archive**

If you have a ZIP archive:

1. Extract the archive to `C:\dwg-pdf-converter`
2. Open PowerShell and navigate to the directory:

```powershell
cd C:\dwg-pdf-converter
```

### Install Node.js Dependencies

Install all required Node.js packages using pnpm:

```powershell
pnpm install
```

This process downloads and installs all dependencies defined in `package.json`. It may take several minutes depending on your internet connection speed.

### Install Python Dependencies

Install the Python packages required for the conversion service:

```powershell
pip install ezdxf celery redis pillow reportlab flask
```

These packages provide the following functionality:

| Package | Purpose |
|---------|---------|
| **ezdxf** | DXF file parsing and manipulation |
| **celery** | Distributed task queue for async processing |
| **redis** | Python client for Redis message broker |
| **pillow** | Image processing library |
| **reportlab** | PDF generation capabilities |
| **flask** | Lightweight web framework for Python API |

Verify installation:

```powershell
pip list | Select-String "ezdxf|celery|redis|pillow|reportlab|flask"
```

## Database Configuration

Configure MySQL to create the application database and user account.

### Create Database and User

Open MySQL Command Line Client (search for "MySQL 8.0 Command Line Client" in Start Menu) and log in with your root password.

Execute the following SQL commands:

```sql
CREATE DATABASE dwg_converter CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'dwg_user'@'localhost' IDENTIFIED BY 'your_secure_password_here';
GRANT ALL PRIVILEGES ON dwg_converter.* TO 'dwg_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

**Important**: Replace `your_secure_password_here` with a strong, unique password. Store this password securely.

### Configure Environment Variables

Create a `.env` file in the project root directory (`C:\dwg-pdf-converter\.env`) with the following content:

```env
DATABASE_URL=mysql://dwg_user:your_secure_password_here@localhost:3306/dwg_converter
JWT_SECRET=generate_a_random_64_character_string_here
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
OWNER_OPEN_ID=your_manus_oauth_open_id
OWNER_NAME=Your Name
```

Replace all placeholder values with your actual configuration.

**Generate JWT Secret**:

You can generate a secure random string for `JWT_SECRET` using PowerShell:

```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

### Initialize Database Schema

Push the database schema to create all required tables:

```powershell
pnpm db:push
```

This command uses Drizzle ORM to generate and apply database migrations.

## Python Service Configuration

Configure and start the Python conversion service.

### Start Python Services Manually

The Python service consists of two components: the Flask API server and the Celery worker.

**Start Flask API Server**:

Open a PowerShell window and navigate to the python_service directory:

```powershell
cd C:\dwg-pdf-converter\python_service
python api_server.py
```

The Flask server will start on port 5000. Keep this window open.

**Start Celery Worker**:

Open a second PowerShell window and start the Celery worker:

```powershell
cd C:\dwg-pdf-converter\python_service
celery -A celery_app worker --loglevel=info --pool=solo
```

**Note**: On Windows, Celery requires the `--pool=solo` flag due to Windows process limitations.

Keep this window open as well.

### Verify Python Service

Open a third PowerShell window and test the Flask API:

```powershell
Invoke-WebRequest -Uri http://localhost:5000/health | Select-Object -ExpandProperty Content
```

Expected response:

```json
{"status": "healthy", "service": "dwg-converter-api"}
```

## Application Startup

Start the main Node.js application server.

### Development Mode

For development and testing, start the application in development mode:

```powershell
cd C:\dwg-pdf-converter
pnpm dev
```

The application will be accessible at `http://localhost:3000`. The development server automatically reloads when you make changes to the source code.

### Production Mode

For production deployment, build and start the application in production mode:

```powershell
cd C:\dwg-pdf-converter
pnpm build
pnpm start
```

The production build optimizes the application for performance.

## Windows Service Configuration (Production)

For production environments, configure the application components to run as Windows services that start automatically.

### Install NSSM (Non-Sucking Service Manager)

NSSM is a service manager that makes it easy to run applications as Windows services.

**Download and Install**:

1. Visit: https://nssm.cc/download
2. Download the latest release ZIP file
3. Extract to `C:\nssm`
4. Add `C:\nssm\win64` to your system PATH environment variable

### Create Node.js Application Service

Open PowerShell as Administrator and create the main application service:

```powershell
nssm install DWGConverter "C:\Program Files\nodejs\node.exe" "C:\dwg-pdf-converter\dist\index.js"
nssm set DWGConverter AppDirectory "C:\dwg-pdf-converter"
nssm set DWGConverter AppEnvironmentExtra NODE_ENV=production
nssm set DWGConverter DisplayName "DWG to PDF Converter"
nssm set DWGConverter Description "Main application server for DWG to PDF conversion"
nssm set DWGConverter Start SERVICE_AUTO_START
```

### Create Python API Service

Create a service for the Flask API server:

```powershell
nssm install DWGConverterAPI "C:\Users\YourUsername\AppData\Local\Programs\Python\Python311\python.exe" "C:\dwg-pdf-converter\python_service\api_server.py"
nssm set DWGConverterAPI AppDirectory "C:\dwg-pdf-converter\python_service"
nssm set DWGConverterAPI DisplayName "DWG Converter Python API"
nssm set DWGConverterAPI Description "Python Flask API for DWG conversion"
nssm set DWGConverterAPI Start SERVICE_AUTO_START
```

**Note**: Replace `YourUsername` with your actual Windows username, or use the full path to your Python executable.

### Create Celery Worker Service

Create a service for the Celery worker:

```powershell
$pythonPath = (Get-Command python).Source
$celeryArgs = "-A celery_app worker --loglevel=info --pool=solo"
nssm install DWGConverterCelery $pythonPath "-m celery $celeryArgs"
nssm set DWGConverterCelery AppDirectory "C:\dwg-pdf-converter\python_service"
nssm set DWGConverterCelery DisplayName "DWG Converter Celery Worker"
nssm set DWGConverterCelery Description "Celery worker for async conversion processing"
nssm set DWGConverterCelery Start SERVICE_AUTO_START
```

### Start All Services

Start all three services:

```powershell
Start-Service DWGConverter
Start-Service DWGConverterAPI
Start-Service DWGConverterCelery
```

Verify services are running:

```powershell
Get-Service DWGConverter, DWGConverterAPI, DWGConverterCelery
```

All services should show a status of "Running".

## Firewall Configuration

Configure Windows Firewall to allow necessary traffic.

### Allow Application Through Firewall

Open PowerShell as Administrator and create firewall rules:

```powershell
# Allow Node.js application (port 3000)
New-NetFirewallRule -DisplayName "DWG Converter App" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow

# Allow Python API (port 5000)
New-NetFirewallRule -DisplayName "DWG Converter API" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow
```

**Note**: If you're using a reverse proxy (like IIS or nginx), you only need to allow the proxy's ports (80/443).

## IIS Reverse Proxy Configuration (Optional)

For production deployments with SSL support, configure Internet Information Services (IIS) as a reverse proxy.

### Install IIS

1. Open "Turn Windows features on or off" from Control Panel
2. Check "Internet Information Services"
3. Expand IIS and check:
   - Web Management Tools → IIS Management Console
   - World Wide Web Services → Application Development Features → WebSocket Protocol
4. Click OK and wait for installation

### Install URL Rewrite and Application Request Routing

1. Download and install **URL Rewrite Module**: https://www.iis.net/downloads/microsoft/url-rewrite
2. Download and install **Application Request Routing**: https://www.iis.net/downloads/microsoft/application-request-routing

### Configure Reverse Proxy

1. Open IIS Manager
2. Select your server in the left panel
3. Double-click "Application Request Routing Cache"
4. Click "Server Proxy Settings" in the right panel
5. Check "Enable proxy"
6. Click "Apply"
7. Create a new website or select "Default Web Site"
8. Double-click "URL Rewrite"
9. Click "Add Rule(s)" → "Reverse Proxy"
10. Enter `localhost:3000` as the inbound rule
11. Click OK

### Configure SSL Certificate

1. In IIS Manager, select your website
2. Click "Bindings" in the right panel
3. Add a new binding for HTTPS (port 443)
4. Select or import your SSL certificate
5. Click OK

## Verification and Testing

Perform comprehensive testing to ensure all components function correctly.

### Test Database Connection

Verify the application can connect to the database:

```powershell
cd C:\dwg-pdf-converter
pnpm db:push
```

This command should complete without errors.

### Test Python Service

Test the Python conversion API:

```powershell
Invoke-WebRequest -Uri http://localhost:5000/health | Select-Object -ExpandProperty Content
```

Expected response:

```json
{"status": "healthy", "service": "dwg-converter-api"}
```

### Test Application Access

Open a web browser and navigate to `http://localhost:3000`. You should see the DWG Converter home page with the upload interface.

### Test File Upload

Upload a sample DXF file through the web interface:

1. Navigate to the home page
2. Click or drag a DXF file to the upload area
3. Click "Convert to PDF"
4. Verify the conversion completes successfully
5. Download and inspect the generated PDF

## Monitoring and Maintenance

Establish procedures for monitoring and maintaining the application.

### View Service Logs

**Using Event Viewer**:

1. Open Event Viewer (search in Start Menu)
2. Navigate to Windows Logs → Application
3. Filter by source to find logs for your services

**Using NSSM**:

View service output logs:

```powershell
Get-Content "C:\dwg-pdf-converter\logs\app.log" -Tail 50 -Wait
```

### Database Backups

Create automated database backups using Windows Task Scheduler.

**Create Backup Script**:

Create a file `C:\dwg-pdf-converter\scripts\backup-database.ps1`:

```powershell
$BackupDir = "C:\Backups\dwg-converter"
$Date = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = "$BackupDir\dwg_converter_$Date.sql"

if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir
}

& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe" `
    -u dwg_user `
    -p'your_password_here' `
    dwg_converter `
    > $BackupFile

# Compress backup
Compress-Archive -Path $BackupFile -DestinationPath "$BackupFile.zip"
Remove-Item $BackupFile

# Delete backups older than 7 days
Get-ChildItem $BackupDir -Filter "*.zip" | 
    Where-Object {$_.LastWriteTime -lt (Get-Date).AddDays(-7)} | 
    Remove-Item
```

**Schedule Backup Task**:

1. Open Task Scheduler
2. Click "Create Basic Task"
3. Name: "DWG Converter Database Backup"
4. Trigger: Daily at 2:00 AM
5. Action: Start a program
6. Program: `powershell.exe`
7. Arguments: `-ExecutionPolicy Bypass -File "C:\dwg-pdf-converter\scripts\backup-database.ps1"`
8. Finish the wizard

### System Updates

Regularly update dependencies and system components.

**Update Node.js Dependencies**:

```powershell
cd C:\dwg-pdf-converter
pnpm update
```

**Update Python Dependencies**:

```powershell
pip install --upgrade ezdxf celery redis pillow reportlab flask
```

**Windows Updates**:

Keep Windows updated through Windows Update in Settings.

## Troubleshooting

Common issues and their solutions.

### Services Won't Start

**Symptom**: Windows services fail to start or immediately stop.

**Solution**:

1. Check service logs in Event Viewer
2. Verify all dependencies (Redis, MySQL) are running:

```powershell
Get-Service Redis, MySQL80
```

3. Ensure environment variables are correctly set in `.env`
4. Verify file paths in NSSM service configurations

### Conversion Failures

**Symptom**: File uploads succeed but conversions fail or remain in "processing" state.

**Solution**:

1. Verify Python services are running:

```powershell
Get-Service DWGConverterAPI, DWGConverterCelery
```

2. Check Celery worker logs for errors
3. Ensure Redis is running:

```powershell
redis-cli ping
```

4. Restart services:

```powershell
Restart-Service DWGConverterAPI, DWGConverterCelery
```

### Port Already in Use

**Symptom**: Application fails to start with "EADDRINUSE" error.

**Solution**:

Find and terminate the process using the port:

```powershell
# Find process using port 3000
Get-NetTCPConnection -LocalPort 3000 | Select-Object -ExpandProperty OwningProcess

# Terminate the process (replace PID with actual process ID)
Stop-Process -Id PID -Force
```

### Database Connection Errors

**Symptom**: Application logs show "ECONNREFUSED" or "Access denied" errors.

**Solution**:

1. Verify MySQL service is running:

```powershell
Get-Service MySQL80
```

2. Test database credentials:

```powershell
mysql -u dwg_user -p dwg_converter
```

3. If connection fails, recreate the database user as described in the Database Configuration section

### High Memory Usage

**Symptom**: System becomes slow due to high memory consumption.

**Solution**:

1. Monitor resource usage in Task Manager
2. Limit Celery worker concurrency by modifying the service configuration:

```powershell
nssm set DWGConverterCelery AppParameters "-m celery -A celery_app worker --loglevel=info --pool=solo --concurrency=2"
nssm restart DWGConverterCelery
```

## Security Considerations

Implement security best practices for production deployments.

### File Permissions

Restrict access to sensitive files:

1. Right-click `.env` file → Properties → Security
2. Remove unnecessary users
3. Ensure only administrators and the application service account have access

### Database Security

- Use strong, unique passwords for all database users
- Restrict MySQL to localhost connections only
- Regularly update MySQL to the latest security patches
- Enable MySQL binary logging for point-in-time recovery

### Application Security

- Keep all dependencies updated to patch security vulnerabilities
- Use HTTPS exclusively in production (configure via IIS)
- Implement rate limiting to prevent abuse
- Regularly review application logs for suspicious activity

### Windows Firewall

Maintain strict firewall rules:

- Only allow necessary ports (80, 443 for web traffic)
- Block direct access to application ports (3000, 5000) from external networks
- Use Windows Defender Firewall with Advanced Security for fine-grained control

## Additional Resources

For further assistance and information:

- **Project README**: `C:\dwg-pdf-converter\README.md`
- **API Documentation**: Available in the project repository
- **Node.js Documentation**: https://nodejs.org/docs
- **Python Documentation**: https://docs.python.org/3.11/
- **Celery Documentation**: https://docs.celeryq.dev/
- **IIS Documentation**: https://docs.microsoft.com/en-us/iis/
- **NSSM Documentation**: https://nssm.cc/usage

---

**Installation Complete**: Your DWG to PDF Converter application is now fully installed and configured on Windows. For Ubuntu installation instructions, refer to `INSTALL_UBUNTU.md`.
