#!/bin/bash

# ==============================================
# Unclassed Docker Deployment Script
# ==============================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default configuration
DEFAULT_INSTANCES=3

echo -e "${BLUE}🚀 Unclassed Docker Deployment${NC}"
echo "==============================================="

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from template...${NC}"
    if [ -f .env.docker ]; then
        cp .env.docker .env
        echo -e "${RED}📝 Please edit .env file with your configuration before continuing!${NC}"
        exit 1
    else
        echo -e "${RED}❌ No .env template found. Please create .env file manually.${NC}"
        exit 1
    fi
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose > /dev/null 2>&1; then
    echo -e "${RED}❌ docker-compose not found. Please install Docker Compose.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker environment ready${NC}"

# Function to deploy with specific number of instances
deploy_with_instances() {
    local count=$1
    echo -e "${BLUE}📦 Building application image...${NC}"
    docker-compose build

    echo -e "${BLUE}🔄 Scaling to ${count} instances...${NC}"
    
    # Generate dynamic compose file for scaling
    cat > docker-compose.override.yml << EOF
version: '3.8'
services:
EOF

    # Add nginx service
    cat >> docker-compose.override.yml << EOF
  nginx:
    depends_on:
EOF
    
    for i in $(seq 1 $count); do
        echo "      - app$i" >> docker-compose.override.yml
    done

    # Add app services
    for i in $(seq 1 $count); do
        cat >> docker-compose.override.yml << EOF
  app$i:
    build: .
    environment:
      - NODE_ENV=production
      - DATABASE_URL=\${DATABASE_URL}
      - APP_BASE_URL=\${APP_BASE_URL}
      - AUTH_SECRET=\${AUTH_SECRET}
      - AUTH_ISSUER_URL=\${AUTH_ISSUER_URL}
      - AUTH_CLIENT_ID=\${AUTH_CLIENT_ID}
      - AUTH_CLIENT_SECRET=\${AUTH_CLIENT_SECRET}
      - AUTH_SCOPES=\${AUTH_SCOPES}
      - AUTH_POST_LOGOUT_REDIRECT_URI=\${AUTH_POST_LOGOUT_REDIRECT_URI}
      - AUTH_TRUST_HOST=\${AUTH_TRUST_HOST}
      - ENABLE_CRON_SCHEDULER=true
      - INSTANCE_ID=app$i
      - CRON_BATCH_MATCHING=\${CRON_BATCH_MATCHING:-*/5 * * * *}
      - CRON_PROVISIONAL_CLEANUP=\${CRON_PROVISIONAL_CLEANUP:-*/30 * * * *}
    restart: unless-stopped
    networks:
      - unclassed-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
EOF
    done

    # Update nginx config for dynamic instances
    echo -e "${BLUE}🌐 Updating nginx configuration for ${count} instances...${NC}"
    
    # Generate nginx upstream config
    cat > nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream app_backend {
EOF
    
    for i in $(seq 1 $count); do
        echo "        server app$i:3000 max_fails=3 fail_timeout=30s;" >> nginx.conf
    done
    
    cat >> nginx.conf << 'EOF'
        keepalive 32;
    }

    # Rate limiting (optional)
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=general:10m rate=30r/s;

    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;

    server {
        listen 80;
        server_name _; # Accept any server name

        # Basic security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";

        # Health check endpoint
        location /health {
            access_log off;
            return 200 "OK\n";
            add_header Content-Type text/plain;
        }

        # API routes with rate limiting
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            
            proxy_pass http://app_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            
            proxy_connect_timeout 10s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }

        # Static assets with caching
        location /static/ {
            proxy_pass http://app_backend;
            proxy_cache_valid 200 1d;
            add_header Cache-Control "public, immutable";
        }

        location /_next/static/ {
            proxy_pass http://app_backend;
            proxy_cache_valid 200 1y;
            add_header Cache-Control "public, immutable";
        }

        # All other requests
        location / {
            limit_req zone=general burst=50 nodelay;
            
            proxy_pass http://app_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            
            proxy_connect_timeout 10s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }
    }
}
EOF

    echo -e "${BLUE}🚀 Starting deployment...${NC}"
    docker-compose up -d

    echo -e "${GREEN}✅ Deployment completed!${NC}"
    echo "==============================================="
    echo "🌐 Application: http://localhost:8080"
    echo -e "📊 Instances: ${GREEN}${count}${NC}"
    echo -e "🔧 Management: ${BLUE}docker-compose logs -f${NC}"
}

# Function to show status
show_status() {
    echo -e "${BLUE}📊 Current Status${NC}"
    echo "==============================================="
    docker-compose ps
    echo ""
    echo -e "${BLUE}📈 Resource Usage${NC}"
    docker stats --no-stream
}

# Function to show logs
show_logs() {
    docker-compose logs -f
}

# Function to scale instances
scale_instances() {
    local new_count=$1
    echo -e "${YELLOW}🔄 Scaling to ${new_count} instances...${NC}"
    deploy_with_instances $new_count
}

# Main deployment logic
case "${1:-deploy}" in
    "deploy")
        INSTANCES=${2:-$DEFAULT_INSTANCES}
        deploy_with_instances $INSTANCES
        ;;
    "scale")
        if [ -z "$2" ]; then
            echo -e "${RED}❌ Please specify number of instances: ./deploy.sh scale 5${NC}"
            exit 1
        fi
        scale_instances $2
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs
        ;;
    "stop")
        echo -e "${YELLOW}🛑 Stopping all services...${NC}"
        docker-compose down
        ;;
    "restart")
        echo -e "${BLUE}🔄 Restarting all services...${NC}"
        docker-compose restart
        ;;
    "clean")
        echo -e "${RED}🧹 Cleaning up containers and images...${NC}"
        docker-compose down -v --rmi all
        ;;
    *)
        echo -e "${BLUE}🚀 Unclassed Deployment Script${NC}"
        echo "Usage: $0 [command] [options]"
        echo ""
        echo "Commands:"
        echo "  deploy [instances]  Deploy with N instances (default: 3)"
        echo "  scale <instances>   Scale to N instances"
        echo "  status             Show current status"
        echo "  logs               Show logs"
        echo "  restart            Restart all services"
        echo "  stop               Stop all services"
        echo "  clean              Remove all containers and images"
        echo ""
        echo "Examples:"
        echo "  $0 deploy 5        # Deploy with 5 instances"
        echo "  $0 scale 2         # Scale to 2 instances"
        echo "  $0 status          # Check status"
        ;;
esac
