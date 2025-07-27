#!/bin/bash

# Security Testing Script for Sportbet Platform
# This script performs comprehensive security testing

set -e

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3001}"
WORDLIST_DIR="${WORDLIST_DIR:-/usr/share/wordlists}"
OUTPUT_DIR="${OUTPUT_DIR:-./security-reports}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"
}

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Check dependencies
check_dependencies() {
    log "Checking dependencies..."
    
    local missing_tools=()
    
    # Essential tools
    command -v curl &>/dev/null || missing_tools+=("curl")
    command -v jq &>/dev/null || missing_tools+=("jq")
    command -v nmap &>/dev/null || missing_tools+=("nmap")
    
    # Optional but recommended tools
    command -v nikto &>/dev/null || warn "nikto not found - web vulnerability scanning will be limited"
    command -v dirb &>/dev/null || warn "dirb not found - directory enumeration will be skipped"
    command -v sqlmap &>/dev/null || warn "sqlmap not found - SQL injection testing will be limited"
    command -v hydra &>/dev/null || warn "hydra not found - brute force testing will be skipped"
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        error "Missing required tools: ${missing_tools[*]}"
        exit 1
    fi
    
    log "Dependencies check completed"
}

# Extract domain from URL
extract_domain() {
    echo "$BASE_URL" | sed -e 's|^[^/]*//||' -e 's|/.*||' -e 's|:.*||'
}

# Port scanning
port_scan() {
    log "Running port scan..."
    
    local domain=$(extract_domain)
    local report_file="$OUTPUT_DIR/port_scan.txt"
    
    info "Scanning common ports on $domain"
    nmap -sS -O -sV --version-all -p- "$domain" > "$report_file" 2>&1
    
    log "Port scan completed. Report: $report_file"
}

# SSL/TLS testing
ssl_test() {
    log "Testing SSL/TLS configuration..."
    
    local domain=$(extract_domain)
    local report_file="$OUTPUT_DIR/ssl_test.txt"
    
    # Test SSL configuration
    if command -v testssl &>/dev/null; then
        testssl.sh "$domain" > "$report_file" 2>&1
    else
        # Basic SSL test with openssl
        info "testssl.sh not found, using basic openssl tests"
        {
            echo "=== SSL Certificate Information ==="
            echo | openssl s_client -connect "$domain:443" -servername "$domain" 2>/dev/null | openssl x509 -noout -text
            
            echo -e "\n=== Supported Ciphers ==="
            nmap --script ssl-enum-ciphers -p 443 "$domain"
            
            echo -e "\n=== SSL Vulnerabilities ==="
            nmap --script ssl-heartbleed,ssl-poodle,ssl-ccs-injection -p 443 "$domain"
        } > "$report_file" 2>&1
    fi
    
    log "SSL/TLS test completed. Report: $report_file"
}

# Web vulnerability scanning
web_vuln_scan() {
    log "Running web vulnerability scan..."
    
    local report_file="$OUTPUT_DIR/web_vulns.txt"
    
    if command -v nikto &>/dev/null; then
        info "Running Nikto scan"
        nikto -h "$BASE_URL" -output "$report_file" -Format txt
    else
        warn "Nikto not available, running basic tests"
        {
            echo "=== Basic Web Security Tests ==="
            echo "Testing for common security headers..."
            
            # Test security headers
            curl -I "$BASE_URL" 2>/dev/null | grep -i "x-frame-options\|x-content-type-options\|x-xss-protection\|strict-transport-security\|content-security-policy" || echo "Security headers missing or not detected"
            
            echo -e "\n=== HTTP Methods Test ==="
            curl -X OPTIONS -I "$BASE_URL" 2>/dev/null | head -10
            
        } > "$report_file" 2>&1
    fi
    
    log "Web vulnerability scan completed. Report: $report_file"
}

# Directory enumeration
directory_enum() {
    log "Running directory enumeration..."
    
    local report_file="$OUTPUT_DIR/directories.txt"
    
    if command -v dirb &>/dev/null; then
        info "Running dirb scan"
        dirb "$BASE_URL" -o "$report_file" -w
    elif command -v gobuster &>/dev/null; then
        info "Running gobuster scan"
        if [ -f "$WORDLIST_DIR/dirb/common.txt" ]; then
            gobuster dir -u "$BASE_URL" -w "$WORDLIST_DIR/dirb/common.txt" -o "$report_file"
        else
            warn "Common wordlist not found, creating basic list"
            echo -e "admin\napi\ntest\nbackup\nconfig\nlogin\nwp-admin\nadmin.php\nconfig.php" > /tmp/basic_dirs.txt
            gobuster dir -u "$BASE_URL" -w /tmp/basic_dirs.txt -o "$report_file"
        fi
    else
        warn "Directory enumeration tools not available"
        touch "$report_file"
    fi
    
    log "Directory enumeration completed. Report: $report_file"
}

