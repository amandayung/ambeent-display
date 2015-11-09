//most of the code used for using the Google Drive API was taken from the Google tutorials:
//API setup for node: https://developers.google.com/drive/web/quickstart/nodejs
//for getting Google Drive changes: https://developers.google.com/drive/v2/reference/changes/list
//for getting Google Drive revisions: https://developers.google.com/drive/v2/reference/revisions/list

var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');

var SCOPES = ['https://www.googleapis.com/auth/drive'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'drive-nodejs-tokens.json';
var hasToken = false;

//adding the ability to send data through the serial port
var serialport = require('serialport');
var SerialPort = serialport.SerialPort;
var portName = 'COM6'; //change this to be your serial port name
var useSerial = true; //set this to true if the Photon will receive data via the serial port; false if instead through the cloud

//otherwise, if using the cloud, set the particle function names that are setup with Photon
var activityFunction = "activity";
var changesFunction = "unviewed";

//need https for POST-ing to api.particle.io
var http = require('https');
var querystring = require('querystring');

var intervalTime = 10000; //ms, time for checking for any activity updates
var device = "add-photon-device-id-here"; //*** ADD PHOTON DEVICE ID HERE
var token = "add-photon-token-here"; //*** ADD PHOTON TOKEN HERE
var changeId = 0; //starts at 0 for the first call, then updates to get most recent changes (see Google Drive changes API)
var lastChangeTime = 0; //keeps track of last time (measured in unix time) there was a google doc revision
var editDelta = 0; //time difference between last edit and current time (ms)
var totalUnviewedChanges = 0; //keeps track of user's number of unviewed changes

var fileIds = []; //stores any file ids that have been marked as changed

//Hook up the serial port if it's being used
//this code was from: https://github.com/hcin720-fall15/IA2
if (useSerial) {
  var serial = new SerialPort( portName,
   {parser: serialport.parsers.readline('\n')});

  //When the serial port is successfully opened...
  serial.on('open', function()
  {
    console.log("opened serial port");
    //When we get data from the serial port...
    serial.on('data', function(data)
    {
      console.log("got some data from Photon: ", data);
    });

  });
}


// Load client secrets from a local file.
fs.readFile('client_secret.json', function processClientSecrets(err, content) {
  if (err) {
    console.log('Error loading client secret file: ' + err);
    return;
  }

  //now start getting updates about Google Drive activity
  watchActivity(JSON.parse(content));
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  var clientSecret = credentials.installed.client_secret;
  var clientId = credentials.installed.client_id;
  var redirectUrl = credentials.installed.redirect_uris[0];
  var auth = new googleAuth();
  var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, function(err, token) {
    if (err) {
      getNewToken(oauth2Client, callback);
    } else {
      oauth2Client.credentials = JSON.parse(token);
      hasToken = true; //updates that we do have a token
      callback(oauth2Client);
    }
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter the code from that page here: ', function(code) {
    rl.close();
    oauth2Client.getToken(code, function(err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      hasToken = true;
      callback(oauth2Client);
    });
  });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code != 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token));
  console.log('Token stored to ' + TOKEN_PATH);
}


//start watching for any new activity on user's Google Drive
function watchActivity(client_secret) {
  //first update the startChangeID
  authorize(client_secret, getChangeId);

  //then continuously check for updates
  setInterval( function() {
      // Authorize a client with the loaded credentials, then call the
      // Google Apps Drive API to get any changes

      //need to check this so that initial setup doesn't get stuck in loop
      if (hasToken) {
        authorize(client_secret, listChanges);
      }
  }, intervalTime);
}


//this gets the latest change ID when the server first starts
//the change ID ensures that the most recent changes since the last call are being retrieved (no repeats)
function getChangeId(auth) {
  var service = google.drive('v2');
  service.changes.list({
    auth: auth
  }, function(err, response) {
    if (err) {
      console.log('The API returned an error: ' + err);
      return;
    }

    //get latest changeID
    changeId = parseInt(response.largestChangeId) + 1;
  });
}


