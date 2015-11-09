//this library allows us to easily parse JSON data that is received
//documentation is at:
//https://github.com/menan/SparkJson
#include "SparkJson/SparkJson.h"

//DC motor tutorial used: 
//https://learn.adafruit.com/adafruit-arduino-lesson-13-dc-motors/overview

//RGB LED tutorial used:
//https://learn.adafruit.com/adafruit-arduino-lesson-3-rgb-leds/overview

//uncomment this line if using a Common Anode LED
#define COMMON_ANODE

//RGB LED output pins
int redPin = D0;
int greenPin = D1;
int bluePin = D2;

int motorPin = D3; //motor output pin

unsigned long startTime = 0; //stores time of the start of the server
String inputString = ""; //stores received data
boolean stringComplete = false;  // whether the received string is complete

//variables for motor control
unsigned long lastEditTime = 0; //keeps track of when the last google doc revision was
int maxMotorSpeed = 256; //max motor speed (technically 255, but need to use 256 for clean division)
int currentMotorSpeed = 0; //current speed of the motor
int newMotorSpeed = 0; //stores what the motor speed needs to be changed to
int numSpeedLevels = 4; //the number of speed levels that motor can be in
int levelDuration = 30000; //how long a speed level lasts for (in ms)
boolean changeMotorSpeed = false; //keeps track of whether to change motor speed or not

//for seeing the general status of activity since the last time you saw the document
int totalUnviewedChanges = 0; //keeps track of total unviewed changes in one's google drive
int maxRedBrightness = 256; //max red level (technically 255, but need to use 256 for clean division)
int maxGreenBrightness = 256; //max green level
int maxBlueBrightness = 0; //blue isn't used to make yellow
int numLightLevels = 4; //number of brightness levels the LED can be in

//runs when the photon starts up
void setup() {
      
    //open serial port   
    Serial.begin(9600);
    
    //set RGB LED pins
    pinMode(redPin, OUTPUT);
    pinMode(greenPin, OUTPUT);
    pinMode(bluePin, OUTPUT);
    
    //set motor pin
    pinMode(motorPin, OUTPUT);
    
    //update last time there was a revision
    Spark.function("activity", setActivity);
    
    //update number of unviewed changes
    Spark.function("unviewed", setUnviewedChanges);
    
    //set aside space for receiving serial data
    inputString.reserve(200);

    //turn off photon LED so that it doesn't interfere with other LED output
    RGB.control(true);
    RGB.color(0, 0, 0);
    
    //also turn off main LED for now
    setColor(0,0,0);
    
    //get start time of photon
    startTime = millis();
}

//runs over and over
void loop() {
    //check if the motor speed needs to be updated
    if (changeMotorSpeed || currentMotorSpeed > 0) {
        
        //get current time
        unsigned long currentTime = startTime + millis();
        
        //determine how much time has passed since the last edit
        int msDifference = currentTime - lastEditTime;
        
        //convert this to one of the motor speeds (binning time)
        int msBin = msDifference / levelDuration;
        if (msBin >= numSpeedLevels) {
            currentMotorSpeed = 0;
        }
        else {
            //the -1 is so that it doesn't go over 255
            currentMotorSpeed = maxMotorSpeed - (maxMotorSpeed/numSpeedLevels)*msBin - 1;
        }
        //send this new speed to the motor
        analogWrite(motorPin, currentMotorSpeed);
        
        //change has been made, so update state
        if (changeMotorSpeed) {
            changeMotorSpeed = false;
        }
    }
}

//For learning how to use serialEvent, this tutorial was useful:
//https://www.arduino.cc/en/Tutorial/SerialEvent
void serialEvent()
{
    // get the new byte:
    char inChar = (char)Serial.read();
    // add it to the inputString:
    inputString += inChar;
    // if the incoming character is a newline, set a flag
    // so the main loop can do something about it:
    if (inChar == '\n') {
      stringComplete = true;
    }
    
    //the string is finished, so now parse the data
    if (stringComplete) {
        //Serial.print(inputString);
        
        //char json[] = "{\"sensor\":\"gps\",\"time\":1351824120,\"data\":[48.756080,2.302038]}";

        //convert string to char array so that json can be parsed
        char json[200];
        inputString.toCharArray(json, 200);
        
        //now parse data
        StaticJsonBuffer<200> jsonBuffer;
        JsonObject& data = jsonBuffer.parseObject(json);
    
        //grab new values
        int eDelta = data["editDelta"];
        int numChanges = data["unviewed"];
        
        //now update display status
        updateLastEditTime(eDelta);
        updateLight(numChanges);

        //reset string
        inputString = "";
        stringComplete = false;
    }
}

//function called via the cloud for updating number of unviewed changes
int setUnviewedChanges(String changes) {
    int numChanges = changes.toInt();
    
    if (numChanges >= 0) {
        //update LED brightness based on number of unviewed changes
        updateLight(numChanges);
        return numChanges;
    }
    else {
        return -1;
    }
}

//function called via the cloud for updating last time a revision was made
int setActivity(String editDelta) {
    int eDelta = editDelta.toInt();
    
    if (eDelta >= 0) {
        //update motor speed based on most recent revision time
        updateLastEditTime(eDelta);
        return eDelta;
    }
    else {
        return -1;
    }
}

//updates the last revision time
void updateLastEditTime(int editDelta) {
    //convert this time to the photon's time
    lastEditTime = millis() - editDelta;
    
    //now need to change motor speed
    changeMotorSpeed = true;
}


//updates light brightness
void updateLight(int changes) {
    //no unviewed changes, so turn off the LED
    if (changes == 0) {
        totalUnviewedChanges = 0;
        setColor(0,0,0);
    }
    //otherwise, LED is brighter with the more unviewed changes there are
    else {
        totalUnviewedChanges = changes; //update total
        if (totalUnviewedChanges > numLightLevels) {
            totalUnviewedChanges = numLightLevels; //the LED can't get brighter than its max level
        }
        //set brightness levels based on number of unviewed changes
        //the -1 is for making sure they don't go over 255
        int redValue = totalUnviewedChanges*(maxRedBrightness/numLightLevels)-1;
        int greenValue = totalUnviewedChanges*(maxGreenBrightness/numLightLevels)-1;
        setColor(redValue, greenValue, 0);
    }
}

//set the RGB LED color
void setColor(int red, int green, int blue) {
    #ifdef COMMON_ANODE
        red = 255 - red;
        green = 255 - green;
        blue = 255 - blue;
    #endif
    analogWrite(redPin, red);
    analogWrite(greenPin, green);
    analogWrite(bluePin, blue);  
}

