#!/bin/bash
# @mariozechner/pi-tui-professional v1.0.0
# Publish execution script
# Run this from packages/tui directory

set -e

echo "================================"
echo "PUBLISH SCRIPT FOR PI-TUI-PROFESSIONAL"
echo "================================"
echo ""

# Step 0: Pre-checks
echo "Step 0: Pre-checks"
echo "  - Node.js version: $(node --version)"
echo "  - npm version: $(npm --version)"
echo "  - Current directory: $(pwd)"
if [ ! -f "package.json" ]; then
  echo "ERROR: Not in packages/tui directory"
  exit 1
fi
echo "  ✓ package.json found"
echo ""

# Step 1: Verify npm login
echo "Step 1: Verify npm login"
if npm whoami > /dev/null 2>&1; then
  echo "  ✓ Logged in as: $(npm whoami)"
else
  echo "  ✗ Not logged in. Run: npm login"
  exit 1
fi
echo ""

# Step 2: Check 2FA (if enabled)
echo "Step 2: Check 2FA"
echo "  If 2FA is enabled, have your authenticator ready."
echo ""

# Step 3: Final build and test
echo "Step 3: Final build and test"
npm run build
npm test
echo ""

# Step 4: Dry-run pack
echo "Step 4: Dry-run pack validation"
npm pack --dry-run | head -30
echo ""

# Step 5: Confirmation
echo "Step 5: Ready to publish?"
read -p "  Publish @mariozechner/pi-tui-professional@1.0.0? (yes/no) " -n 3 -r
echo
if [[ ! $REPLY =~ ^yes$ ]]; then
    echo "  Cancelled."
    exit 1
fi

# Step 6: Publish
echo "Step 6: Publishing..."
npm publish --access public

# Step 7: Success
echo ""
echo "================================"
echo "PUBLISH SUCCESSFUL!"
echo "================================"
echo ""

# Step 8: Post-publish instructions
echo "Step 8: Post-publish actions:"
echo "  1. Verify on npm: https://npmjs.com/package/@mariozechner/pi-tui-professional"
echo "  2. Create git tag:"
echo "     git tag -a v1.0.0 -m 'Release v1.0.0'"
echo "     git push origin v1.0.0"
echo "  3. Create GitHub release at: https://github.com/qcoder/qclaw/releases"
echo "  4. Test install in fresh project:"
echo "     mkdir ~/test-publish && cd ~/test-publish"
echo "     npm init -y"
echo "     npm install @mariozechner/pi-tui-professional"
echo "     npx tsx -e \"import { ThemeManager } from '@mariozechner/pi-tui-professional'; console.log('OK')\""
echo ""
echo "Done!"
