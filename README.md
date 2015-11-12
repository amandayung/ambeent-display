# Am-bee-nt Display
The Am-bee-nt Display visualizes group collaboration in a user's Google Drive. The display design uses the metaphor of group collaborators as worker bees.

It is composed of a hexagonal box made of wood and acrylic. The acrylic portion of the display has been designed to appear like oozing honey. There are also wooden magnetic bees attached to the top of the display. The display has two main outputs:
* The bees move around in a circle to indicate realtime changes to a Google Doc.
* The display glows golden yellow as unviewed changes are made to the document. The display stops glowing once the user has viewed the changes.

It uses a [Photon](https://store.particle.io/?product=particle-photon) to power the display's output.

### Video and Images

[**Link to video of display in action!**](https://github.com/amandayung/ambeent-display/raw/master/images/Ambeent%20Video.mp4)

*Outside of the display*
![outside of the display](https://raw.githubusercontent.com/amandayung/ambeent-display/master/images/Top%20view.jpg)

![outside of the display, side view](https://raw.githubusercontent.com/amandayung/ambeent-display/master/images/Side%20view.jpg)

![close up of bees](https://raw.githubusercontent.com/amandayung/ambeent-display/master/images/Bee%20close%20up.jpg)


*Inside of the display*

(The inside of the box is lined with aluminum foil and yellow cellophane for a brighter, yellower light.)

![inside of the display](https://raw.githubusercontent.com/amandayung/ambeent-display/master/images/display-inside1.png)

![inside of the display with spoke](https://raw.githubusercontent.com/amandayung/ambeent-display/master/images/display-inside2.png)

### Circuit
![circuit](https://raw.githubusercontent.com/amandayung/ambeent-display/master/images/circuit.png)

Components:
* 1 Photon
* 1 3V DC motor
* 1 290 Ω resistor
* 1 1N4001 diode
* 1 2N3904 transistor
* 1 RGB LED
* 3 220 Ω resistor

Guides used for help to assemble the circuit:
* https://learn.adafruit.com/adafruit-arduino-lesson-13-dc-motors/overview
* https://learn.adafruit.com/adafruit-arduino-lesson-3-rgb-leds/overview


### Paper Prototype
![paper prototype](https://raw.githubusercontent.com/amandayung/ambeent-display/master/images/prototype1.png)

![paper prototype with "LED" on](https://raw.githubusercontent.com/amandayung/ambeent-display/master/images/prototype2.png)


## Details
The information used in the display is pulled from a user's Google Drive activity via the Google Drive API. The information used in the display is (1) the time the most recent revision to any Google Document in the user's Google Drive was made, and (2) the number of changes that have not been viewed by the user. We use a node.js server to handle all API calls and for sending the data. This data can be sent to the Photon both via the cloud and via the serial port.
 
### Revision Tracker
Since Google Drive is a collaborative tool, revisions can be made by any collaborator whom a user's document is shared with, or who has shared a document with the user. Google Drive automatically saves revisions, which are reported via the Google Drive API using the [Revisions resource](https://developers.google.com/drive/v2/reference/revisions).

These changes in realtime are then output as bee movement in the ambient display. The main components used for this movement is a **3V DC motor** and small **magnets**. The motor speed is controlled based on the recency of a revision: if a revision was made in the past 30 seconds, the motor rotates at its fastest speed. As time passes, the motor slows down -- once the revision is at least 2 minutes old, the motor stops until a new revision is made. 

The motor movement controls the rotation of the bees. A spoke system is attached to the motor, with magnets at the end of each of the 3 spokes. On the underside of each bee is also a magnet. The spoke magnets and the bee magnets then attach to one another to move the bees with the motor rotation. The magnetic connection allows the bees to have more sporadic motion as well (as the bees can rotate freely), which results in more bee-like motion. Using magnets also provides a way to hide the mechanics of the ambient display, since the motor and any part physically connected to the motor is not visible.


### Unviewed Changes Tracker
In order to keep track of if the user has viewed these changes or not, the Google Drive API is also used to pull the last time the user viewed the changes using the [Changes resource](https://developers.google.com/drive/v2/reference/changes). This timestamp is used to calculate the number of unviewed changes that have been made to their Google Drive documents.

These unviewed changes are visualized using a **yellow LED**. In this particular setup, we implemented an RGB LED and used only the red and green components. The brightness of the LED roughly indicates how much their Drive has changed. As more unviewed changes occur, the LED intensity increases. This allows the user to be aware of how much has been modified since the last time they viewed their Drive. Once a user then opens their Drive and views these changes made by their collaborators, the LED then turns off. It turns on again once more unviewed changes are made.

The LED light can be seen through the acrylic of the ambient display. To build off of the worker bee metaphor, the acrylic has been cut to appear like honey. As the LED gets brighter, the user can see the bees making more honey -- or equivalently, they can see their collaborators are being productive. We also chose the LED output through the "honey acrylic" to again move away from a technological look of the display. We wanted to reinforce the worker bee metaphor.


## Design Justification

Previous research that distributed work environments are less productive than work environments where collaborators are collocated [3]. A couple of reasons for this may be that distributed work environments do not allow for spontaneous interactions, and additionally that remote collaborators cannot be easily aware of everyone else's input to the work [2,3]. Röcker et al. outlined the following user requirements to improve awareness in distributed teams [3]:

* Presence and availability information
* Avoiding interruptions
* Delivering peripheral awareness
* Reducing information overload
* Easy and intuitive interaction


Several research groups have designed ambient displays as an attempt to improve this type of work environment, also known as computer supported cooperative work (CSCW). One early example is the Awareness Monitor, which is a simple graphical icon displayed on one's monitor to show asynchronous information pertinent to the user, such as shared folder activity [1]. Another example is the Hello.Wall which displays different light patterns based on factors of the remote team, such as the general mood of the team and the number of people present in the remote work space [3].

Building off this past work and using Röcker et al.'s ambient display requirements as a guideline, we designed our own ambient display for improving CSCW. We decided to make a display using Google Drive as our source of information since it is a highly used remote collaborative tool. However, one of its limitations is that a user must be actively using Google Drive in order to 

Our display shows *presence and availability information* through the movement of the bees: when the bees are moving, this indicates that someone is working on a Google document in realtime. Consequently, the user can tell when someone is currently working on a document, and can decide to spontaneously join their collaborator in document writing.

With the simple motion of the bees and the slowly increasing brightness of the LED, our ambient display also *avoids interruptions* with a user's workflow. Since the display can be placed anywhere on one's desk, it can also *deliver peripheral awareness* when a user glances at the display to see any current document activity or any previous activity that the user has not seen yet.

The simple amount of information with gradual changes to show either how recent a revision was as well as how much has changed help to *reduce information overload*. Finally, the display has *easy and intuitive interaction* since the display only needs to be quickly glanced at in order to obtain useful information about Google Drive activity. The LED resets itself based on information sent by the Google API about the last time the user viewed their Google Drive.

We chose the worker bee / busy bees metaphor, as it is a common metaphor used when imagining a group collaborating together to get something done. Consequently, it is easy to understand the display at a glance: when the bees are moving, work is currently happening; when there is honey, there is actual output from the bees/collaborators working together.




### References
[1] Cadiz, J. J., Fussell, S. R., Kraut, R. E., Lerch, F. J., & Scherlis, W. L. (1998). The Awareness Monitor : A Coordination Tool for Asynchronous , Distributed Work Teams. Unpublished Manuscript, (September), 8.

[2] Otjacques, B., McCall, R., & Feltz, F. (2006). An Ambient Workplace for Raising Awareness of Internet-Based Cooperation. Cooperative Design, Visualization, and Engineering, 4101, 275 – 286. doi:10.1007/11863649_34

[3] Röcker, C., Prante, T., & Streitz, N. a. (2004). Using Ambient Displays and Smart Artefacts to Support Community Interaction in Distributed Teams. Proceedings of the Conference of the Australian Computer-Human Interaction Special Interest Group (OzCHI’04), 22–24.