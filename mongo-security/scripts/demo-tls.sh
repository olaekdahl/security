#!/usr/bin/env bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       MongoDB TLS/SSL Encryption Demo                     ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

CERT_DIR="./certs"

# Step 1: Generate certificates
echo -e "${YELLOW}Step 1: Generating self-signed certificates for TLS${NC}"
echo ""

mkdir -p "$CERT_DIR"

# Generate CA certificate
if [ ! -f "$CERT_DIR/ca.pem" ]; then
  echo -e "${BLUE}Creating Certificate Authority (CA)...${NC}"
  openssl genrsa -out "$CERT_DIR/ca-key.pem" 4096 2>/dev/null
  openssl req -new -x509 -days 365 -key "$CERT_DIR/ca-key.pem" \
    -out "$CERT_DIR/ca.pem" \
    -subj "/CN=MongoDB-Demo-CA/O=Demo/C=US" 2>/dev/null
  echo -e "${GREEN}✓ CA certificate created${NC}"
fi

# Generate server certificate
if [ ! -f "$CERT_DIR/server.pem" ]; then
  echo -e "${BLUE}Creating server certificate...${NC}"
  
  # Create config for SAN
  cat > "$CERT_DIR/server.cnf" << EOF
[req]
default_bits = 4096
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
CN = mongo-tls
O = Demo
C = US

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = mongo-tls
DNS.2 = localhost
IP.1 = 127.0.0.1
EOF

  openssl genrsa -out "$CERT_DIR/server-key.pem" 4096 2>/dev/null
  openssl req -new -key "$CERT_DIR/server-key.pem" \
    -out "$CERT_DIR/server.csr" \
    -config "$CERT_DIR/server.cnf" 2>/dev/null
  openssl x509 -req -days 365 \
    -in "$CERT_DIR/server.csr" \
    -CA "$CERT_DIR/ca.pem" \
    -CAkey "$CERT_DIR/ca-key.pem" \
    -CAcreateserial \
    -out "$CERT_DIR/server-cert.pem" \
    -extensions v3_req \
    -extfile "$CERT_DIR/server.cnf" 2>/dev/null
  
  # Combine key and cert for MongoDB
  cat "$CERT_DIR/server-key.pem" "$CERT_DIR/server-cert.pem" > "$CERT_DIR/server.pem"
  echo -e "${GREEN}✓ Server certificate created${NC}"
fi

# Generate client certificate
if [ ! -f "$CERT_DIR/client.pem" ]; then
  echo -e "${BLUE}Creating client certificate...${NC}"
  openssl genrsa -out "$CERT_DIR/client-key.pem" 4096 2>/dev/null
  openssl req -new -key "$CERT_DIR/client-key.pem" \
    -out "$CERT_DIR/client.csr" \
    -subj "/CN=mongo-client/O=Demo/C=US" 2>/dev/null
  openssl x509 -req -days 365 \
    -in "$CERT_DIR/client.csr" \
    -CA "$CERT_DIR/ca.pem" \
    -CAkey "$CERT_DIR/ca-key.pem" \
    -CAcreateserial \
    -out "$CERT_DIR/client-cert.pem" 2>/dev/null
  
  cat "$CERT_DIR/client-key.pem" "$CERT_DIR/client-cert.pem" > "$CERT_DIR/client.pem"
  echo -e "${GREEN}✓ Client certificate created${NC}"
fi

echo ""
echo -e "${GREEN}All certificates generated in ${CERT_DIR}/${NC}"
echo ""

# Show certificate info
echo -e "${YELLOW}Step 2: Viewing certificate details${NC}"
echo ""
echo -e "${BLUE}CA Certificate:${NC}"
openssl x509 -in "$CERT_DIR/ca.pem" -noout -subject -dates
echo ""
echo -e "${BLUE}Server Certificate:${NC}"
openssl x509 -in "$CERT_DIR/server-cert.pem" -noout -subject -dates
echo ""

# Show usage instructions
echo -e "${YELLOW}Step 3: How to use TLS with MongoDB${NC}"
echo ""
echo -e "${BLUE}To start MongoDB with TLS, use the docker-compose tls profile:${NC}"
echo "  docker compose --profile tls up -d"
echo ""
echo -e "${BLUE}MongoDB connection string with TLS:${NC}"
echo '  mongodb://admin:password@localhost:27017/?tls=true&tlsCAFile=/certs/ca.pem'
echo ""
echo -e "${BLUE}To connect with mongosh:${NC}"
echo '  docker exec -it mongo-tls mongosh \\'
echo '    "mongodb://admin:ChangeMe_LongRandom@localhost:27017/admin" \\'
echo '    --tls --tlsCAFile /certs/ca.pem'
echo ""

# Summary
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║             TLS Protection Summary                        ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}What TLS/SSL provides:${NC}"
echo "  • Encryption in transit - data encrypted between client and server"
echo "  • Server authentication - verify you're connecting to the right server"
echo "  • Client authentication (mTLS) - server verifies client identity"
echo "  • Protection against MITM attacks"
echo ""
echo -e "${YELLOW}Without TLS:${NC}"
echo "  ❌ Credentials sent in plaintext"
echo "  ❌ Data can be intercepted and read"
echo "  ❌ Vulnerable to man-in-the-middle attacks"
echo ""
echo -e "${GREEN}With TLS:${NC}"
echo "  ✓ All traffic encrypted"
echo "  ✓ Certificate verification prevents impersonation"
echo "  ✓ Required for compliance (PCI-DSS, HIPAA, etc.)"
echo ""
