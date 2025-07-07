#!/bin/bash

# Build script for deployment

echo "Building React app..."
cd client
npm run build
cd ..

echo "Build complete!"
echo "The built files are in client/build/" 