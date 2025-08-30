# 🚀 LifeBox IoT Platform - VPS Production Deployment Guide

## 📋 **Prerequisites**

- Ubuntu 20.04+ VPS with root access
- VPS IP: **72.60.34.28**
- Domain name (optional): **lifebox-iot.com**
- At least 4GB RAM and 20GB storage

---

## 🎯 **Step-by-Step VPS Deployment**

### **Step 1: Connect to Your VPS**

```bash
ssh root@72.60.34.28
# Enter your VPS password
```

### **Step 2: Clone the Repository**

```bash
# Install git if not present
apt update && apt install -y git

# Clone the production-ready repository
git clone https://github.com/abdelrahman727/lifebox-platform.git
cd lifebox-platform
```

### **Step 3: Copy Production Environment**

```bash
# Copy production environment file
cp .env.production .env

# The .env file is already configured for your VPS IP: 72.60.34.28
# All integrations are pre-configured and ready
```

### **Step 4: Run Automated Deployment**

```bash
# Make deployment script executable
chmod +x scripts/deploy-production-vps.sh

# Run the automated deployment script
sudo ./scripts/deploy-production-vps.sh
```

**The script will automatically:**

- ✅ Install Docker and Docker Compose
- ✅ Configure firewall (UFW) with proper ports
- ✅ Start PostgreSQL + TimescaleDB
- ✅ Start EMQX MQTT broker
- ✅ Deploy NestJS API
- ✅ Deploy MQTT ingestion service
- ✅ Run database migrations
- ✅ Seed initial data
- ✅ Setup log rotation and monitoring

### **Step 5: Verify Deployment**

```bash
# Check all services are running
docker ps

  export DATABASE_URL="postgresql://lifebox_prod:LifeBox2024ProductionDB%23Strong@localhost:5432/lifebox_production"

# Check service logs
docker compose -f infrastructure/docker/docker-compose.production.yml logs

# Test API health
curl http://localhost:3000/api/v1/health
```

## export DATABASE_URL="postgresql://lifebox_prod:LifeBox2024ProductionDB#Strong@localhost:5432/lifebox_production"

## 🔌 **Access Your Platform**

### **Service URLs**

| **Service**           | **URL**                               | **Credentials**                          |
| --------------------- | ------------------------------------- | ---------------------------------------- |
| **API Documentation** | http://72.60.34.28:3000/api/docs      | -                                        |
| **EMQX Dashboard**    | http://72.60.34.28:18083              | admin / LifeBoxEMQX2024Production#Strong |
| **API Health Check**  | http://72.60.34.28:3000/api/v1/health | -                                        |

### **MQTT Connection Details**

- **Host**: 72.60.34.28
- **Port**: 1883
- **Username**: lifebox_mqtt_prod
- **Password**: LifeBoxMQTT2024Production#Strong

---

## 🧪 **Test Your Integrations**

### **1. Test MQTT Integration**

```bash
# Install MQTT client for testing
apt install -y mosquitto-clients

# Test MQTT connection
mosquitto_pub -h 72.60.34.28 -p 1883 -u lifebox_mqtt_prod -P "LifeBoxMQTT2024Production#Strong" -t "devices/TEST001/telemetry" -m '{"motor_speed_value": 1500, "pump_voltage_value": 220, "pump_current_value": 5.2}'

# Check if telemetry was received
curl http://72.60.34.28:3000/api/v1/telemetry/recent
```

### **2. Test Fawry Payment Integration**

```bash
# Test Fawry payment endpoint
curl -X POST http://72.60.34.28:3000/api/v1/payment/fawry/charge \
  -H "Content-Type: application/json" \
  -d '{"amount": 100, "clientId": "test-client", "description": "Test payment"}'
```

### **3. Test SMS Integration**

```bash
# Test SMS routing (Egyptian number via Vodafone)
curl -X POST http://72.60.34.28:3000/api/v1/notifications/sms/send \
  -H "Content-Type: application/json" \
  -d '{"to": "+201012345678", "message": "LifeBox test SMS - Egyptian number"}'

# Test SMS routing (International number via Twilio)
curl -X POST http://72.60.34.28:3000/api/v1/notifications/sms/send \
  -H "Content-Type: application/json" \
  -d '{"to": "+14155552671", "message": "LifeBox test SMS - International number"}'
```

---

## 🔧 **Service Management Commands**

### **Start/Stop Platform**

```bash
# Start all services
sudo systemctl start lifebox-platform

# Stop all services
sudo systemctl stop lifebox-platform

# Restart services
sudo systemctl restart lifebox-platform

# Check service status
sudo systemctl status lifebox-platform
```

### **Manual Docker Commands**

