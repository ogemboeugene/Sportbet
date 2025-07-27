#!/bin/bash

# Load Testing Script for Sportbet Platform
# This script performs comprehensive load testing on all major API endpoints

set -e

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3001}"
CONCURRENT_USERS="${CONCURRENT_USERS:-50}"
TEST_DURATION="${TEST_DURATION:-300}"
RAMP_UP_TIME="${RAMP_UP_TIME:-60}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

# Check dependencies
check_dependencies() {
    log "Checking dependencies..."
    
    if ! command -v curl &> /dev/null; then
        error "curl is required but not installed"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        error "jq is required but not installed"
        exit 1
    fi
    
    if ! command -v ab &> /dev/null && ! command -v wrk &> /dev/null; then
        error "Either Apache Bench (ab) or wrk is required for load testing"
        exit 1
    fi
    
    log "Dependencies check passed"
}

# Create test user
create_test_user() {
    log "Creating test user..."
    
    local email="loadtest$(date +%s)@example.com"
    local password="LoadTest123!"
    
    local response=$(curl -s -X POST "${BASE_URL}/api/auth/register" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"${email}\",
            \"password\": \"${password}\",
            \"firstName\": \"Load\",
            \"lastName\": \"Test\",
            \"country\": \"Kenya\"
        }")
    
    if echo "$response" | jq -e '.tokens.accessToken' > /dev/null; then
        TEST_TOKEN=$(echo "$response" | jq -r '.tokens.accessToken')
        TEST_USER_ID=$(echo "$response" | jq -r '.user.id')
        log "Test user created successfully"
        return 0
    else
        error "Failed to create test user: $response"
        return 1
    fi
}

# Health check
health_check() {
    log "Performing health check..."
    
    local response=$(curl -s -w "%{http_code}" -o /tmp/health_response "${BASE_URL}/api/health")
    
    if [ "$response" = "200" ]; then
        log "Health check passed"
        return 0
    else
        error "Health check failed with status: $response"
        cat /tmp/health_response
        return 1
    fi
}

# Load test authentication endpoints
test_auth_endpoints() {
    log "Testing authentication endpoints..."
    
    # Test registration endpoint
    if command -v wrk &> /dev/null; then
        log "Testing registration with wrk..."
        wrk -t4 -c20 -d30s -s scripts/register.lua "${BASE_URL}/api/auth/register"
    elif command -v ab &> /dev/null; then
        log "Testing registration with Apache Bench..."
        ab -n 1000 -c 10 -p test-data/register.json -T "application/json" "${BASE_URL}/api/auth/register"
    fi
    
    # Test login endpoint
    if command -v wrk &> /dev/null; then
        log "Testing login with wrk..."
        wrk -t4 -c20 -d30s -s scripts/login.lua "${BASE_URL}/api/auth/login"
    elif command -v ab &> /dev/null; then
        log "Testing login with Apache Bench..."
        ab -n 1000 -c 10 -p test-data/login.json -T "application/json" "${BASE_URL}/api/auth/login"
    fi
}

# Load test betting endpoints
test_betting_endpoints() {
    log "Testing betting endpoints..."
    
    if [ -z "$TEST_TOKEN" ]; then
        error "No test token available for betting tests"
        return 1
    fi
    
    # Add funds first
    curl -s -X POST "${BASE_URL}/api/wallet/add-funds" \
        -H "Authorization: Bearer ${TEST_TOKEN}" \
        -H "Content-Type: application/json" \
        -d '{"amount": 1000, "paymentMethod": "test", "currency": "USD"}' > /dev/null
    
    # Test bet placement
    if command -v wrk &> /dev/null; then
        log "Testing bet placement with wrk..."
        export TEST_TOKEN
        wrk -t4 -c10 -d60s -s scripts/place-bet.lua "${BASE_URL}/api/betting/place-bet"
    elif command -v ab &> /dev/null; then
        log "Testing bet placement with Apache Bench..."
        ab -n 500 -c 5 \
           -H "Authorization: Bearer ${TEST_TOKEN}" \
           -p test-data/bet.json \
           -T "application/json" \
           "${BASE_URL}/api/betting/place-bet"
    fi
    
    # Test bet history
    if command -v ab &> /dev/null; then
        log "Testing bet history retrieval..."
        ab -n 1000 -c 20 \
           -H "Authorization: Bearer ${TEST_TOKEN}" \
           "${BASE_URL}/api/betting/my-bets"
    fi
}

