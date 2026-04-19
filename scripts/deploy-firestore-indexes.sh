#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════════
# Deploy Firestore Indexes
# ═══════════════════════════════════════════════════════════════════════════════
# 
# This script deploys Firestore indexes defined in firestore.indexes.json
# to the Firebase project.
#
# PREREQUISITES:
# - Firebase CLI installed: npm install -g firebase-tools
# - Authenticated: firebase login
# - Project configured: firebase use <project-id>
#
# USAGE:
#   ./scripts/deploy-firestore-indexes.sh
# ═══════════════════════════════════════════════════════════════════════════════

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Firestore Indexes Deployment${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}❌ Firebase CLI not found${NC}"
    echo -e "${YELLOW}Install with: npm install -g firebase-tools${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Firebase CLI found${NC}"

# Check if firestore.indexes.json exists
if [ ! -f "$PROJECT_ROOT/firestore.indexes.json" ]; then
    echo -e "${RED}❌ firestore.indexes.json not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ firestore.indexes.json found${NC}"

# Get current Firebase project
CURRENT_PROJECT=$(firebase use 2>&1 | grep "Active Project" | awk '{print $3}' || echo "")

if [ -z "$CURRENT_PROJECT" ]; then
    echo -e "${RED}❌ No Firebase project selected${NC}"
    echo -e "${YELLOW}Run: firebase use <project-id>${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Current project: ${CURRENT_PROJECT}${NC}"
echo ""

# Confirm deployment
echo -e "${YELLOW}⚠️  This will deploy indexes to: ${CURRENT_PROJECT}${NC}"
read -p "Continue? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Deployment cancelled${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}Deploying Firestore indexes...${NC}"

# Deploy indexes
if firebase deploy --only firestore:indexes; then
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}✅ Firestore indexes deployed successfully${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${BLUE}📊 View indexes in Firebase Console:${NC}"
    echo -e "${BLUE}https://console.firebase.google.com/project/${CURRENT_PROJECT}/firestore/indexes${NC}"
    echo ""
    echo -e "${YELLOW}⏳ Note: Index creation may take several minutes${NC}"
    echo -e "${YELLOW}   Monitor progress in the Firebase Console${NC}"
else
    echo ""
    echo -e "${RED}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${RED}❌ Failed to deploy Firestore indexes${NC}"
    echo -e "${RED}═══════════════════════════════════════════════════════════════${NC}"
    exit 1
fi
