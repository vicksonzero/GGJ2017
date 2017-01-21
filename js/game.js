
/* global soundModule */
var yAxis = p2.vec2.fromValues(0, 1);
const DEADLINE_HEIGHT = 160;
const PLATFORM_WIDTH = 100;
const PLAYER_INIT_LIFE_COUNT = 4;
const PLAYER_CHEAT_LIFE_COUNT = 4000;
const NUMBER_OF_PITCH = 12;
const SUPER_COOL_DOWN = 2;
const KNIFE_COOL_DOWN = 5000;


function indexToGameHeight(index) {
  var total = game.height - 160;
  return index * total / NUMBER_OF_PITCH;
}

let stageID = 0;
const stageList = [
  'setup_level_1',
  'setup_level_2',
  'setup_level_3',
];

const stage3List = [
  'setup_level_3_stage_1',
  'setup_level_3_stage_2',
  'setup_level_3_stage_3',
];

class State extends Phaser.State {
  preload() {
    game.load.image('character', 'assets/sprites/character.png');
    game.load.image('wall', 'assets/sprites/platform.png');
    game.load.image('background', 'assets/sprites/dayBG.png');
    game.load.image('spears', 'assets/sprites/spikes.png');
    game.load.image('scroll', 'assets/sprites/scroll.png');
    game.load.image('knife', 'assets/sprites/knife.png');
  }


  create() {
    game.add.tileSprite(0, 0, 1280, 720, 'background');

    this.lifeText = game.add.text(20, 20, "4", {
      font: "30px Arial black",
      fill: "#ff0044",
      align: "center"
    });

    this.lifeText.anchor.setTo(0, 0);


    this.gotScrollText = game.add.text(game.width - 20, 20, "0", {
      font: "30px Arial black",
      fill: "#00ff44",
      align: "center"
    });
    this.gotScrollText.anchor.setTo(1, 0);

    this.winlText = game.add.text(game.width / 2, game.height / 2, "You Win!", {
      font: "60px Arial black",
      fill: "#00ff44",
      stroke: "#00ff44",
      align: "center"
    });
    this.winlText.anchor.setTo(0.5);
    this.winlText.visible = false;

    game.stage.backgroundColor = "#4488AA";

    this.cursors = game.input.keyboard.createCursorKeys();

    this.jumpTimer = 0;
    this.scrollGoal = 0;

    //  Enable p2 physics
    game.physics.startSystem(Phaser.Physics.P2JS);

    game.physics.p2.gravity.y = 200;
    game.physics.p2.world.defaultContactMaterial.friction = 0.3;
    game.physics.p2.world.setGlobalStiffness(1e5);

    //  Create our collision groups. One for the player, one for the music floors
    this.playerCollisionGroup = game.physics.p2.createCollisionGroup();
    this.musicFloorCollisionGroup = game.physics.p2.createCollisionGroup();
    this.deadCollisionGroup = game.physics.p2.createCollisionGroup();
    this.scrollCollisionGroup = game.physics.p2.createCollisionGroup();

    // to still collide with the world bounds
    game.physics.p2.updateBoundsCollisionGroup();

    // for (let i = 0; i < 100; i++) {
    //   const wall = this.createWall(100 * i, 500);
    // }
    this.musicFloors = [];
    const wall = this.createWall(PLATFORM_WIDTH / 2, 400);
    var currentMusicX = PLATFORM_WIDTH * 1.5;
    while (currentMusicX < game.width) {
      const musicFloor = this.createMusicFloor(currentMusicX, 500);
      this.musicFloors.push(musicFloor);
      currentMusicX += PLATFORM_WIDTH;
    }

    this.player = game.add.sprite(PLATFORM_WIDTH / 2, 300, 'character');
    this.player.lifeCount = PLAYER_INIT_LIFE_COUNT;
    if (window.location.href.split('?')[1]=='c'){ this.player.lifeCount = PLAYER_CHEAT_LIFE_COUNT; }

    //  Enable if for physics. This creates a default rectangular body.
    game.physics.p2.enable(this.player);

    this.player.body.setCollisionGroup(this.playerCollisionGroup);
    this.player.body.collides([this.playerCollisionGroup, this.musicFloorCollisionGroup]);
    this.player.body.collides([this.deadCollisionGroup, this.scrollCollisionGroup]);


    //  Check for the block hitting another object
    this.player.body.onBeginContact.add(this.touchPlayer, this);
    this.deadzones = this.setupDeadZones();
    this.scrolls = this.setup_level_1();
    this.player.scollGot = 0;
    this.scrollGoal = this.scrolls.length;

    this.knifeIsCooldown = false;

    soundModule.signal.add((...params) => { this.onSound(...params); });
  }

  setPlayerSuper() {
    var that = this;
    this.playerSuper = true;
    this.superTimer = setTimeout(function () { that.playerSuper = false; }, SUPER_COOL_DOWN);
  }


