#!/bin/bash

# Security Validation Script
# This script checks for potential secrets in the repository

echo "🔍 Scanning repository for potential secrets..."

# Common secret patterns
PATTERNS=(
    "MONGODB_URI=mongodb\+srv://[^:]+:[^@]+@"
    "sk_test_[a-zA-Z0-9]{99}"
    "sk_live_[a-zA-Z0-9]{99}"
    "FLWSECK_TEST-[a-zA-Z0-9-]+"
    "AIzaSy[a-zA-Z0-9_-]{33}"
    "-----BEGIN PRIVATE KEY-----[^-]*-----END PRIVATE KEY-----"
    "[a-f0-9]{32,}"
)

FOUND_ISSUES=0

for pattern in "${PATTERNS[@]}"; do
    echo "Checking pattern: $pattern"
    if grep -r -E "$pattern" . --exclude-dir=.git --exclude-dir=node_modules --exclude="*.log" --exclude="security-check.sh"; then
        echo "❌ Potential secret found with pattern: $pattern"
        FOUND_ISSUES=$((FOUND_ISSUES + 1))
    fi
done

if [ $FOUND_ISSUES -eq 0 ]; then
    echo "✅ No secrets detected in repository"
    echo "🔒 Repository is secure for public access"
else
    echo "⚠️  Found $FOUND_ISSUES potential security issues"
    echo "❌ Repository may not be secure"
    exit 1
fi
