#! /bin/bash

echo -e "Start running the script..."
cd ../

echo -e "Start building the app for windows platform..."
wails build --clean --platform windows/amd64 -debug -devtools -ldflags "-H windowsgui"

echo -e "End running the script!"
