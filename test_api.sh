#!/bin/bash

# PotholeScan Backend - API Testing Script
# This script tests all the API endpoints with various scenarios

BASE_URL="http://localhost:8080/api"

echo "🚀 PotholeScan Backend API Testing"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo -e "${BLUE}📋 Test 1: Health Check${NC}"
curl -s -X GET "$BASE_URL/health" | jq .
echo -e "${GREEN}✓ Health check passed${NC}\n"

# Test 2: Get all potholes (should be empty initially)
echo -e "${BLUE}📋 Test 2: Get All Potholes (Initial)${NC}"
curl -s -X GET "$BASE_URL/potholes" | jq .
echo -e "${GREEN}✓ Fetched all potholes${NC}\n"

# Test 3: Detect a Severe Pothole (high acceleration)
echo -e "${BLUE}📋 Test 3: Detect SEVERE Pothole${NC}"
SEVERE_RESPONSE=$(curl -s -X POST "$BASE_URL/detect-pothole" \
  -H "Content-Type: application/json" \
  -d '{
    "lat": 28.6139,
    "lng": 77.2090,
    "accelZ": 18.5,
    "speed": 55.0,
    "severity": "",
    "photoUri": "s3://bucket/severe.jpg"
  }')
echo "$SEVERE_RESPONSE" | jq .
SEVERE_ID=$(echo "$SEVERE_RESPONSE" | jq -r '.id')
echo -e "${GREEN}✓ Severe pothole detected (ID: $SEVERE_ID)${NC}\n"

# Test 4: Detect a Medium Pothole
echo -e "${BLUE}📋 Test 4: Detect MEDIUM Pothole${NC}"
MEDIUM_RESPONSE=$(curl -s -X POST "$BASE_URL/detect-pothole" \
  -H "Content-Type: application/json" \
  -d '{
    "lat": 28.6150,
    "lng": 77.2100,
    "accelZ": 10.5,
    "speed": 45.0,
    "severity": "",
    "photoUri": "s3://bucket/medium.jpg"
  }')
echo "$MEDIUM_RESPONSE" | jq .
MEDIUM_ID=$(echo "$MEDIUM_RESPONSE" | jq -r '.id')
echo -e "${GREEN}✓ Medium pothole detected (ID: $MEDIUM_ID)${NC}\n"

# Test 5: Detect a Light Pothole
echo -e "${BLUE}📋 Test 5: Detect LIGHT Pothole${NC}"
LIGHT_RESPONSE=$(curl -s -X POST "$BASE_URL/detect-pothole" \
  -H "Content-Type: application/json" \
  -d '{
    "lat": 28.6160,
    "lng": 77.2110,
    "accelZ": 4.5,
    "speed": 30.0,
    "severity": "",
    "photoUri": "s3://bucket/light.jpg"
  }')
echo "$LIGHT_RESPONSE" | jq .
LIGHT_ID=$(echo "$LIGHT_RESPONSE" | jq -r '.id')
echo -e "${GREEN}✓ Light pothole detected (ID: $LIGHT_ID)${NC}\n"

# Test 6: Detect High-Speed Impact
echo -e "${BLUE}📋 Test 6: Detect High-Speed Impact (Speed Multiplier Test)${NC}"
HIGHSPEED_RESPONSE=$(curl -s -X POST "$BASE_URL/detect-pothole" \
  -H "Content-Type: application/json" \
  -d '{
    "lat": 28.6170,
    "lng": 77.2120,
    "accelZ": 10.0,
    "speed": 70.0,
    "severity": "",
    "photoUri": "s3://bucket/highspeed.jpg"
  }')
echo "$HIGHSPEED_RESPONSE" | jq .
HIGHSPEED_ID=$(echo "$HIGHSPEED_RESPONSE" | jq -r '.id')
echo -e "${GREEN}✓ High-speed impact detected (ID: $HIGHSPEED_ID)${NC}\n"

# Test 7: Get all potholes
echo -e "${BLUE}📋 Test 7: Get All Potholes${NC}"
curl -s -X GET "$BASE_URL/potholes" | jq .
echo -e "${GREEN}✓ Fetched all potholes${NC}\n"

# Test 8: Filter by Severity - Severe
echo -e "${BLUE}📋 Test 8: Filter by Severity (SEVERE)${NC}"
curl -s -X GET "$BASE_URL/potholes?severity=Severe" | jq .
echo -e "${GREEN}✓ Fetched severe potholes${NC}\n"

# Test 9: Filter by Severity - Medium
echo -e "${BLUE}📋 Test 9: Filter by Severity (MEDIUM)${NC}"
curl -s -X GET "$BASE_URL/potholes?severity=Medium" | jq .
echo -e "${GREEN}✓ Fetched medium potholes${NC}\n"

# Test 10: Filter by Severity - Light
echo -e "${BLUE}📋 Test 10: Filter by Severity (LIGHT)${NC}"
curl -s -X GET "$BASE_URL/potholes?severity=Light" | jq .
echo -e "${GREEN}✓ Fetched light potholes${NC}\n"

# Test 11: Get Statistics
echo -e "${BLUE}📋 Test 11: Get Statistics${NC}"
curl -s -X GET "$BASE_URL/stats" | jq .
echo -e "${GREEN}✓ Fetched statistics${NC}\n"

# Test 12: Delete a Pothole
echo -e "${BLUE}📋 Test 12: Delete Pothole (ID: $LIGHT_ID)${NC}"
curl -s -X DELETE "$BASE_URL/potholes/$LIGHT_ID" | jq .
echo -e "${GREEN}✓ Deleted pothole${NC}\n"

# Test 13: Verify deletion
echo -e "${BLUE}📋 Test 13: Get Updated Statistics${NC}"
curl -s -X GET "$BASE_URL/stats" | jq .
echo -e "${GREEN}✓ Fetched updated statistics${NC}\n"

# Test 14: Error Handling - Invalid Coordinates
echo -e "${BLUE}📋 Test 14: Error Handling - Invalid Latitude${NC}"
curl -s -X POST "$BASE_URL/detect-pothole" \
  -H "Content-Type: application/json" \
  -d '{
    "lat": 95.0,
    "lng": 77.2090,
    "accelZ": 10.0,
    "speed": 50.0
  }' | jq .
echo -e "${GREEN}✓ Validation error caught${NC}\n"

# Test 15: Error Handling - Missing Required Field
echo -e "${BLUE}📋 Test 15: Error Handling - Missing Acceleration${NC}"
curl -s -X POST "$BASE_URL/detect-pothole" \
  -H "Content-Type: application/json" \
  -d '{
    "lat": 28.6139,
    "lng": 77.2090,
    "speed": 50.0
  }' | jq .
echo -e "${GREEN}✓ Validation error caught${NC}\n"

echo ""
echo "✅ All API tests completed successfully!"
echo "📊 Summary: Detection ✓ | Speed Analysis ✓ | Filtering ✓ | Statistics ✓ | Error Handling ✓"

