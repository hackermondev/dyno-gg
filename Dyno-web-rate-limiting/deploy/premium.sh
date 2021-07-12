#!/bin/bash
set -ex

cd /home/dyno/
which wget || ( apt-get update -y && apt-get install wget -y )
which unzip || ( apt-get update -y && apt-get install unzip -y )
rm -rf /home/dyno/deploy/premium
mkdir -p /home/dyno/deploy/premium
git clone -b premium -- git@git.dyno.sh:Dyno/Dyno-web.git /home/dyno/deploy/premium
cd /home/dyno/deploy/premium
npm i
cd react
yarn
cd ..
cp /home/dyno/premium.dyno.gg/.env ./.env
rm -rf public
wget "$1" -O artifacts.zip
unzip artifacts
rm artifacts.zip
mkdir -p /home/dyno/premium.dyno.gg-temp/
cp -rf /home/dyno/deploy/premium/. /home/dyno/premium.dyno.gg-temp
rm -rf /home/dyno/old.premium.dyno.gg
mv /home/dyno/premium.dyno.gg /home/dyno/old.premium.dyno.gg
mv /home/dyno/premium.dyno.gg-temp /home/dyno/premium.dyno.gg
#pm2 reload premium.dyno.gg