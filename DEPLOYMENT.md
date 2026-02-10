# AuditTrail - Airgap Deployment Guide

This guide covers packaging AuditTrail on a build machine with internet access, transferring the package to an airgapped network via USB drive, and deploying the application on the target machine.

## Prerequisites

### Build Machine (internet access required)

- Docker (20.10+)
- Docker Compose (v2+)
- Git
- Bash shell
- Internet access (for building Docker images)

### Target Machine (no internet required)

- Docker (20.10+)
- Docker Compose (v2+)
- Bash shell
- 2GB+ free disk space

## Step 1: Package on Build Machine

1. Clone or access the AuditTrail source code:

   ```bash
   git clone <repository-url>
   cd audittrail
   ```

2. Run the packaging script:

   ```bash
   bash scripts/package-airgap.sh 1.0.0
   ```

   Replace `1.0.0` with your desired version tag. If omitted, the script uses a timestamp.

3. The script will:
   - Build all Docker images from source
   - Export images as a compressed tarball
   - Bundle the compose file, environment template, and deployment scripts
   - Generate SHA256 checksums for integrity verification
   - Create a single file: `audittrail-airgap-1.0.0.tar.gz`

4. Copy the tarball to a USB drive:

   ```bash
   cp audittrail-airgap-1.0.0.tar.gz /media/usb/
   ```

Expected package size: 500MB - 1GB compressed.

## Step 2: Transfer via USB

1. Safely eject the USB drive from the build machine
2. Transport the USB drive to the airgapped network
3. Insert the USB drive into the target machine

## Step 3: Deploy on Target Machine

1. Copy the package from USB to the target machine:

   ```bash
   cp /media/usb/audittrail-airgap-1.0.0.tar.gz ~/
   ```

2. Extract the package:

   ```bash
   tar xzf audittrail-airgap-1.0.0.tar.gz
   ```

3. Enter the deployment directory:

   ```bash
   cd audittrail-airgap-1.0.0
   ```

4. (Recommended) Edit the environment file to set secure passwords:

   ```bash
   nano .env
   ```

   Change at minimum:
   - `SECRET_KEY` -- set to a random string (see instructions in the file)
   - `DB_PASSWORD` -- set to a strong password

5. Run the deployment script:

   ```bash
   ./load.sh
   ```

6. Wait for the "Application is running" message (typically 30-60 seconds)

7. Open a browser and navigate to:

   ```
   http://localhost
   ```

   Or if you changed `APP_PORT` in .env: `http://localhost:<port>`

## Step 4: Verify Deployment

Run the verification script from the deployment directory:

```bash
./verify.sh
```

Expected output: all checks should show PASS.

### Manual Verification

1. Open http://localhost in a browser
2. Log in with the default credentials:
   - Username: `admin`
   - Password: `changeme`
3. Create a new case (click "New Case")
4. Select an audit type and fill in the title
5. Add events to the timeline
6. Verify data persists by refreshing the page

### Persistence Test

```bash
docker compose down
docker compose up -d
# Wait 15 seconds
# Log in again -- your data should still be there
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_USER` | `audittrail` | PostgreSQL username |
| `DB_PASSWORD` | `audittrail` | PostgreSQL password |
| `SECRET_KEY` | `change-me-in-production` | JWT signing key for authentication |
| `APP_PORT` | `80` | HTTP port the application listens on |

To change configuration after deployment:

```bash
# Edit the environment file
nano .env

# Restart the application
docker compose down
docker compose up -d
```

**Security Note:** Always change `SECRET_KEY` and `DB_PASSWORD` from their defaults before using the application with real audit data.

## Operations

### Starting the Application

```bash
docker compose up -d
```

### Stopping the Application

```bash
docker compose down
```

Data is preserved in a Docker volume and will be available when you start again.

### Viewing Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f api
docker compose logs -f db
docker compose logs -f nginx
```

### Backing Up Data

```bash
# Export database to SQL file
docker compose exec db pg_dump -U audittrail audittrail > backup_$(date +%Y%m%d).sql
```

### Restoring Data

```bash
# Restore from SQL backup
docker compose exec -T db psql -U audittrail audittrail < backup_20260210.sql
```

### Updating the Application

1. On the build machine, pull the latest code and re-run packaging:

   ```bash
   git pull
   bash scripts/package-airgap.sh 1.1.0
   ```

2. Transfer the new package via USB

3. On the target machine:

   ```bash
   tar xzf audittrail-airgap-1.1.0.tar.gz
   cd audittrail-airgap-1.1.0
   # Copy your existing .env if you customized it
   cp ../audittrail-airgap-1.0.0/.env .env
   ./load.sh
   ```

   Data is preserved across updates since it lives in the Docker volume.

## Troubleshooting

### "Port 80 already in use"

Another application is using port 80. Change the port:

```bash
# Edit .env and set:
APP_PORT=8080
# Then restart:
docker compose down
docker compose up -d
# Access at http://localhost:8080
```

### "Cannot connect to Docker daemon"

Docker is not running. Start it:

```bash
sudo systemctl start docker
# or on some systems:
sudo service docker start
```

### "Image not found" when starting

Images may not have loaded correctly. Re-run the load:

```bash
gunzip -c images.tar.gz | docker load
docker compose up -d
```

### "Database connection refused"

PostgreSQL may still be initializing. Wait 15-30 seconds and try again:

```bash
docker compose logs db
# Look for "database system is ready to accept connections"
```

### Checksum mismatch during load

Files may have been corrupted during USB transfer:

1. Re-copy the tarball from USB
2. Verify the USB drive is not faulty
3. Try a different USB port

### Application starts but pages don't load

Check the nginx logs:

```bash
docker compose logs nginx
```

Common causes:
- Port conflict (change `APP_PORT`)
- Firewall blocking the port

### Need to reset to factory defaults

Remove all data and start fresh:

```bash
docker compose down -v  # WARNING: This deletes all data!
docker compose up -d
```
