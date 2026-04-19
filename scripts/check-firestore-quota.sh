#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════════
# Check Firestore Quota Usage
# ═══════════════════════════════════════════════════════════════════════════════
# 
# This script checks Firestore quota usage and provides recommendations
# for optimization if quota is exhausted.
#
# USAGE:
#   ./scripts/check-firestore-quota.sh
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Firestore Quota Check${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Get current Firebase project
CURRENT_PROJECT=$(firebase use 2>&1 | grep "Active Project" | awk '{print $3}' || echo "")

if [ -z "$CURRENT_PROJECT" ]; then
    echo -e "${RED}❌ No Firebase project selected${NC}"
    echo -e "${YELLOW}Run: firebase use <project-id>${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Project: ${CURRENT_PROJECT}${NC}"
echo ""

echo -e "${BLUE}📊 Firestore Quota Information:${NC}"
echo ""
echo -e "${YELLOW}Free Tier (Spark Plan):${NC}"
echo "  • Reads: 50,000 per day"
echo "  • Writes: 20,000 per day"
echo "  • Deletes: 20,000 per day"
echo "  • Storage: 1 GB"
echo ""
echo -e "${YELLOW}Blaze Plan (Pay-as-you-go):${NC}"
echo "  • Reads: \$0.06 per 100,000 documents"
echo "  • Writes: \$0.18 per 100,000 documents"
echo "  • Deletes: \$0.02 per 100,000 documents"
echo "  • Storage: \$0.18 per GB/month"
echo ""

echo -e "${BLUE}🔍 Check your current usage:${NC}"
echo -e "${BLUE}https://console.firebase.google.com/project/${CURRENT_PROJECT}/usage${NC}"
echo ""

echo -e "${YELLOW}⚠️  Common Causes of Quota Exhaustion:${NC}"
echo ""
echo "1. Missing Indexes"
echo "   → Deploy indexes: ./scripts/deploy-firestore-indexes.sh"
echo ""
echo "2. Inefficient Queries"
echo "   → Use pagination (limit + startAfter)"
echo "   → Add proper where() filters"
echo "   → Avoid fetching entire collections"
echo ""
echo "3. Excessive Polling"
echo "   → Use onSnapshot() instead of repeated get()"
echo "   → Implement exponential backoff"
echo "   → Cache results when possible"
echo ""
echo "4. Development/Testing"
echo "   → Use Firebase Emulator Suite for local development"
echo "   → Limit test data size"
echo "   → Clean up test data after tests"
echo ""

echo -e "${GREEN}💡 Optimization Recommendations:${NC}"
echo ""
echo "1. Enable Firebase Emulator for local development:"
echo "   firebase emulators:start"
echo ""
echo "2. Review query patterns in backend/src/database/"
echo ""
echo "3. Implement caching layer (Redis)"
echo ""
echo "4. Monitor usage with Firebase Console"
echo ""
echo "5. Consider upgrading to Blaze plan for production"
echo ""

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