//get list of recent changes
function listChanges(auth) {
  console.log("checking for changes for changeID: " + changeId);

  //for keeping track of last revision time
  var lastRevisionTime = 0;

  var service = google.drive('v2');
    service.changes.list({
    auth: auth,
    startChangeId: changeId
  }, function(err, response) {
    if (err) {
      console.log('The API returned an error: ' + err);
      numChanges = 0;
      return;
    }

    var changes = response.items;

    //if there are no changes, don't update change ID
    if (changes.length == 0) {
      console.log('No changes.');
      numChanges = 0;

      //if there aren't any immediate changes, check the docs that have already been edited
      for (var i = 0; i < fileIds.length; i++) {
        console.log("checking file: " + fileIds[i]);
        //this uses a different API call
        getLastRevision(auth, fileIds[i]);
      }
    } 

    //otherwise, get the changes
    else {
      //console.log('Recent changes:');

      for (var i = 0; i < changes.length; i++) {
        var change =  changes[i];
        if (change.kind == "drive#change") {
          /*console.log("kind: " + change.file.kind);
          console.log("title: " + change.file.title);
          console.log("modifiedDate: " + change.file.modifiedDate);
          console.log("lastModifyingUserName: " + change.file.lastModifyingUserName);
          console.log("lastModifiedByMeDate:" + change.file.modifiedByMeDate);
          console.log("lastViewedByMe:" + change.file.lastViewedByMeDate);
          console.log("version: " + change.file.version);*/

          //get the last time the document was viewed by the user
          var lastViewTime = Date.parse(change.file.lastViewedByMeDate);
          //get the last time the document was modified (either by user or someone else)
          var lastModifyTime = Date.parse(change.file.modifiedDate);

          //if the last view time was the same time or after the last modification, then reset number of unviewed changes
          if (lastViewTime - lastModifyTime >= 0) {
            totalUnviewedChanges = 0;
          }
          //otherwise, update number of unviewed changes
          else {
            totalUnviewedChanges++;
          }

          //get file id
          var fileId = change.file.id;
          //if a unique ID, add to file list
          if (fileIds.indexOf(fileId) == -1) {
            fileIds.push(fileId);
          }
        }
      }

      //update time difference between last modification time and current time
      if (Date.parse(changes[changes.length-1].file.modifiedDate) > lastChangeTime) {
        lastChangeTime = Date.parse(changes[changes.length-1].file.modifiedDate);
        editDelta = Date.now() - lastChangeTime;

        //send data
        if (useSerial) {
          sendSerialData();
        }
        else {
          sendCloudData(editDelta, activityFunction);
          sendCloudData(totalUnviewedChanges, changesFunction);
        }
      }

      //now update change ID for next call
      changeId = parseInt(response.largestChangeId) + 1;
    }
  });
}

//retrieve the latest revisions to a document
function getLastRevision(auth, fileId) {
  console.log("getting revisions...");
  var service = google.drive('v2');
  service.revisions.list({
    auth: auth,
    fileId: fileId
  }, function(err, response) {
    if (err) {
      console.log('The API returned an error: ' + err);
      return;
    }
    var revisions = response.items;
    if (revisions.length == 0) {
      console.log('No revisions.');
    } else {
      console.log('Latest revision:');
      console.log(revisions[revisions.length-1].modifiedDate);

      //get modification time (parsed as unix time)
      var lastRevisionTime = Date.parse(revisions[revisions.length-1].modifiedDate);

      if (lastRevisionTime > lastChangeTime) {
        lastChangeTime = lastRevisionTime;
        editDelta = Date.now() - lastChangeTime;

        console.log("sending revision data...");
        if (useSerial) {
          sendSerialData();
        }
        else {
          sendCloudData(editDelta, activityFunction);
        }
      }
    }
  });
}


//send changes/revisions data via serial
function sendSerialData() {
  if(serial.isOpen()) {
    //format data in JSON
    data = JSON.stringify({
      editDelta: editDelta,
      unviewed: totalUnviewedChanges
    });
    serial.write(data + '\n');
    console.log("Send '" + data + "' to serial");
  }
  else {
    console.log("Serial port not open");
  }
}

/* POST to particle.io to send data via the cloud
** this was modeled after these helpful posts:
** http://book.mixu.net/node/ch10.html
** http://stackoverflow.com/questions/13042841/node-js-http-post-not-working 
*/
//sends the specified data via the given photon function
function sendCloudData(data, photonFunc) {
  //format data for POST-ing
  var post_data = querystring.stringify({
    args: data
  });

  var options = {
    host: "api.particle.io",
    path: "/v1/devices/" + device + "/" + photonFunc + "?access_token=" + token,
    port: '443', //need to send via https
    method: 'POST',
    headers: { "Content-type": "application/x-www-form-urlencoded" }
  };

  //this retrieves the photon's response
  //node retrieves the response in chunks
  callback = function(response) {
    var str = '';
    response.on('data', function (chunk) {
      str += chunk;
    });

    //output end response
    response.on('end', function () {
      console.log(str);
    });
  }

  var req = http.request(options, callback);
  //data to be posted
  req.write(post_data);
  req.end();
}