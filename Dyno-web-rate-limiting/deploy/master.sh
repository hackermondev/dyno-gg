#!/bin/bash
set -ex

cd /home/dyno/
which wget || ( apt-get update -y && apt-get install wget -y )
which unzip || ( apt-get update -y && apt-get install unzip -y )
rm -rf /home/dyno/deploy/production
mkdir -p /home/dyno/deploy/production
git clone -b master -- git@git.dyno.sh:Dyno/Dyno-web.git /home/dyno/deploy/production
cd /home/dyno/deploy/production
npm i
cd react
yarn
cd ..
cp /home/dyno/dyno.gg/.env ./.env
rm -rf public
wget "$1" -O artifacts.zip
unzip artifacts
rm artifacts.zip
mkdir -p /home/dyno/dyno.gg-temp/
cp -rf /home/dyno/deploy/production/. /home/dyno/dyno.gg-temp
rm -rf /home/dyno/old.dyno.gg
mv /home/dyno/dyno.gg /home/dyno/old.dyno.gg
mv /home/dyno/dyno.gg-temp /home/dyno/dyno.gg
#pm2 reload dyno.gg
