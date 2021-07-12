#!/bin/bash
set -ex

cd /home/dyno/
which wget || ( apt-get update -y && apt-get install wget -y )
which unzip || ( apt-get update -y && apt-get install unzip -y )
rm -rf /home/dyno/deploy/alpha
mkdir -p /home/dyno/deploy/alpha
git clone -b develop -- git@git.dyno.sh:Dyno/Dyno-web.git /home/dyno/deploy/alpha
cd /home/dyno/deploy/alpha
npm i
cd react
yarn
cd ..
cp /home/dyno/Dyno-web/.env ./.env
rm -rf public
wget "$1" -O artifacts.zip
unzip artifacts
rm artifacts.zip
mkdir -p /home/dyno/Dyno-web-temp/
cp -rf /home/dyno/deploy/alpha/. /home/dyno/Dyno-web-temp
rm -rf /home/dyno/old.Dyno-web
mv /home/dyno/Dyno-web /home/dyno/old.Dyno-web
mv /home/dyno/Dyno-web-temp /home/dyno/Dyno-web
pm2 reload staff.dyno.gg