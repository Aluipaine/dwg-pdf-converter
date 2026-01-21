# DWG to PDF Converter - Ubuntu Installation Guide

This comprehensive guide walks you through installing and configuring the DWG to PDF Converter application on Ubuntu 22.04 LTS or later. The application consists of a Node.js/Express backend, React frontend, Python conversion service, and supporting infrastructure including Redis and MySQL.

## System Requirements

Before beginning the installation process, ensure your Ubuntu system meets the following minimum requirements:

| Component            | Requirement                                                 |
| -------------------- | ----------------------------------------------------------- |
| **Operating System** | Ubuntu 22.04 LTS or later (64-bit)                          |
| **RAM**              | Minimum 4GB, recommended 8GB or more                        |
| **Disk Space**       | At least 10GB free space for application and dependencies   |
| **CPU**              | 2+ cores recommended for optimal performance                |
| **Network**          | Internet connection for package installation and S3 storage |

## Prerequisites Installation

The application requires several system-level dependencies that must be installed before proceeding with the main installation.

### Update System Packages

Begin by updating your system package index and upgrading existing packages to their latest versions:

```bash
sudo apt-get update
sudo apt-get upgrade -y
```

### Install Node.js 22

The application requires Node.js version 22 or later. Install Node.js using the NodeSource repository:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Verify the installation by checking the Node.js and npm versions:

```bash
node --version  # Should output v22.x.x
npm --version   # Should output 10.x.x or later
```

### Install pnpm Package Manager

The project uses pnpm as its package manager for efficient dependency management:

```bash
sudo npm install -g pnpm@10.15.1
```

Verify pnpm installation:

```bash
pnpm --version  # Should output 10.15.1
```

### Install Python 3.11

The conversion service requires Python 3.11 for processing DWG and DXF files:

```bash
sudo apt-get install -y python3.11 python3.11-dev python3-pip
```

Verify Python installation:

```bash
python3.11 --version  # Should output Python 3.11.x
```

### Install Redis Server

Redis serves as the message broker for the Celery task queue system:

```bash
sudo apt-get install -y redis-server
```

Start and enable Redis to run automatically on system boot:

```bash
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

Verify Redis is running:

```bash
redis-cli ping  # Should output PONG
```

### Install MySQL Server

The application uses MySQL as its primary database. Install MySQL 8.0 or later:

```bash
sudo apt-get install -y mysql-server
```

Secure your MySQL installation by running the security script:

```bash
sudo mysql_secure_installation
```

Follow the prompts to set a root password and configure security settings. When asked, select the following options:

- **Validate Password Component**: Yes (recommended)
- **Password Validation Policy**: Medium or Strong
- **Remove anonymous users**: Yes
- **Disallow root login remotely**: Yes
- **Remove test database**: Yes
- **Reload privilege tables**: Yes

### Install Additional System Dependencies

Install supporting libraries required for image processing and CAD file handling:

```bash
sudo apt-get install -y \
  libcairo2-dev \
  pkg-config \
  python3-dev \
  build-essential \
  imagemagick \
  ghostscript
```

## Application Installation

With all prerequisites in place, proceed with installing the DWG to PDF Converter application.

### Clone the Repository

If you have the application source code in a Git repository, clone it to your local system:

```bash
cd /var/www/krutoedemo_g_usr/data/www
sudo git clone https://github.com/aluipaine/dwg-pdf-converter.git dwg.gromi.fi
cd dwg.gromi.fi
```

Alternatively, if you have a compressed archive, extract it to `/var/www/krutoedemo_g_usr/data/www/dwg.gromi.fi`.

### Install Node.js Dependencies

Navigate to the project directory and install all Node.js dependencies using pnpm:

```bash
cd /var/www/krutoedemo_g_usr/data/www/dwg.gromi.fi
pnpm install
```

This process may take several minutes as pnpm downloads and installs all required packages.

### Install Python Dependencies

Install the Python packages required for the conversion service:

```bash
sudo pip3 install ezdxf celery redis pillow reportlab flask
```

These packages provide the following functionality:

| Package       | Purpose                                     |
| ------------- | ------------------------------------------- |
| **ezdxf**     | DXF file parsing and manipulation           |
| **celery**    | Distributed task queue for async processing |
| **redis**     | Python client for Redis message broker      |
| **pillow**    | Image processing library                    |
| **reportlab** | PDF generation capabilities                 |
| **flask**     | Lightweight web framework for Python API    |

## Database Configuration

Create and configure the MySQL database for the application.

### Create Database and User

Log into MySQL as the root user:

```bash
sudo mysql -u root -p
```

Execute the following SQL commands to create the database and dedicated user:

```sql
CREATE DATABASE dwg_converter CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'dwg_user'@'localhost' IDENTIFIED BY 'your_secure_password_here';
GRANT ALL PRIVILEGES ON dwg_converter.* TO 'dwg_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