# Authentication testing
auth_test() {
    log "Testing authentication mechanisms..."
    
    local report_file="$OUTPUT_DIR/auth_test.txt"
    
    {
        echo "=== Authentication Security Tests ==="
        
        # Test default credentials
        echo -e "\n--- Testing Default Credentials ---"
        local default_creds=("admin:admin" "admin:password" "admin:123456" "test:test" "guest:guest")
        
        for cred in "${default_creds[@]}"; do
            local username=$(echo "$cred" | cut -d: -f1)
            local password=$(echo "$cred" | cut -d: -f2)
            
            local response=$(curl -s -w "%{http_code}" -o /dev/null \
                -X POST "$BASE_URL/api/auth/login" \
                -H "Content-Type: application/json" \
                -d "{\"email\":\"$username@example.com\",\"password\":\"$password\"}")
            
            if [ "$response" = "200" ]; then
                echo "VULNERABLE: Default credentials work: $username:$password"
            else
                echo "OK: Default credentials rejected: $username:$password"
            fi
        done
        
        # Test password complexity
        echo -e "\n--- Testing Password Complexity ---"
        local weak_passwords=("123456" "password" "admin" "test" "12345" "qwerty")
        
        for weak_pass in "${weak_passwords[@]}"; do
            local response=$(curl -s -w "%{http_code}" -o /dev/null \
                -X POST "$BASE_URL/api/auth/register" \
                -H "Content-Type: application/json" \
                -d "{\"email\":\"test$(date +%s)@example.com\",\"password\":\"$weak_pass\",\"firstName\":\"Test\",\"lastName\":\"User\",\"country\":\"Kenya\"}")
            
            if [ "$response" = "201" ]; then
                echo "VULNERABLE: Weak password accepted: $weak_pass"
            else
                echo "OK: Weak password rejected: $weak_pass"
            fi
        done
        
        # Test rate limiting
        echo -e "\n--- Testing Rate Limiting ---"
        local start_time=$(date +%s)
        local success_count=0
        
        for i in {1..20}; do
            local response=$(curl -s -w "%{http_code}" -o /dev/null \
                -X POST "$BASE_URL/api/auth/login" \
                -H "Content-Type: application/json" \
                -d '{"email":"nonexistent@example.com","password":"wrongpassword"}')
            
            if [ "$response" != "429" ]; then
                ((success_count++))
            fi
        done
        
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        if [ $success_count -eq 20 ]; then
            echo "VULNERABLE: No rate limiting detected (20 requests in ${duration}s)"
        else
            echo "OK: Rate limiting active (blocked $((20 - success_count)) requests)"
        fi
        
        # Test JWT security
        echo -e "\n--- Testing JWT Security ---"
        
        # Create a test user and get token
        local test_response=$(curl -s -X POST "$BASE_URL/api/auth/register" \
            -H "Content-Type: application/json" \
            -d "{\"email\":\"jwttest$(date +%s)@example.com\",\"password\":\"SecurePassword123!\",\"firstName\":\"JWT\",\"lastName\":\"Test\",\"country\":\"Kenya\"}")
        
        if echo "$test_response" | jq -e '.tokens.accessToken' > /dev/null; then
            local token=$(echo "$test_response" | jq -r '.tokens.accessToken')
            
            # Test with malformed token
            local malformed_response=$(curl -s -w "%{http_code}" -o /dev/null \
                -H "Authorization: Bearer invalid.token.here" \
                "$BASE_URL/api/wallet/balance")
            
            if [ "$malformed_response" = "401" ]; then
                echo "OK: Malformed JWT rejected"
            else
                echo "VULNERABLE: Malformed JWT accepted"
            fi
            
            # Test with no signature
            local header_payload=$(echo "$token" | cut -d. -f1,2)
            local no_sig_response=$(curl -s -w "%{http_code}" -o /dev/null \
                -H "Authorization: Bearer ${header_payload}." \
                "$BASE_URL/api/wallet/balance")
            
            if [ "$no_sig_response" = "401" ]; then
                echo "OK: JWT without signature rejected"
            else
                echo "VULNERABLE: JWT without signature accepted"
            fi
        fi
        
    } > "$report_file" 2>&1
    
    log "Authentication testing completed. Report: $report_file"
}

