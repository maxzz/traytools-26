#! /bin/bash

echo -e "Start running the script..."
cd ../

echo -e "Start building the app for macos platform..."
wails build --clean --platform darwin/universal -debug -devtools

echo -e "End running the script!"
