#! /bin/bash

echo -e "Start running the script..."
cd ../

echo -e "Start building the app..."
wails build --clean -debug -devtools -ldflags "-H windowsgui"

echo -e "End running the script!"