**Important**: Replace `your_secure_password_here` with a strong, unique password. Store this password securely as you will need it for the environment configuration.

### Configure Database Connection

Create a `.env` file in the project root directory with your database credentials:

```bash
cd /var/www/krutoedemo_g_usr/data/www/dwg.gromi.fi
sudo nano .env
```

Add the following environment variables, replacing the placeholder values with your actual configuration:

```env
DATABASE_URL=mysql://dwg_user:your_secure_password_here@localhost:3306/dwg_converter
JWT_SECRET=generate_a_random_64_character_string_here
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
OWNER_OPEN_ID=your_manus_oauth_open_id
OWNER_NAME=Your Name
```

**Security Note**: Ensure the `.env` file has restricted permissions:

```bash
sudo chmod 600 .env
```

### Initialize Database Schema Я ТУТ!

Push the database schema to create all required tables:

```bash
pnpm db:push
```

This command generates the necessary tables based on the Drizzle ORM schema definitions.

## Python Service Configuration

Configure and start the Python conversion service that handles DWG/DXF to PDF conversions.

### Make Service Scripts Executable

Grant execute permissions to the service management scripts:

```bash
cd /var/www/krutoedemo_g_usr/data/www/dwg.gromi.fi/python_service
sudo chmod +x start_services.sh stop_services.sh
```

### Start Python Services

Launch the Flask API server and Celery workers:

```bash
./start_services.sh
```

This script starts two services:

1. **Flask API Server** (port 5000): Receives conversion requests from the Node.js backend
2. **Celery Worker**: Processes conversion tasks from the Redis queue

Verify the services are running:

```bash
curl http://localhost:5000/health
```

You should receive a JSON response indicating the service is healthy:

```json
{ "status": "healthy", "service": "dwg-converter-api" }
```

## Application Startup

With all components configured, start the main application server.

### Development Mode

For development and testing purposes, start the application in development mode with hot-reloading:

```bash
cd /var/www/krutoedemo_g_usr/data/www/dwg.gromi.fi
pnpm dev
```

The application will be accessible at `http://localhost:3000`. The development server automatically reloads when you make changes to the source code.

### Production Mode

For production deployment, build the application and start it in production mode:

```bash
cd /var/www/krutoedemo_g_usr/data/www/dwg.gromi.fi
pnpm build
pnpm start
```

The production build optimizes the application for performance and removes development-only features.

## Systemd Service Configuration

For production environments, configure the application to run as a systemd service that starts automatically on system boot.

### Create Node.js Service File

Create a systemd service file for the main application:

```bash
sudo nano /etc/systemd/system/dwg-converter.service
```

Add the following configuration:

```ini
[Unit]
Description=DWG to PDF Converter Application
After=network.target mysql.service redis-server.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/krutoedemo_g_usr/data/www/dwg.gromi.fi
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node /var/www/krutoedemo_g_usr/data/www/dwg.gromi.fi/dist/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### Create Python Service Files

Create a systemd service for the Flask API:

```bash
sudo nano /etc/systemd/system/dwg-converter-api.service
```

Add the following configuration:

```ini
[Unit]
Description=DWG Converter Python API
After=network.target redis-server.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/krutoedemo_g_usr/data/www/dwg.gromi.fi/python_service
ExecStart=/usr/bin/python3.11 /var/www/krutoedemo_g_usr/data/www/dwg.gromi.fi/python_service/api_server.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Create a systemd service for the Celery worker:

```bash
sudo nano /etc/systemd/system/dwg-converter-celery.service
```

Add the following configuration:

```ini
[Unit]
Description=DWG Converter Celery Worker
After=network.target redis-server.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/krutoedemo_g_usr/data/www/dwg.gromi.fi/python_service
ExecStart=/usr/bin/celery -A celery_app worker --loglevel=info
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### Enable and Start Services

Reload systemd to recognize the new service files:

```bash
sudo systemctl daemon-reload
```

Enable all services to start automatically on boot:

```bash
sudo systemctl enable dwg-converter.service
sudo systemctl enable dwg-converter-api.service
sudo systemctl enable dwg-converter-celery.service
```

Start all services:

```bash
sudo systemctl start dwg-converter.service
sudo systemctl start dwg-converter-api.service
sudo systemctl start dwg-converter-celery.service
```

Verify all services are running:

```bash
sudo systemctl status dwg-converter.service
sudo systemctl status dwg-converter-api.service
sudo systemctl status dwg-converter-celery.service
```

## Nginx Reverse Proxy Configuration

For production deployments, configure Nginx as a reverse proxy to handle SSL termination and serve the application.

### Install Nginx

Install the Nginx web server:

```bash
sudo apt-get install -y nginx
```

### Configure Nginx Site

Create an Nginx configuration file for the application:

```bash
sudo nano /etc/nginx/sites-available/dwg-converter
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    client_max_body_size 100M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Replace `your-domain.com` with your actual domain name.

Enable the site by creating a symbolic link:

```bash
sudo ln -s /etc/nginx/sites-available/dwg-converter /etc/nginx/sites-enabled/
```

Test the Nginx configuration:

```bash
sudo nginx -t
```

If the test passes, reload Nginx:

```bash
sudo systemctl reload nginx
```

### Configure SSL with Let's Encrypt

Install Certbot for automated SSL certificate management:

```bash
sudo apt-get install -y certbot python3-certbot-nginx
```

Obtain and install an SSL certificate:

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

Follow the prompts to complete the SSL setup. Certbot automatically configures Nginx to use HTTPS and sets up automatic certificate renewal.

## Firewall Configuration

Configure the Ubuntu firewall (UFW) to allow necessary traffic while maintaining security.

Enable UFW if not already enabled:

```bash
sudo ufw enable
```

Allow SSH, HTTP, and HTTPS traffic:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
```

Verify firewall status:

```bash
sudo ufw status
```

## Verification and Testing

Perform comprehensive testing to ensure all components are functioning correctly.

### Test Database Connection

Verify the application can connect to the database:

```bash
cd /var/www/krutoedemo_g_usr/data/www/dwg.gromi.fi
pnpm db:push
```

This command should complete without errors.

### Test Python Service

Test the Python conversion API:

```bash
curl http://localhost:5000/health
```

Expected response:

```json
{ "status": "healthy", "service": "dwg-converter-api" }
```

### Test Application Access

Open a web browser and navigate to your domain or server IP address. You should see the DWG Converter home page with the upload interface.

### Test File Upload

Upload a sample DXF file through the web interface to verify the complete conversion pipeline:

1. Navigate to the home page
2. Click or drag a DXF file to the upload area
3. Click "Convert to PDF"
4. Verify the conversion completes successfully
5. Download and inspect the generated PDF

## Monitoring and Maintenance

Establish monitoring and maintenance procedures to ensure reliable operation.

### View Application Logs

Monitor the main application logs:

```bash
sudo journalctl -u dwg-converter.service -f
```

Monitor Python API logs:

```bash
sudo journalctl -u dwg-converter-api.service -f
```

Monitor Celery worker logs:

```bash
sudo journalctl -u dwg-converter-celery.service -f
```

### Database Backups

Create automated daily database backups:

```bash
sudo nano /usr/local/bin/backup-dwg-db.sh
```

Add the following script:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/dwg-converter"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
mysqldump -u dwg_user -p'your_password_here' dwg_converter | gzip > $BACKUP_DIR/dwg_converter_$DATE.sql.gz
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
```