  setKnifeTimeout() {
    var that = this;
    this.knifeIsCooldown = true;
    this.knife = null;
    this.knifeTimer = setTimeout(function () { that.knifeIsCooldown = false; }, KNIFE_COOL_DOWN);
  }

  setup_level_1() {
    console.log('setup_level_1');
    var output = [];
    var scroll = game.add.sprite(1130, 150, 'scroll');
    //  Enable if for physics. This creates a default rectangular body.
    game.physics.p2.enable(scroll);
    scroll.body.static = true;

    scroll.body.setCollisionGroup(this.scrollCollisionGroup);
    scroll.body.collides([this.playerCollisionGroup]);
    output.push(scroll);
    this.knifeEnabled = true;
    return output
  }

  setup_level_2() {
    console.log('setup_level_2');
    var output = [];

    var scrollCoord = [[1250, 150], [830, 400], [430, 320]]

    for (var i = 0; i < scrollCoord.length; i++) {
      var scroll = game.add.sprite(scrollCoord[i][0], scrollCoord[i][1], 'scroll');
      //  Enable if for physics. This creates a default rectangular body.
      game.physics.p2.enable(scroll);
      scroll.body.static = true;

      scroll.body.setCollisionGroup(this.scrollCollisionGroup);
      scroll.body.collides([this.playerCollisionGroup, this.scrollCollisionGroup]);
      output.push(scroll);
    }
    return output
  }

  setup_level_3() {
    console.log('setup_level_3');

  }

  setup_level_3_stage_1() {
    console.log('setup_level_3_stage_1');
    var output = [];
    var scroll = game.add.sprite(230, 150, 'scroll');
    //  Enable if for physics. This creates a default rectangular body.
    game.physics.p2.enable(scroll);
    scroll.body.static = true;

    scroll.body.setCollisionGroup(this.scrollCollisionGroup);
    scroll.body.collides([this.playerCollisionGroup, this.scrollCollisionGroup]);
    output.push(scroll);
    return output
  }

  setup_level_3_stage_2() {
    console.log('setup_level_3_stage_2');
    var output = [];
    var scroll = game.add.sprite(430, 280, 'scroll');
    //  Enable if for physics. This creates a default rectangular body.
    game.physics.p2.enable(scroll);
    scroll.body.static = true;

    scroll.body.setCollisionGroup(this.scrollCollisionGroup);
    scroll.body.collides([this.playerCollisionGroup, this.scrollCollisionGroup]);
    output.push(scroll);
    return output
  }

  setup_level_3_stage_3() {
    console.log('setup_level_3_stage_3');
    var output = [];
    var scroll = game.add.sprite(830, 380, 'scroll');
    //  Enable if for physics. This creates a default rectangular body.
    game.physics.p2.enable(scroll);
    scroll.body.static = true;

    scroll.body.setCollisionGroup(this.scrollCollisionGroup);
    scroll.body.collides([this.playerCollisionGroup, this.scrollCollisionGroup]);
    output.push(scroll);
    return output
  }

  createKnife(y_index) {
    const knife = game.add.sprite(game.width, indexToGameHeight(y_index), 'knife');
    game.physics.p2.enable(knife);
    knife.body.kinematic = true;
    knife.body.setCollisionGroup(this.deadCollisionGroup);
    knife.body.collides(this.playerCollisionGroup);
    knife.body.moveLeft(256);
    this.knife = knife;
  }

  moveKnife(y_index) {
    if (this.knife) {
      this.knife.body.y = (this.knife.body.y + indexToGameHeight(y_index)) / 2;
    }
  }

  setupDeadZones() {
    var currentX = 0;
    var output = [];
    const deadline_y = game.height - DEADLINE_HEIGHT / 2;
    while (currentX < game.width) {
      var deadzone = game.add.sprite(currentX, deadline_y, 'spears');
      deadzone.anchor.setTo(0, 0);
      game.physics.p2.enable(deadzone);
      deadzone.body.y = game.height - DEADLINE_HEIGHT / 2;
      deadzone.body.static = true;
      deadzone.body.setCollisionGroup(this.deadCollisionGroup);

      deadzone.body.collides(this.playerCollisionGroup);
      output.push(deadzone);
      currentX += deadzone.width;
    }
    return output;
  }

  update() {

    if (this.cursors.left.isDown) {
      this.player.body.moveLeft(200);

      // if (player.facing != 'left') {
      //   player.facing = 'left';
      // }
    }
    else if (this.cursors.right.isDown) {
      this.player.body.moveRight(200);

      // if (player.facing != 'right') {
      //   player.facing = 'right';
      // }
    } else {
      this.player.body.velocity.x = 0;

      // if (player.facing != 'idle') {

      //   if (player.facing == 'left') {
      //   }
      //   else {
      //   }

      //   player.facing = 'idle';
      // }
    }

    if (this.cursors.up.isDown && game.time.now > this.jumpTimer && this.checkIfCanJump()) {
      this.player.body.moveUp(300);
      this.jumpTimer = game.time.now + 750;
    }
    if (this.knife && this.knife.x < 0) {
      this.knife.destroy();
      this.setKnifeTimeout();
    }
  }

