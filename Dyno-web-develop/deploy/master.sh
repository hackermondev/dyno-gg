#!/bin/bash
set -ex

cd /home/dyno/
which wget || ( apt-get update -y && apt-get install wget -y )
rm -rf /home/dyno/deploy/production
mkdir -p /home/dyno/deploy/production
git clone -b master -- git@git.dyno.sh:Dyno/Dyno-web.git /home/dyno/deploy/production
cd /home/dyno/deploy/production
npm ci
cd react
npm ci
cd ..
cp /home/dyno/dyno.gg/.env ./.env
rm -rf public
wget "$1" -O artifacts.tar.gz
tar xf artifacts.tar.gz
rm artifacts.tar.gz
mkdir -p /home/dyno/dyno.gg-temp/
cp -rf /home/dyno/deploy/production/. /home/dyno/dyno.gg-temp
rm -rf /home/dyno/old.dyno.gg
mv /home/dyno/dyno.gg /home/dyno/old.dyno.gg
mv /home/dyno/dyno.gg-temp /home/dyno/dyno.gg