# Load test wallet endpoints
test_wallet_endpoints() {
    log "Testing wallet endpoints..."
    
    if [ -z "$TEST_TOKEN" ]; then
        error "No test token available for wallet tests"
        return 1
    fi
    
    # Test balance check
    if command -v ab &> /dev/null; then
        log "Testing wallet balance retrieval..."
        ab -n 2000 -c 30 \
           -H "Authorization: Bearer ${TEST_TOKEN}" \
           "${BASE_URL}/api/wallet/balance"
    fi
    
    # Test transaction history
    if command -v ab &> /dev/null; then
        log "Testing transaction history..."
        ab -n 1000 -c 20 \
           -H "Authorization: Bearer ${TEST_TOKEN}" \
           "${BASE_URL}/api/wallet/transactions"
    fi
}

# Load test public endpoints
test_public_endpoints() {
    log "Testing public endpoints..."
    
    # Test odds fetching
    if command -v ab &> /dev/null; then
        log "Testing odds endpoints..."
        ab -n 2000 -c 50 "${BASE_URL}/api/odds/sports"
        ab -n 1000 -c 30 "${BASE_URL}/api/odds/events/soccer"
    fi
    
    # Test health endpoint
    if command -v ab &> /dev/null; then
        log "Testing health endpoint..."
        ab -n 5000 -c 100 "${BASE_URL}/api/health"
    fi
}

# Database stress test
test_database_stress() {
    log "Testing database stress..."
    
    if [ -z "$TEST_TOKEN" ]; then
        error "No test token available for database stress test"
        return 1
    fi
    
    # Concurrent read operations
    for i in {1..10}; do
        (
            for j in {1..100}; do
                curl -s -H "Authorization: Bearer ${TEST_TOKEN}" \
                     "${BASE_URL}/api/betting/my-bets" > /dev/null
            done
        ) &
    done
    
    wait
    log "Database stress test completed"
}

# Memory and CPU stress test
test_resource_stress() {
    log "Testing resource usage under load..."
    
    # Start monitoring
    (
        while true; do
            echo "$(date): $(free -h | grep Mem | awk '{print $3}')" >> /tmp/memory_usage.log
            sleep 5
        done
    ) &
    MONITOR_PID=$!
    
    # Run intensive operations
    if command -v ab &> /dev/null; then
        ab -n 10000 -c 100 "${BASE_URL}/api/health" > /tmp/stress_test_results.log 2>&1
    fi
    
    # Stop monitoring
    kill $MONITOR_PID 2>/dev/null || true
    
    log "Resource stress test completed. Check /tmp/memory_usage.log for memory usage"
}

# Spike test
spike_test() {
    log "Running spike test..."
    
    # Sudden spike in traffic
    if command -v ab &> /dev/null; then
        log "Generating traffic spike..."
        ab -n 5000 -c 200 "${BASE_URL}/api/health" > /tmp/spike_test_results.log 2>&1 &
        ab -n 3000 -c 150 "${BASE_URL}/api/odds/sports" > /tmp/spike_test_odds.log 2>&1 &
        
        if [ -n "$TEST_TOKEN" ]; then
            ab -n 1000 -c 50 \
               -H "Authorization: Bearer ${TEST_TOKEN}" \
               "${BASE_URL}/api/wallet/balance" > /tmp/spike_test_wallet.log 2>&1 &
        fi
        
        wait
        log "Spike test completed"
    fi
}

