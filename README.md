# Danfoss_connect
Commandline tool to control a Danfoss Eco device

Pre-requisites:
-	You will need a Danfoss ECO device
-	according https://github.com/noble/node-bluetooth-hci-socket#windows you will need a specific bluetooth adapter
-	I assume npm and python environment has been installed
- I assume you alredy read out your secret-key from the Danfoss device
- I assume there has been set no PIN

# Installation on Windows
git clone 
git clone https://github.com/AIXruth/xxtea-nodejs.git
download, install and start Zadig from https://zadig.akeo.ie/
-	Replace the current driver with the WinUSB driver
add a file called skey.js with content:
  module.exports = { SECRETHEXKEY = "<your_key_from_device>" } 

Usage:
Start: .\Danfoss_connect.js
	
  
