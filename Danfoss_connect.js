const noble = require('noble');
const xxtea = require('../xxtea-nodejs/lib/xxtea');
var consts = require('./const.js');
var SKEY = require('./skey.js');
// const util = require('util');

// module.exports = { SECRETHEXKEY = "<your_key_from_device>" } // this line must be in skey.js
const SECRETKEY = Buffer.from(SKEY.SECRETHEXKEY, 'hex');

var desiredTemp = process.argv.slice(2);

noble.on('stateChange', state => {
            if (state === 'poweredOn') {
                // console.log('Scanning');
                noble.startScanning();
            } else {
                noble.stopScanning();
            }    
});

noble.on('discover', peripheral => {
    if (peripheral.address == "00042fce59ae" || peripheral.id == "00042fce59ae") {
        noble.stopScanning();
        const name = peripheral.advertisement.localName;
        console.log(`Connecting to '${name}' ${peripheral.id}`);

        peripheral.connect(error => {
            if (error) {
                console.log("Could not connect");
            }
            console.log('Connected to', peripheral.id);

            //discover(peripheral);

            loginWithPin(peripheral, consts.PIN.SERVICE, consts.PIN.CHARACTERISTIC)
                .then(result => {
                    console.log(result);
                    return getValue(peripheral, consts.BATTERY.SERVICE, consts.BATTERY.CHARACTERISTIC);
                })
                .then(result => {
                    // console.log(result);
                    return getValue(peripheral, consts.DEVICE_NAME.SERVICE, consts.DEVICE_NAME.CHARACTERISTIC);


                })
                .then(result => {
                    // console.log(result);
                    return getValue(peripheral, consts.TEMPERATURE.SERVICE, consts.TEMPERATURE.CHARACTERISTIC);
                })
                .then(result => {
                    // console.log(result);
                    return setValue(peripheral, consts.TEMPERATURE.SERVICE, consts.TEMPERATURE.CHARACTERISTIC);
                })
                // .then(result => {
                //     // console.log(result);
                //     return getValue(peripheral, consts.TEMPERATURE.SERVICE, consts.TEMPERATURE.CHARACTERISTIC);
                // })
                .then(() => { disconn(peripheral); })
                .catch(result => console.log(result))
            
            // sleep(15).then(() => { disconn(peripheral); });
        });
    }   
});

function loginWithPin(peripheral, SERVICE, CHARACTERISTIC) {
    return new Promise((resolve, reject) => {
        peripheral.discoverSomeServicesAndCharacteristics(SERVICE, CHARACTERISTIC, (error, services, characteristics) => {
            if (error) { console.log("error occured"); }
            if (services[0] && characteristics[0]) {
                //console.log("characteristic.uuid for writing=" + characteristics[0].uuid);
                characteristics[0].write(new Buffer.from([0x1100]), false, function (error) {
                    if (!error) {
                        //console.log('login PIN written...');
                        resolve("login PIN written...");
                    } else {
                        reject("PIN could not be written");
                    }
                });
            } else {
                console.log("no service or characteristic found");
                reject("no Value read");
            }
        });
    });
}

function getValue(peripheral, SERVICE, CHARACTERISTIC) {
    return new Promise((resolve, reject) => {
        peripheral.discoverSomeServicesAndCharacteristics(SERVICE, CHARACTERISTIC, (error, services, characteristics) => {
            if (error) { console.log("error occured"); }
            if (services[0] && characteristics[0]) {
                // console.log("get characteristic.uuid=" + characteristics[0].uuid);
                characteristics[0].read((error, data) => {
                    if (error) { console.log("error occured"); }
                    // console.log("typeof(data)=" + typeof (data));
                    // console.log(JSON.stringify(data, null, 2));
                    // util.inspect(data);   
                    switch (CHARACTERISTIC) {
                        case consts.BATTERY.CHARACTERISTIC:
                            console.log("Battery=" + data.readUInt8(0) + "%");
                            break;
                        case consts.TEMPERATURE.CHARACTERISTIC:
                            // Get Temperature
                            // console.log(data); // show decrypt temp!
                            out = changeByteOrder(xxtea.decrypt(changeByteOrder(data), SECRETKEY));
                            // console.log(out);
                            iTemp = out[1];
                            console.log("IST-Temperatur=" + out[1] / 2);
                            console.log("Soll-Temperatur=" + out[0] / 2);
                            break;
                        case consts.DEVICE_NAME.CHARACTERISTIC:
                            out = changeByteOrder(xxtea.decrypt(changeByteOrder(data), SECRETKEY));
                            console.log("Device Name=" + out);
                            break;
                        default:
                            console.log("no output");
                    }
                    if (!error) {
                        resolve(true);
                    } else {
                        reject("no Value read");
                    }
                });
            } else {
                console.log("no service or characteristic found");
                reject("no Value read");
            }
        });
    });
}

function setValue(peripheral, SERVICE, CHARACTERISTIC) {
    return new Promise((resolve, reject) => {
        peripheral.discoverSomeServicesAndCharacteristics(SERVICE, CHARACTERISTIC, (error, services, characteristics) => {
            if (error) { console.log("error occured"); }
            if (services[0] && characteristics[0]) {
                // console.log("set characteristic.uuid=" + characteristics[0].uuid);
                characteristics[0].read((error, data) => {
                    if (error) { console.log("error occured"); }
                    switch (CHARACTERISTIC) {
                        case consts.TEMPERATURE.CHARACTERISTIC:
                            // Change Temperature to desiredTemp 
                            if (desiredTemp != "") {
                                const buf = Buffer.from([Math.round(desiredTemp * 2), iTemp, 0, 0, 0, 0, 0, 0]);
                                console.log("set Temp to " + desiredTemp);
                                encryptedvalue = changeByteOrder(xxtea.encrypt(changeByteOrder(buf), SECRETKEY));
                                characteristics[0].write(encryptedvalue);
                            }
                            break;
                        default:
                            console.log("no output");
                    }
                    if (!error) {
                        resolve();
                    } else {
                        reject("no Value read");
                    }
                });
            } else {
                console.log("no service or characteristic found");
                reject("no Value read");
            }
        });
    });
}


function changeByteOrder (data) {
    let byteArray = Buffer.from(data);    
    let length = byteArray.length;

    // padding
    let padding = Buffer.allocUnsafe(0);
    if (length%4) {
        padding = Buffer.from(4 - (length % 4));
    }
    byteArray = Buffer.concat([byteArray, padding], byteArray.length + padding.length);
    length = byteArray.length;

    // reversing
    for (let i = 0; i < length >> 2; i++) {
        let reversePart = byteArray.slice(i * 4, (i + 1) * 4);
        reversePart.reverse();
        let startPart = byteArray.slice(0, i * 4);
        let endPart = byteArray.slice((i + 1) * 4, byteArray.length);
        byteArray = Buffer.concat([startPart, reversePart, endPart], startPart.length + reversePart.length + endPart.length);
    }

    return byteArray;
}


function disconn(peripheral) {
    // console.log("\ndisconnection initialized");
    peripheral.disconnect(error => {
        if (error) {
            console.log("Could not disconnect");
        }
        console.log("disconnected");
        process.exit(0);
    });
}
noble.on('warning', () => {

    console.log("warning for whatever");
});

function sleep(s) {
    return new Promise(resolve => setTimeout(resolve, 1000*s));
}