# Cleanup
cleanup() {
    log "Cleaning up..."
    
    # Remove test user if created
    if [ -n "$TEST_USER_ID" ] && [ -n "$TEST_TOKEN" ]; then
        curl -s -X DELETE "${BASE_URL}/api/auth/user" \
             -H "Authorization: Bearer ${TEST_TOKEN}" > /dev/null || true
    fi
    
    # Clean up temp files
    rm -f /tmp/health_response /tmp/*_test_*.log /tmp/memory_usage.log
    
    log "Cleanup completed"
}

# Report generation
generate_report() {
    log "Generating load test report..."
    
    local report_file="load_test_report_$(date +%Y%m%d_%H%M%S).md"
    
    cat > "$report_file" << EOF
# Load Test Report

**Date**: $(date)
**Duration**: ${TEST_DURATION} seconds
**Concurrent Users**: ${CONCURRENT_USERS}
**Target URL**: ${BASE_URL}

## Test Results

### Health Check
$(if [ -f /tmp/stress_test_results.log ]; then cat /tmp/stress_test_results.log | head -20; else echo "No results available"; fi)

### Resource Usage
$(if [ -f /tmp/memory_usage.log ]; then echo "Peak memory usage: $(sort -k2 -hr /tmp/memory_usage.log | head -1)"; else echo "No memory data collected"; fi)

### Recommendations
- Monitor response times during peak loads
- Consider implementing rate limiting if not already in place
- Scale horizontally if consistent high load is expected
- Optimize database queries for frequently accessed endpoints

## Test Files
$(ls -la /tmp/*test*.log 2>/dev/null || echo "No detailed test files available")
EOF

    log "Report generated: $report_file"
}

# Main execution
main() {
    log "Starting load testing for Sportbet platform..."
    
    # Set up trap for cleanup
    trap cleanup EXIT
    
    # Run tests
    check_dependencies
    health_check || exit 1
    
    create_test_user || warn "Proceeding without authenticated user tests"
    
    test_public_endpoints
    test_auth_endpoints
    
    if [ -n "$TEST_TOKEN" ]; then
        test_betting_endpoints
        test_wallet_endpoints
        test_database_stress
    fi
    
    test_resource_stress
    spike_test
    
    generate_report
    
    log "Load testing completed successfully!"
}

# Create test data files if they don't exist
create_test_data() {
    mkdir -p test-data scripts
    
    # Registration test data
    cat > test-data/register.json << 'EOF'
{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "firstName": "Load",
    "lastName": "Test",
    "country": "Kenya"
}
EOF

    # Login test data
    cat > test-data/login.json << 'EOF'
{
    "email": "test@example.com",
    "password": "TestPassword123!"
}
EOF

    # Bet test data
    cat > test-data/bet.json << 'EOF'
{
    "selections": [{
        "eventId": "test-event-1",
        "marketId": "match-winner",
        "outcomeId": "team-a",
        "odds": 2.50,
        "sport": "soccer"
    }],
    "stake": 10,
    "betType": "single",
    "currency": "USD"
}
EOF

    # WRK scripts
    cat > scripts/register.lua << 'EOF'
wrk.method = "POST"
wrk.body = '{"email":"test' .. math.random(100000) .. '@example.com","password":"TestPassword123!","firstName":"Load","lastName":"Test","country":"Kenya"}'
wrk.headers["Content-Type"] = "application/json"
EOF

    cat > scripts/login.lua << 'EOF'
wrk.method = "POST"
wrk.body = '{"email":"test@example.com","password":"TestPassword123!"}'
wrk.headers["Content-Type"] = "application/json"
EOF

    cat > scripts/place-bet.lua << 'EOF'
wrk.method = "POST"
wrk.body = '{"selections":[{"eventId":"test-event-1","marketId":"match-winner","outcomeId":"team-a","odds":2.50,"sport":"soccer"}],"stake":10,"betType":"single","currency":"USD"}'
wrk.headers["Content-Type"] = "application/json"
wrk.headers["Authorization"] = "Bearer " .. os.getenv("TEST_TOKEN")
EOF
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    create_test_data
    main "$@"
fi
