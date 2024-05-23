import {executeAT, logMessage, updateRoomMetadata, wait} from "../utils";
import {LogLevel, GPS} from "../types";

/**
 * Show / Send data to the parent process
 *
 * @param {any} data - Data to send
 * @returns {void}
 */
function sendData(data: any): void {
    if (process.send) {
        updateRoomMetadata(data)
    } else {
        logMessage(JSON.stringify(data), LogLevel.DATA);
    }
}

/**
 * Setup GPS data format and enable GPS
 *
 * @returns {Promise<void>}
 */
async function setupGPS(): Promise<void> {
    const gpsState: string = await executeAT(`AT+QGPS?`);
    if (gpsState.trim().startsWith("+QGPS: 0")) {
        // Set data format and enable GPS
        await executeAT(`AT+QGPSCFG=\"nmeasrc\",1`);
        await executeAT(`AT+QGPS=1`);
        wait(500);
        setTimeout(getGPSDatas);
    } else {
        // Disable GPS and re-init
        await executeAT(`AT+QGPSEND`);
        wait(500);
        await setupGPS();
    }
}

/**
 * Get network, signal and GPS data from the modem
 *
 * @returns {Promise<void>}
 */
async function getGPSDatas(): Promise<void> {
    // Get GPS data
    let gps: GPS | null = null;
    const gpsResponse: string = (await executeAT(`AT+QGPSLOC=1`)).trim();

    if (gpsResponse.startsWith("+QGPSLOC:")) {
        const data: Array<string> = gpsResponse.split(":")[1].trim().split(",");
        gps = {
            latitude: parseFloat(data[1].slice(0, 2)) + parseFloat(data[1].slice(2)) / 60,
            longitude: parseFloat(data[3].slice(0, 3)) + parseFloat(data[3].slice(3)) / 60,
            altitude: parseFloat(data[6]),
            speed: parseFloat(data[9]),
        };

        sendData({ gps: gps });
    }

    // Recursive call
    setTimeout(getGPSDatas, 500);
}

setTimeout(setupGPS);