# SQL injection testing
sql_injection_test() {
    log "Testing for SQL injection vulnerabilities..."
    
    local report_file="$OUTPUT_DIR/sql_injection.txt"
    
    {
        echo "=== SQL Injection Tests ==="
        
        # Test common SQL injection payloads
        local payloads=(
            "' OR '1'='1"
            "' OR '1'='1' --"
            "' OR '1'='1' #"
            "' UNION SELECT NULL--"
            "1' OR '1'='1"
            "admin'--"
            "admin' #"
            "' OR 1=1--"
        )
        
        # Test login endpoint
        echo -e "\n--- Testing Login Endpoint ---"
        for payload in "${payloads[@]}"; do
            local response=$(curl -s -w "%{http_code}" -o /tmp/sql_response \
                -X POST "$BASE_URL/api/auth/login" \
                -H "Content-Type: application/json" \
                -d "{\"email\":\"$payload\",\"password\":\"password\"}")
            
            if [ "$response" = "200" ]; then
                echo "VULNERABLE: SQL injection possible with payload: $payload"
                cat /tmp/sql_response
            elif grep -qi "sql\|database\|mysql\|postgresql\|syntax error" /tmp/sql_response 2>/dev/null; then
                echo "POTENTIAL: Database error detected with payload: $payload"
                head -3 /tmp/sql_response
            else
                echo "OK: Payload blocked: $payload"
            fi
        done
        
        # Test search endpoints if available
        echo -e "\n--- Testing Search Endpoints ---"
        for payload in "${payloads[@]}"; do
            local response=$(curl -s -w "%{http_code}" -o /tmp/sql_response \
                "$BASE_URL/api/odds/events?search=$payload")
            
            if grep -qi "sql\|database\|mysql\|postgresql\|syntax error" /tmp/sql_response 2>/dev/null; then
                echo "POTENTIAL: Database error in search with payload: $payload"
            fi
        done
        
    } > "$report_file" 2>&1
    
    log "SQL injection testing completed. Report: $report_file"
}

# XSS testing
xss_test() {
    log "Testing for XSS vulnerabilities..."
    
    local report_file="$OUTPUT_DIR/xss_test.txt"
    
    {
        echo "=== XSS Vulnerability Tests ==="
        
        local xss_payloads=(
            "<script>alert('XSS')</script>"
            "<img src=x onerror=alert('XSS')>"
            "javascript:alert('XSS')"
            "<svg onload=alert('XSS')>"
            "'\"><script>alert('XSS')</script>"
        )
        
        # Test registration form
        echo -e "\n--- Testing Registration Form ---"
        for payload in "${xss_payloads[@]}"; do
            local response=$(curl -s -X POST "$BASE_URL/api/auth/register" \
                -H "Content-Type: application/json" \
                -d "{\"email\":\"xsstest$(date +%s)@example.com\",\"password\":\"Password123!\",\"firstName\":\"$payload\",\"lastName\":\"Test\",\"country\":\"Kenya\"}")
            
            if echo "$response" | grep -q "$payload"; then
                echo "VULNERABLE: XSS payload reflected: $payload"
            else
                echo "OK: XSS payload filtered: $payload"
            fi
        done
        
        # Test search functionality
        echo -e "\n--- Testing Search Functionality ---"
        for payload in "${xss_payloads[@]}"; do
            local encoded_payload=$(echo "$payload" | jq -sRr @uri)
            curl -s "$BASE_URL/api/odds/events?search=$encoded_payload" | \
                grep -q "$payload" && echo "VULNERABLE: XSS in search: $payload" || echo "OK: XSS filtered in search"
        done
        
    } > "$report_file" 2>&1
    
    log "XSS testing completed. Report: $report_file"
}

