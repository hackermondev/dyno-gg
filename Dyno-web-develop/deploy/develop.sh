#!/bin/bash
set -ex

cd /home/dyno/
which wget || ( apt-get update -y && apt-get install wget -y )
rm -rf /home/dyno/deploy/alpha
mkdir -p /home/dyno/deploy/alpha
git clone -b develop -- git@git.dyno.sh:Dyno/Dyno-web.git /home/dyno/deploy/alpha
cd /home/dyno/deploy/alpha
npm ci
cd react
npm ci
cd ..
cp /home/dyno/Dyno-web/.env ./.env
rm -rf public
wget "$1" -O artifacts.tar.gz
tar xf artifacts.tar.gz
rm artifacts.tar.gz
mkdir -p /home/dyno/Dyno-web-temp/
cp -rf /home/dyno/deploy/alpha/. /home/dyno/Dyno-web-temp
rm -rf /home/dyno/old.Dyno-web
mv /home/dyno/Dyno-web /home/dyno/old.Dyno-web
mv /home/dyno/Dyno-web-temp /home/dyno/Dyno-web