Make the script executable:

```bash
sudo chmod +x /usr/local/bin/backup-dwg-db.sh
```

Add a cron job to run the backup daily at 2 AM:

```bash
sudo crontab -e
```

Add the following line:

```
0 2 * * * /usr/local/bin/backup-dwg-db.sh
```

### System Updates

Regularly update system packages and dependencies:

```bash
sudo apt-get update
sudo apt-get upgrade -y
```

Update Node.js dependencies:

```bash
cd /var/www/krutoedemo_g_usr/data/www/dwg.gromi.fi
pnpm update
```

Update Python dependencies:

```bash
sudo pip3 install --upgrade ezdxf celery redis pillow reportlab flask
```

## Troubleshooting

Common issues and their solutions are documented below.

### Application Won't Start

**Symptom**: The systemd service fails to start or immediately stops.

**Solution**: Check the service logs for error messages:

```bash
sudo journalctl -u dwg-converter.service -n 50
```

Common causes include:

- Missing or incorrect environment variables in `.env`
- Database connection failures
- Port 3000 already in use by another application

### Conversion Failures

**Symptom**: File uploads succeed but conversions fail or remain in "processing" state indefinitely.

**Solution**: Verify the Python service and Celery worker are running:

```bash
sudo systemctl status dwg-converter-api.service
sudo systemctl status dwg-converter-celery.service
```

Check Python service logs for errors:

```bash
sudo journalctl -u dwg-converter-celery.service -n 50
```

Ensure Redis is running:

```bash
redis-cli ping
```

### Database Connection Errors

**Symptom**: Application logs show "ECONNREFUSED" or "Access denied" errors when connecting to MySQL.

**Solution**: Verify MySQL is running:

```bash
sudo systemctl status mysql
```

Test database credentials:

```bash
mysql -u dwg_user -p dwg_converter
```

If the connection fails, recreate the database user with correct permissions as described in the Database Configuration section.

### High Memory Usage

**Symptom**: System becomes slow or unresponsive due to high memory consumption.

**Solution**: Monitor resource usage:

```bash
htop
```

Limit Celery worker concurrency to reduce memory usage:

Edit `/etc/systemd/system/dwg-converter-celery.service` and modify the ExecStart line:

```ini
ExecStart=/usr/bin/celery -A celery_app worker --loglevel=info --concurrency=2
```

Reload and restart the service:

```bash
sudo systemctl daemon-reload
sudo systemctl restart dwg-converter-celery.service
```

## Security Considerations

Implement the following security best practices for production deployments.

### File Permissions

Ensure proper file ownership and permissions:

```bash
sudo chown -R www-data:www-data /var/www/krutoedemo_g_usr/data/www/dwg.gromi.fi
sudo chmod 600 /var/www/krutoedemo_g_usr/data/www/dwg.gromi.fi/.env
```

### Database Security

- Use strong, unique passwords for all database users
- Restrict database access to localhost only
- Regularly update MySQL to the latest security patches
- Enable MySQL binary logging for point-in-time recovery

### Application Security

- Keep all dependencies updated to patch security vulnerabilities
- Use HTTPS exclusively in production (enforce via Nginx configuration)
- Implement rate limiting to prevent abuse
- Regularly review application logs for suspicious activity

### Firewall Rules

Maintain strict firewall rules that only allow necessary traffic:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
```

## Additional Resources

For further assistance and information, consult the following resources:

- **Project README**: `/var/www/krutoedemo_g_usr/data/www/dwg.gromi.fi/README.md`
- **API Documentation**: Available in the project repository
- **Ubuntu Server Guide**: https://ubuntu.com/server/docs
- **Node.js Documentation**: https://nodejs.org/docs
- **Python Documentation**: https://docs.python.org/3.11/
- **Celery Documentation**: https://docs.celeryq.dev/
- **Nginx Documentation**: https://nginx.org/en/docs/

---

**Installation Complete**: Your DWG to PDF Converter application is now fully installed and configured on Ubuntu. For Windows installation instructions, refer to `INSTALL_WINDOWS.md`.
