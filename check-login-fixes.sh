#!/usr/bin/env bash
# Login Fix Installation Script
# Run this to verify all fixes are in place

echo "=========================================="
echo "🔍 CHECKING KBMPRIMA LOGIN FIX STATUS"
echo "=========================================="
echo ""

# Check 1: middleware.ts
echo "✓ Checking middleware.ts..."
if grep -q "supabaseResponse.cookies.set(name, value, options);" src/middleware.ts; then
    echo "   ✅ Middleware cookie fix DETECTED"
else
    echo "   ❌ Middleware fix might not be applied"
fi

# Check 2: login page timing
echo ""
echo "✓ Checking login redirect timing..."
if grep -q "setTimeout(() => {" src/app/login/page.tsx; then
    echo "   ✅ Login delay fix DETECTED"
else
    echo "   ❌ Login timing fix might not be applied"
fi

# Check 3: supabase client config
echo ""
echo "✓ Checking supabase client config..."
if grep -q "flowType: 'implicit'" src/lib/supabase.ts; then
    echo "   ✅ Supabase client enhancement DETECTED"
else
    echo "   ⚠️  Enhancement not applied (optional)"
fi

# Check 4: .env.local
echo ""
echo "✓ Checking environment variables..."
if [ -f ".env.local" ]; then
    if grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local && grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.local; then
        echo "   ✅ .env.local configured"
    else
        echo "   ❌ .env.local missing Supabase credentials"
    fi
else
    echo "   ❌ .env.local NOT FOUND"
fi

# Check 5: SQL fix files
echo ""
echo "✓ Checking SQL fix files..."
if [ -f "fix-auth-profiles-trigger.sql" ]; then
    echo "   ✅ fix-auth-profiles-trigger.sql exists"
else
    echo "   ❌ fix-auth-profiles-trigger.sql NOT FOUND"
fi

if [ -f "diagnostic-auth-issues.sql" ]; then
    echo "   ✅ diagnostic-auth-issues.sql exists"
else
    echo "   ❌ diagnostic-auth-issues.sql NOT FOUND"
fi

echo ""
echo "=========================================="
echo "📋 NEXT STEPS:"
echo "=========================================="
echo ""
echo "1️⃣  MUST RUN in Supabase SQL Editor:"
echo "   - Copy entire content of: fix-auth-profiles-trigger.sql"
echo "   - Paste in Supabase SQL Editor"
echo "   - Click RUN"
echo ""
echo "2️⃣  VERIFY with diagnostic query:"
echo "   - Copy content of: diagnostic-auth-issues.sql"
echo "   - Run in Supabase SQL Editor"
echo "   - Check for ✅ marks in output"
echo ""
echo "3️⃣  RESTART development server:"
echo "   - Press Ctrl+C to stop"
echo "   - Run: npm run dev"
echo "   - Clear browser cache (F12 → Application → Clear)"
echo ""
echo "4️⃣  TEST login:"
echo "   - Go to http://localhost:3000/login"
echo "   - Register new account or login with existing"
echo "   - Should navigate to /dashboard"
echo ""
echo "=========================================="
echo "📖 For detailed guide, see: LOGIN_FIX_GUIDE.md"
echo "📖 For summary, see: PERBAIKAN_LOGIN_SUMMARY.md"
echo "=========================================="
