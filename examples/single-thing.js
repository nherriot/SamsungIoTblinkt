
var Blinkt = require("node-blinkt");
// Create a blinkt object and set the lights onto a known OFF state
leds = new Blinkt();
leds.setup();
leds.clearAll();
leds.sendUpdate();
let onOff = false;							// A variable to set when a light is on or off


const {
  Action,
  Event,
  Property,
  SingleThing,
  Thing,
  Value,
  WebThingServer,
} = require('../index');
const uuidv4 = require('uuid/v4');


function switchOnOff(state) {
	console.log('Switching lights: ' + state);
	if (state){
		leds.setAllPixels(255, 255, 255, 1);
	} else {
		leds.clearAll();
	}
	leds.sendUpdate();
}


class OverheatedEvent extends Event {
  constructor(thing, data) {
    super(thing, 'overheated', data);
  }
}

class FadeAction extends Action {
  constructor(thing, input) {
    super(uuidv4(), thing, 'fade', input);
  }

  performAction() {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.thing.setProperty('brightness', this.input.brightness);
        this.thing.addEvent(new OverheatedEvent(this.thing, 102));
        resolve();
      }, this.input.duration);
    });
  }
}

function makeThing() {
  const thing = new Thing('Rainbow Lamp',
                          ['OnOffSwitch', 'Light'],
                          'A web connected lamp');

  thing.addProperty(
    new Property(thing,
                 'on',
                 new Value(true, (result) => {switchOnOff(result)}),
                 {
                   '@type': 'OnOffProperty',
                   label: 'On/Off',
                   type: 'boolean',
                   description: 'Whether the lamp is turned on',
                 }));
  thing.addProperty(
    new Property(thing,
                 'brightness',
                 new Value(50, () => {}),
                 {
                   '@type': 'BrightnessProperty',
                   label: 'Brightness',
                   type: 'number',
                   description: 'The level of light from 0-100',
                   minimum: 0,
                   maximum: 100,
                   unit: 'percent',
                 }));

  thing.addAvailableAction(
    'fade',
    {
      label: 'Fade',
      description: 'Fade the lamp to a given level',
      input: {
        type: 'object',
        required: [
          'brightness',
          'duration',
        ],
        properties: {
          brightness: {
            type: 'number',
            minimum: 0,
            maximum: 100,
            unit: 'percent',
          },
          duration: {
            type: 'number',
            minimum: 1,
            unit: 'milliseconds',
          },
        },
      },
    },
    FadeAction);

  thing.addAvailableEvent(
    'overheated',
    {
      description: 'The lamp has exceeded its safe operating temperature',
      type: 'number',
      unit: 'celsius',
    });

  return thing;
}

function runServer() {
  const thing = makeThing();

  // If adding more than one thing, use MultipleThings() with a name.
  // In the single thing case, the thing's name will be broadcast.
  const server = new WebThingServer(new SingleThing(thing), 8888);

  process.on('SIGINT', () => {
    server.stop();
    process.exit();
  });

  server.start();
}

runServer();