  checkIfCanJump() {

    var result = false;

    for (var i = 0; i < game.physics.p2.world.narrowphase.contactEquations.length; i++) {
      var c = game.physics.p2.world.narrowphase.contactEquations[i];

      if (c.bodyA === this.player.body.data || c.bodyB === this.player.body.data) {
        var d = p2.vec2.dot(c.normalA, yAxis);

        if (c.bodyA === this.player.body.data) {
          d *= -1;
        }

        if (d > 0.5) {
          result = true;
        }
      }
    }

    return result;

  }

  touchPlayer(body, bodyB, shapeA, shapeB, equation) {
    // console.log("touchPlayer");
    if (body && body.sprite && (body.sprite.key === 'spears' || body.sprite.key === 'knife') && !this.playerSuper) {
      console.log("spears or knife");
      this.player.lifeCount--;
      this.lifeText.setText(this.player.lifeCount);
      this.player.body.y = 30;
      this.checkLose();
    } else if (body && body.sprite && body.sprite.key === 'scroll') {
      console.log("scroll");
      this.getScroll();
      body.sprite.destroy();
    }
  }

  getScroll(sprite1, sprite2) {
    this.player.scollGot++;
    this.gotScrollText.setText(this.player.scollGot);
    console.log('getScroll', this.player.scollGot, this.scrollGoal);

    if (this.player.scollGot >= this.scrollGoal) {
      this.win();
    }
  }

  win() {
    console.log('win');
    this.winlText.visible = true;

    setTimeout(() => {
      this.winlText.visible = false;

      this.cleanUp();

      this.nextRoom();
    }, 2000);
  }

  lose() {
    console.log('lose');
    this.cleanUp();
  }

  cleanUp() {
    console.log('cleanUp');
    this.player.scollGot = 0;
  }

  nextRoom() {
    console.log('nextRoom');
    stageID++;
    this.scrolls = this[stageList[stageID]]();
    this.scrollGoal = this.scrolls.length;
  }

  checkLose() {
    if (this.player.lifeCount <= 0) {
      this.lose();
    }
  }

  onSound(y0Pitch, y1Pitch, y0Amplitude, y1Amplitude) {
    // console.log(y0Pitch + " " + y1Pitch);
    const normalized0 = y0Pitch ;
    const normalized1 = y1Pitch ;
    var index = Math.round(normalized0 * NUMBER_OF_PITCH) % NUMBER_OF_PITCH;
    var index1 = Math.round(normalized1 * NUMBER_OF_PITCH) % NUMBER_OF_PITCH;
    //var singIndex = Math.round(normalized0 * 11);
    // console.log('noteStrings', soundModule.noteStrings[index]);
    //console.log('onSound',
    // normalized0, soundModule.noteStrings[singIndex],
    // normalized1, '');
    this.musicFloors.forEach((elem, id) => {
      if (Math.abs(id - index) < 3) {
        // const heightLimit = 500 - y0Amplitude * 70;
        const heightLimit = 500 - 400;
        if (elem.y > heightLimit) {
          elem.body.moveUp(300);
        } else {
          elem.body.y = heightLimit;
          elem.body.setZeroVelocity();
        }
        elem.loadTexture('wall');
      } else {
        elem.loadTexture('wall');

        if (elem.y < game.height - DEADLINE_HEIGHT) {
          elem.body.moveDown(80);
        } else if (elem.y < game.height) {
          elem.body.moveDown(40);
        } else {
          elem.body.y = game.height;
          elem.body.setZeroVelocity();
        }

        // elem.y = Phaser.Math.linear(elem.y, 500, 0.01);
      }
    });

    if (normalized1 > 0 && this.knifeEnabled) {
      if (!this.knife && !this.knifeIsCooldown) {
        this.createKnife(index1);
      } else {
        this.moveKnife(index1);
      }
    }
  }

  createWall(x, y) {
    var wall = game.add.sprite(x, y, 'wall');
    game.physics.p2.enable(wall);
    wall.body.static = true;

    wall.body.setCollisionGroup(this.playerCollisionGroup);
    wall.body.collides([this.playerCollisionGroup]);
    return wall;
  }

  createMusicFloor(x, y) {
    var wall = game.add.sprite(x, y, 'wall');
    game.physics.p2.enable(wall);
    wall.body.kinematic = true;

    wall.body.setCollisionGroup(this.musicFloorCollisionGroup);
    wall.body.collides([this.playerCollisionGroup, this.musicFloorCollisionGroup]);
    return wall;
  }
}

var game = new Phaser.Game(
  1280, 720, Phaser.AUTO, 'wrapper', new State());