```bash
cd /opt/lifebox-platform

# Start services manually
docker compose -f infrastructure/docker/docker-compose.production.yml up -d

# Stop services
docker compose -f infrastructure/docker/docker-compose.production.yml down

# View logs
docker compose -f infrastructure/docker/docker-compose.production.yml logs -f

# Restart specific service
docker compose -f infrastructure/docker/docker-compose.production.yml restart lifebox-api
```

### **Database Operations**

```bash
# Connect to database
docker exec -it lifebox-postgres psql -U lifebox_prod -d lifebox_production

# Run migrations
docker exec lifebox-api npm run db:migrate:deploy

# Seed data
docker exec lifebox-api npm run db:seed

# Backup database
docker exec lifebox-postgres pg_dump -U lifebox_prod lifebox_production > backup_$(date +%Y%m%d_%H%M%S).sql
```

---

## 🎯 **Default Admin Access**

### **System Login**

- **Email**: admin@lifebox.com
- **Password**: secret
- **Role**: Super User (full access)

### **API Admin Token**

- **Token**: LifeBox2024AdminAPI#Token#Production#Strong#Random
- **Usage**: Authorization: Bearer TOKEN

---

## 🛡️ **Security Configuration**

### **Firewall Ports (Auto-configured)**

- ✅ **22/tcp**: SSH access
- ✅ **80/tcp**: HTTP (for SSL setup)
- ✅ **443/tcp**: HTTPS
- ✅ **1883/tcp**: MQTT broker
- ✅ **8883/tcp**: MQTT over SSL
- ✅ **18083/tcp**: EMQX dashboard

### **SSL Setup (Optional)**

If you have a domain, configure SSL:

```bash
# Install certbot
apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
certbot --standalone -d lifebox-iot.com

# Auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
```

---

## 📊 **Monitoring & Logs**

### **Service Logs**

```bash
# All services
docker compose logs -f

# Specific service
docker logs lifebox-api -f
docker logs lifebox-emqx -f
docker logs lifebox-postgres -f
```

### **System Monitoring**

```bash
# Check system resources
htop

# Check disk usage
df -h

# Check Docker stats
docker stats
```

---

## ✅ **Recent Fixes Applied**

### **Production Issues Resolved (August 2025)**

All critical deployment issues have been resolved:

- ✅ **Package.json syntax errors** - Fixed JSON formatting from deployment scripts
- ✅ **Docker build configuration** - Updated Dockerfile for proper script handling  
- ✅ **Husky production configuration** - Added production environment detection
- ✅ **Monorepo dependency linking** - Fixed workspace module resolution
- ✅ **TypeScript build errors** - Fixed null-safety issues in MQTT service
- ✅ **Next.js configuration** - Removed disallowed NODE_ENV from env config

**Result**: Backend services (API, MQTT, Database) are 100% production ready for VPS deployment.

---

## 🚨 **Troubleshooting**

### **Common Issues & Solutions**

#### **Services Won't Start**

```bash
# Check if ports are available
netstat -tlnp | grep :3000
netstat -tlnp | grep :1883

# Check Docker logs
docker compose logs lifebox-api
docker compose logs lifebox-emqx
```

#### **Database Connection Issues**

```bash
# Check database container
docker logs lifebox-postgres

# Test database connection
docker exec lifebox-postgres pg_isready -U lifebox_prod
```

#### **MQTT Connection Issues**

```bash
# Check EMQX logs
docker logs lifebox-emqx

# Test MQTT without auth
mosquitto_pub -h 72.60.34.28 -p 1883 -t "test/topic" -m "test message"
```

---

## 📞 **Support & Maintenance**

### **Regular Maintenance**

```bash
# Run backup script (created automatically)
/opt/lifebox-platform/scripts/maintenance/backup.sh

# Update platform (created automatically)
/opt/lifebox-platform/scripts/maintenance/update.sh
```

### **Log Files**

- **Application**: Docker container logs
- **System**: `/var/log/syslog`
- **Nginx**: `/var/log/nginx/`

---

## ✅ **Deployment Success Checklist**

After deployment, verify:

- [ ] All Docker containers running (`docker ps`)
- [ ] API health check passes (`curl http://72.60.34.28:3000/api/v1/health`)
- [ ] EMQX dashboard accessible (http://72.60.34.28:18083)
- [ ] MQTT test message works
- [ ] Database migrations completed
- [ ] Admin login works (admin@lifebox.com / secret)

---

## 🎉 **Your Platform is Production Ready!**

**VPS IP**: 72.60.34.28  
**API Docs**: http://72.60.34.28:3000/api/docs  
**MQTT Broker**: 72.60.34.28:1883  
**EMQX Dashboard**: http://72.60.34.28:18083

All three integrations (MQTT, Fawry, SMS) are configured and ready for testing!