# CSRF testing
csrf_test() {
    log "Testing for CSRF vulnerabilities..."
    
    local report_file="$OUTPUT_DIR/csrf_test.txt"
    
    {
        echo "=== CSRF Vulnerability Tests ==="
        
        # Create test user first
        local test_response=$(curl -s -X POST "$BASE_URL/api/auth/register" \
            -H "Content-Type: application/json" \
            -d "{\"email\":\"csrftest$(date +%s)@example.com\",\"password\":\"SecurePassword123!\",\"firstName\":\"CSRF\",\"lastName\":\"Test\",\"country\":\"Kenya\"}")
        
        if echo "$test_response" | jq -e '.tokens.accessToken' > /dev/null; then
            local token=$(echo "$test_response" | jq -r '.tokens.accessToken')
            
            # Test state-changing operations without CSRF protection
            echo -e "\n--- Testing State-Changing Operations ---"
            
            # Test fund addition without CSRF token
            local csrf_response=$(curl -s -w "%{http_code}" -o /tmp/csrf_response \
                -X POST "$BASE_URL/api/wallet/add-funds" \
                -H "Authorization: Bearer $token" \
                -H "Content-Type: application/json" \
                -H "Origin: http://malicious.com" \
                -d '{"amount": 100, "paymentMethod": "test", "currency": "USD"}')
            
            if [ "$csrf_response" = "200" ] || [ "$csrf_response" = "201" ]; then
                echo "VULNERABLE: CSRF attack possible on fund addition"
            else
                echo "OK: CSRF protection active for fund addition"
            fi
            
            # Test bet placement without CSRF token
            local bet_csrf_response=$(curl -s -w "%{http_code}" -o /tmp/csrf_response \
                -X POST "$BASE_URL/api/betting/place-bet" \
                -H "Authorization: Bearer $token" \
                -H "Content-Type: application/json" \
                -H "Origin: http://malicious.com" \
                -d '{"selections":[{"eventId":"test","marketId":"winner","outcomeId":"team1","odds":2.0,"sport":"soccer"}],"stake":10,"betType":"single","currency":"USD"}')
            
            if [ "$bet_csrf_response" = "200" ] || [ "$bet_csrf_response" = "201" ]; then
                echo "VULNERABLE: CSRF attack possible on bet placement"
            else
                echo "OK: CSRF protection active for bet placement"
            fi
        fi
        
    } > "$report_file" 2>&1
    
    log "CSRF testing completed. Report: $report_file"
}

# API security testing
api_security_test() {
    log "Testing API security..."
    
    local report_file="$OUTPUT_DIR/api_security.txt"
    
    {
        echo "=== API Security Tests ==="
        
        # Test HTTP methods
        echo -e "\n--- Testing HTTP Methods ---"
        local methods=("GET" "POST" "PUT" "DELETE" "PATCH" "OPTIONS" "HEAD" "TRACE")
        
        for method in "${methods[@]}"; do
            local response=$(curl -s -w "%{http_code}" -o /dev/null -X "$method" "$BASE_URL/api/auth/login")
            echo "$method: $response"
        done
        
        # Test API versioning
        echo -e "\n--- Testing API Versioning ---"
        curl -s -I "$BASE_URL/api/v1/health" | head -5
        curl -s -I "$BASE_URL/api/v2/health" | head -5
        
        # Test API documentation exposure
        echo -e "\n--- Testing API Documentation Exposure ---"
        local doc_paths=("/api/docs" "/api/swagger" "/api/documentation" "/docs" "/swagger")
        
        for path in "${doc_paths[@]}"; do
            local response=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL$path")
            if [ "$response" = "200" ]; then
                echo "EXPOSED: API documentation at $path"
            fi
        done
        
        # Test error handling
        echo -e "\n--- Testing Error Handling ---"
        curl -s "$BASE_URL/api/nonexistent" | head -10
        curl -s -X POST "$BASE_URL/api/auth/login" -H "Content-Type: application/json" -d '{"invalid": "json"}' | head -10
        
    } > "$report_file" 2>&1
    
    log "API security testing completed. Report: $report_file"
}

# Brute force testing
brute_force_test() {
    log "Testing brute force protection..."
    
    local report_file="$OUTPUT_DIR/brute_force.txt"
    
    {
        echo "=== Brute Force Protection Tests ==="
        
        # Test login brute force
        echo -e "\n--- Testing Login Brute Force Protection ---"
        local test_email="brutetest$(date +%s)@example.com"
        local attempt_count=0
        local blocked_count=0
        
        for i in {1..50}; do
            local response=$(curl -s -w "%{http_code}" -o /dev/null \
                -X POST "$BASE_URL/api/auth/login" \
                -H "Content-Type: application/json" \
                -d "{\"email\":\"$test_email\",\"password\":\"wrongpassword$i\"}")
            
            ((attempt_count++))
            
            if [ "$response" = "429" ] || [ "$response" = "423" ]; then
                ((blocked_count++))
            fi
            
            # Small delay to avoid overwhelming the server
            sleep 0.1
        done
        
        echo "Total attempts: $attempt_count"
        echo "Blocked attempts: $blocked_count"
        
        if [ $blocked_count -gt 0 ]; then
            echo "OK: Brute force protection is active"
        else
            echo "VULNERABLE: No brute force protection detected"
        fi
        
    } > "$report_file" 2>&1
    
    log "Brute force testing completed. Report: $report_file"
}

