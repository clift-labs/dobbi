#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Dobbie — Build standalone macOS binary
#
# Uses esbuild to bundle all TypeScript into a single CJS file,
# then wraps it with Node.js Single Executable Application (SEA).
#
# Requirements: Node.js 20+, macOS
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DIST_DIR="$PROJECT_DIR/dist"
BIN_DIR="$PROJECT_DIR/bin"
BUNDLE="$DIST_DIR/dobbie-bundle.cjs"
BLOB="$PROJECT_DIR/sea-prep.blob"
BINARY="$BIN_DIR/dobbie"

echo "🧝 Building Dobbie standalone binary..."
echo ""

# ── Step 1: TypeScript → single CJS bundle via esbuild ──────────────────────
echo "📦 Step 1/5: Bundling with esbuild..."
mkdir -p "$DIST_DIR" "$BIN_DIR"

npx esbuild "$PROJECT_DIR/src/index.ts" \
    --bundle \
    --platform=node \
    --target=node20 \
    --format=cjs \
    --outfile="$BUNDLE" \
    --define:import.meta.dirname=__dirname \
    --define:import.meta.filename=__filename

echo "  ✓ Bundle: $(du -sh "$BUNDLE" | cut -f1)"

# ── Step 2: Generate SEA blob ────────────────────────────────────────────────
echo "🔧 Step 2/5: Generating SEA blob..."
node --experimental-sea-config "$PROJECT_DIR/sea-config.json"

echo "  ✓ SEA blob generated"

# ── Step 3: Copy node binary ────────────────────────────────────────────────
echo "📋 Step 3/5: Copying Node binary..."
cp "$(which node)" "$BINARY"
chmod 755 "$BINARY"

echo "  ✓ Base binary copied"

# ── Step 4: Inject SEA blob ─────────────────────────────────────────────────
echo "💉 Step 4/5: Injecting blob into binary..."
npx -y postject "$BINARY" NODE_SEA_BLOB "$BLOB" \
    --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 \
    --macho-segment-name NODE_SEA

echo "  ✓ Blob injected"

# ── Step 5: Re-sign for macOS ───────────────────────────────────────────────
echo "🔏 Step 5/5: Code-signing binary..."
codesign --force --sign - "$BINARY"

echo "  ✓ Signed"

# ── Clean up ────────────────────────────────────────────────────────────────
rm -f "$BLOB"

# ── Done ────────────────────────────────────────────────────────────────────
BINARY_SIZE=$(du -sh "$BINARY" | cut -f1)
echo ""
echo "✅ Build complete!"
echo "   Binary:  $BINARY ($BINARY_SIZE)"
echo "   Run:     $BINARY --version"
echo "   Install: cp $BINARY /usr/local/bin/dobbie"
