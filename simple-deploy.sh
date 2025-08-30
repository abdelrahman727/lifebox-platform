#!/bin/bash

set -e

echo "🚀 LifeBox Simple Deployment for VPS 72.60.34.28"

# Start PostgreSQL
echo "📊 Starting PostgreSQL..."
docker run -d \
  --name lifebox-postgres \
  --restart unless-stopped \
  -p 5432:5432 \
  -e POSTGRES_DB=lifebox_production \
  -e POSTGRES_USER=lifebox_prod \
  -e POSTGRES_PASSWORD=LifeBox2024ProductionDB#Strong \
  -v lifebox_postgres_data:/var/lib/postgresql/data \
  timescale/timescaledb-ha:pg15-latest

# Wait for PostgreSQL
echo "⏳ Waiting for PostgreSQL..."
sleep 15

# Start EMQX MQTT Broker
echo "📡 Starting EMQX MQTT Broker..."
docker run -d \
  --name lifebox-emqx \
  --restart unless-stopped \
  -p 1883:1883 \
  -p 8083:8083 \
  -p 8084:8084 \
  -p 8883:8883 \
  -p 18083:18083 \
  -e EMQX_HOST=72.60.34.28 \
  -e EMQX_DASHBOARD__DEFAULT_USERNAME=admin \
  -e EMQX_DASHBOARD__DEFAULT_PASSWORD=LifeBoxEMQX2024Production#Strong \
  -v lifebox_emqx_data:/opt/emqx/data \
  -v lifebox_emqx_log:/opt/emqx/log \
  emqx/emqx:5.4.1

# Wait for EMQX
echo "⏳ Waiting for EMQX..."
sleep 10

# Start API with simple Node.js (no Docker build issues)
echo "🔧 Starting API..."
cd apps/api
npm install --production
nohup npm run start:prod > /var/log/lifebox-api.log 2>&1 &
echo $! > /var/run/lifebox-api.pid

# Start MQTT Ingestion
echo "📡 Starting MQTT Ingestion..."
cd ../mqtt-ingestion
npm install --production
npm run build
nohup npm start > /var/log/lifebox-mqtt.log 2>&1 &
echo $! > /var/run/lifebox-mqtt.pid

echo "✅ Deployment Complete!"
echo ""
echo "🌐 Services:"
echo "  - API: http://72.60.34.28:3000"
echo "  - API Docs: http://72.60.34.28:3000/api/docs"
echo "  - EMQX Dashboard: http://72.60.34.28:18083"
echo "  - MQTT Broker: 72.60.34.28:1883"
echo ""
echo "🔐 EMQX Credentials:"
echo "  - Username: admin"
echo "  - Password: LifeBoxEMQX2024Production#Strong"
echo ""
echo "📊 Database:"
echo "  - Host: localhost:5432"
echo "  - Database: lifebox_production"
echo "  - User: lifebox_prod"
echo ""