# Generate security report
generate_security_report() {
    log "Generating comprehensive security report..."
    
    local report_file="$OUTPUT_DIR/security_assessment_$(date +%Y%m%d_%H%M%S).md"
    
    cat > "$report_file" << EOF
# Security Assessment Report

**Target**: $BASE_URL  
**Date**: $(date)  
**Tester**: Automated Security Scanner

## Executive Summary

This report contains the results of an automated security assessment performed on the Sportbet platform.

## Test Results

### Port Scan Results
$(if [ -f "$OUTPUT_DIR/port_scan.txt" ]; then head -20 "$OUTPUT_DIR/port_scan.txt"; else echo "Port scan not completed"; fi)

### SSL/TLS Security
$(if [ -f "$OUTPUT_DIR/ssl_test.txt" ]; then grep -A 5 -B 5 "VULNERABLE\|WEAK\|INSECURE" "$OUTPUT_DIR/ssl_test.txt" | head -20; else echo "SSL test not completed"; fi)

### Web Vulnerabilities
$(if [ -f "$OUTPUT_DIR/web_vulns.txt" ]; then grep -A 2 -B 2 "OSVDB\|NIKTO" "$OUTPUT_DIR/web_vulns.txt" | head -20; else echo "Web vulnerability scan not completed"; fi)

### Authentication Security
$(if [ -f "$OUTPUT_DIR/auth_test.txt" ]; then grep "VULNERABLE\|OK:" "$OUTPUT_DIR/auth_test.txt"; else echo "Authentication test not completed"; fi)

### SQL Injection Results
$(if [ -f "$OUTPUT_DIR/sql_injection.txt" ]; then grep "VULNERABLE\|POTENTIAL:" "$OUTPUT_DIR/sql_injection.txt"; else echo "SQL injection test not completed"; fi)

### XSS Test Results
$(if [ -f "$OUTPUT_DIR/xss_test.txt" ]; then grep "VULNERABLE:" "$OUTPUT_DIR/xss_test.txt"; else echo "XSS test not completed"; fi)

### CSRF Test Results
$(if [ -f "$OUTPUT_DIR/csrf_test.txt" ]; then grep "VULNERABLE\|OK:" "$OUTPUT_DIR/csrf_test.txt"; else echo "CSRF test not completed"; fi)

### API Security Results
$(if [ -f "$OUTPUT_DIR/api_security.txt" ]; then head -30 "$OUTPUT_DIR/api_security.txt"; else echo "API security test not completed"; fi)

### Brute Force Protection
$(if [ -f "$OUTPUT_DIR/brute_force.txt" ]; then grep "VULNERABLE\|OK:" "$OUTPUT_DIR/brute_force.txt"; else echo "Brute force test not completed"; fi)

## Recommendations

### High Priority
- Review any VULNERABLE findings immediately
- Implement missing security headers
- Ensure proper input validation and output encoding
- Verify authentication and authorization mechanisms

### Medium Priority
- Implement rate limiting if not present
- Review SSL/TLS configuration
- Audit API endpoint security
- Implement CSRF protection for state-changing operations

### Low Priority
- Regular security scanning
- Security awareness training
- Penetration testing by professionals
- Security code review

## Detailed Reports

Individual test reports are available in the following files:
$(ls -la "$OUTPUT_DIR"/*.txt 2>/dev/null | awk '{print "- " $9}' || echo "No detailed reports available")

---

**Note**: This is an automated assessment. Manual verification and professional penetration testing are recommended for comprehensive security evaluation.
EOF

    log "Security report generated: $report_file"
}

# Cleanup function
cleanup() {
    log "Cleaning up temporary files..."
    rm -f /tmp/sql_response /tmp/csrf_response /tmp/basic_dirs.txt
    log "Cleanup completed"
}

# Main execution
main() {
    log "Starting security assessment for Sportbet platform..."
    
    # Set up trap for cleanup
    trap cleanup EXIT
    
    check_dependencies
    
    # Run security tests
    port_scan
    ssl_test
    web_vuln_scan
    directory_enum
    auth_test
    sql_injection_test
    xss_test
    csrf_test
    api_security_test
    brute_force_test
    
    # Generate comprehensive report
    generate_security_report
    
    log "Security assessment completed!"
    log "Reports available in: $OUTPUT_DIR"
}

# Show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -u, --url URL          Target URL (default: http://localhost:3001)"
    echo "  -o, --output DIR       Output directory (default: ./security-reports)"
    echo "  -h, --help            Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  BASE_URL              Target URL"
    echo "  OUTPUT_DIR            Output directory"
    echo "  WORDLIST_DIR          Wordlist directory for tools"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -u|--url)
            BASE_URL="$2"
            shift 2
            ;;
        -o|--output)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
