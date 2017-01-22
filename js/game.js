
/* global soundModule */
var yAxis = p2.vec2.fromValues(0, 1);
const DEADLINE_HEIGHT = 160;
const PLATFORM_WIDTH = 100;
const PLAYER_INIT_LIFE_COUNT = 4;
const PLAYER_CHEAT_LIFE_COUNT = 4000;
const NUMBER_OF_PITCH = 13;
const SUPER_COOL_DOWN = 2;
const KNIFE_COOL_DOWN = 5000;
const FIREBALL_INTERVAL = 3000;
let roundEndText = '';

function indexToGameHeight(index) {
  var total = game.height - 160;
  return index * total / NUMBER_OF_PITCH;
}

let stageID = -1;
const stageList = [
  'setup_level_1',
  'setup_level_2',
  'setup_level_3_stage_1',
  'setup_level_3_stage_2',
  'setup_level_3_stage_3',
];

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

class State extends Phaser.State {
  preload() {
    game.load.image('character', 'assets/sprites/character.png');
    game.load.image('wall', 'assets/sprites/platform.png');
    game.load.image('background', 'assets/sprites/dayBG.png');
    game.load.image('spears', 'assets/sprites/spikes.png');
    game.load.image('scroll', 'assets/sprites/scroll.png');
    game.load.image('knife', 'assets/sprites/knife.png');
    game.load.image('fireball1', 'assets/sprites/energyball1.png');
    game.load.image('fireball2', 'assets/sprites/energyball2.png');
    game.load.image('arrowHint', 'assets/sprites/arrowKeys.png');
    game.load.image('micHint', 'assets/sprites/mic.png');
    game.load.atlasJSONHash('boss_ani', 'assets/sprites/boss_ani.png', 'assets/sprites/boss_ani.json');
  }


  create() {
    this.setUpKeyboard();
    game.stage.backgroundColor = "#4488AA";
    game.add.tileSprite(0, 0, 1280, 720, 'background');

    this.gameplayGroup = game.add.group();
    this.uiGroup = game.add.group();

    this.bloodBG = game.add.graphics(0, 0);
    this.bloodBG.beginFill(0xFF0000, 0.2);
    this.bloodBG.drawRect(0, 0, game.width, game.height);
    this.bloodBG.endFill();
    this.uiGroup.add(this.bloodBG);
    this.bloodBG.visible = false;

    this.lifeText = game.add.text(20, 20, "4", {
      font: "30px Arial black",
      fill: "#ff0044",
      align: "center"
    });

    this.lifeText.anchor.setTo(0, 0);
    this.uiGroup.add(this.lifeText);

    this.musicNoteText = game.add.text(20, game.height - 32, "4", {
      font: "24px Arial black",
      fill: "#ff0044",
      align: "center"
    });

    this.musicNoteText.anchor.setTo(0, 0);
    this.uiGroup.add(this.musicNoteText);

    this.gotScrollText = game.add.text(game.width - 20, 20, "0", {
      font: "30px Arial black",
      fill: "#00ff44",
      align: "center"
    });
    this.gotScrollText.anchor.setTo(1, 0);
    this.uiGroup.add(this.gotScrollText);

    this.winText = game.add.text(game.width / 2, game.height / 2, "You Win!", {
      font: "60px Arial black",
      fill: "#00ff44",
      stroke: "#118e00",
      strokeThickness: 2,
      align: "center",
    });
    this.winText.anchor.setTo(0.5);
    this.uiGroup.add(this.winText);
    this.winTextMinor = game.add.text(0, 60, "", {
      font: "20px Arial black",
      fill: "#00ff44",
      stroke: "#118e00",
      strokeThickness: 2,
      align: "center",
    });
    this.winTextMinor.anchor.setTo(0.5);
    this.winText.addChild(this.winTextMinor);
    this.winText.visible = false;

    this.finishWinText = game.add.text(game.width / 2, game.height / 2, "All Cleared!\nYou Win!", {
      font: "60px Arial black",
      fill: "#00ff44",
      stroke: "#118e00",
      strokeThickness: 2,
      align: "center",
    });
    this.finishWinText.anchor.setTo(0.5);
    this.finishWinText.visible = false;
    this.uiGroup.add(this.finishWinText);


    this.loseText = game.add.text(game.width / 2, game.height / 2, "Game Over", {
      font: "120px Arial black",
      fill: "#ff0044",
      stroke: "#8e1100",
      strokeThickness: 2,
      align: "center",
    });
    this.loseText.anchor.setTo(0.5);
    this.loseText.visible = false;
    this.uiGroup.add(this.loseText);
    this.loseTextMinor = game.add.text(0, 120, "Refresh browser to restart", {
      font: "26px Arial black",
      fill: "#ff0044",
      stroke: "#8e1100",
      strokeThickness: 2,
      align: "center",
    });
    this.loseTextMinor.anchor.setTo(0.5);
    this.loseText.addChild(this.loseTextMinor);
    this.winText.visible = false;

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
    this.bossCollisionGroup = game.physics.p2.createCollisionGroup();

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

    this.micHintTimer = null;
    this.micHint = game.add.image(50, game.height - 50, 'micHint');
    this.micHint.anchor.setTo(0.5, 1);
    this.micHint.scale.setTo(0.3);
    this.micHint.visible = true;
    if (this.micHintTimer) clearTimeout(this.micHintTimer);
    this.intervalTimer = setInterval(() => {
      this.micHint.visible = !this.micHint.visible;
      
    }, 1000);
    setTimeout(() => {
      clearInterval(this.intervalTimer);
      this.micHint.visible = false;
    }, 10000);

    this.player = game.add.sprite(PLATFORM_WIDTH / 2, 300, 'character');
    this.arrowHint = game.add.image(30, -30, 'arrowHint');
    this.arrowHint.anchor.setTo(0, 1);
    this.arrowHint.scale.setTo(0.3);
    this.player.addChild(this.arrowHint);
    this.gameplayGroup.addChild(this.player);

    this.player.lifeCount = PLAYER_INIT_LIFE_COUNT;

    if (window.location.href.split('?')[1] == 'c') { this.player.lifeCount = PLAYER_CHEAT_LIFE_COUNT; }

    this.lifeText.setText('Lives: ' + this.player.lifeCount);

    //  Enable if for physics. This creates a default rectangular body.
    game.physics.p2.enable(this.player);

    this.player.body.setRectangle(this.player.width * 0.85, this.player.height * 0.85);
    this.player.body.setCollisionGroup(this.playerCollisionGroup);
    this.player.body.collides([this.playerCollisionGroup, this.musicFloorCollisionGroup]);
    this.player.body.collides([this.deadCollisionGroup, this.scrollCollisionGroup, this.bossCollisionGroup]);

    //  Check for the block hitting another object
    this.player.body.onBeginContact.add(this.touchPlayer, this);
    this.deadzones = this.setupDeadZones();
    stageID = -1;
    this.nextRoom();

    this.knifeIsCooldown = false;

    soundModule.signal.add((...params) => { this.onSound(...params); });
  }

  setUpKeyboard() {
    this.numKeys = [];
    this.numKeys.push({ key: game.input.keyboard.addKey(Phaser.Keyboard.ONE) });
    this.numKeys.push({ key: game.input.keyboard.addKey(Phaser.Keyboard.TWO) });
    this.numKeys.push({ key: game.input.keyboard.addKey(Phaser.Keyboard.THREE) });
    this.numKeys.push({ key: game.input.keyboard.addKey(Phaser.Keyboard.FOUR) });
    this.numKeys.push({ key: game.input.keyboard.addKey(Phaser.Keyboard.FIVE) });
    this.numKeys.push({ key: game.input.keyboard.addKey(Phaser.Keyboard.SIX) });
    this.numKeys.push({ key: game.input.keyboard.addKey(Phaser.Keyboard.SEVEN) });
    this.numKeys.push({ key: game.input.keyboard.addKey(Phaser.Keyboard.EIGHT) });
    this.numKeys.push({ key: game.input.keyboard.addKey(Phaser.Keyboard.NINE) });
    this.numKeys.push({ key: game.input.keyboard.addKey(Phaser.Keyboard.ZERO) });
    this.numKeys.forEach((keyObj, index) => {
      keyObj.key.onDown.add(() => {
        this.onKeyCheat(index);
      }, this);
    });
  }

  onKeyCheat(index) {
    console.log('onKeyCheat', index);
    if (window.location.href.split('?')[1] == 'c') {
      this.onSound(index, 0, 40, 0);
    }
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
    this.gameplayGroup.addChild(scroll);
    //  Enable if for physics. This creates a default rectangular body.
    game.physics.p2.enable(scroll);
    scroll.body.static = true;

    scroll.body.setCollisionGroup(this.scrollCollisionGroup);
    scroll.body.collides([this.playerCollisionGroup]);
    output.push(scroll);
    this.knifeEnabled = true;
    //this.createFireballs();

    roundEndText = 'Real challenges ahead!';
    return output
  }

  setup_level_2() {
    console.log('setup_level_2');
    var output = [];

    var scrollCoord = [[1250, 150], [830, 400], [430, 320]]

    for (var i = 0; i < scrollCoord.length; i++) {
      var scroll = game.add.sprite(scrollCoord[i][0], scrollCoord[i][1], 'scroll');
      this.gameplayGroup.addChild(scroll);
      //  Enable if for physics. This creates a default rectangular body.
      game.physics.p2.enable(scroll);
      scroll.body.static = true;

      scroll.body.setCollisionGroup(this.scrollCollisionGroup);
      scroll.body.collides([this.playerCollisionGroup, this.scrollCollisionGroup]);
      output.push(scroll);
    }
    roundEndText = 'Who is throwing all the katanas?!';
    return output
  }

  setup_level_3() {
    console.log('setup_level_3');

  }

  setup_level_3_stage_1() {
    console.log('setup_level_3_stage_1');
    var output = [];
    var scroll = game.add.sprite(230, 150, 'scroll');
    this.gameplayGroup.addChild(scroll);
    //  Enable if for physics. This creates a default rectangular body.
    game.physics.p2.enable(scroll);
    scroll.body.static = true;

    scroll.body.setCollisionGroup(this.scrollCollisionGroup);
    scroll.body.collides([this.playerCollisionGroup, this.scrollCollisionGroup]);
    output.push(scroll);
    this.player.body.x = PLATFORM_WIDTH / 2;
    this.player.body.y = 300;
    this.player.body.setZeroVelocity();

    this.createBoss(1230, 360);
    roundEndText = 'Collect all the scrolls and ...';
    return output
  }

  setup_level_3_stage_2() {
    console.log('setup_level_3_stage_2');
    var output = [];
    var scroll = game.add.sprite(430, 280, 'scroll');
    this.gameplayGroup.addChild(scroll);
    //  Enable if for physics. This creates a default rectangular body.
    game.physics.p2.enable(scroll);
    scroll.body.static = true;

    scroll.body.setCollisionGroup(this.scrollCollisionGroup);
    scroll.body.collides([this.playerCollisionGroup, this.scrollCollisionGroup]);
    output.push(scroll);
    roundEndText = 'One more.';
    return output
  }

  setup_level_3_stage_3() {
    console.log('setup_level_3_stage_3');
    var output = [];
    var scroll = game.add.sprite(830, 380, 'scroll');
    this.gameplayGroup.addChild(scroll);
    //  Enable if for physics. This creates a default rectangular body.
    game.physics.p2.enable(scroll);
    scroll.body.static = true;

    scroll.body.setCollisionGroup(this.scrollCollisionGroup);
    scroll.body.collides([this.playerCollisionGroup, this.scrollCollisionGroup]);
    output.push(scroll);
    roundEndText = 'Follow the arrow.';
    return output
  }

  createFireballs(no_of_fireballs = -1) {
    var count = 0;
    var sprFlag = 0;

    var that = this;
    function make_fire_ball() {
      const y_index = getRandomInt(0, 11);
      const fireball = game.add.sprite(game.width, indexToGameHeight(y_index), sprFlag ? 'fireball1' : 'fireball2');
      that.gameplayGroup.addChild(fireball);
      sprFlag = !sprFlag;
      game.physics.p2.enable(fireball);
      fireball.body.kinematic = true;
      fireball.body.setCollisionGroup(that.deadCollisionGroup);
      fireball.body.collides(that.playerCollisionGroup);
      fireball.body.moveLeft(256);
      that.fireballs.push(fireball);
      if (no_of_fireballs < 0 || count < no_of_fireballs) that.fireballTimer = setTimeout(make_fire_ball, FIREBALL_INTERVAL);
      count++;
    }

    if (!this.fireballs) this.fireballs = [];
    this.fireballTimer = setTimeout(make_fire_ball.bind(this), FIREBALL_INTERVAL);
  }

  createKnife(y_index) {
    const knife = game.add.sprite(game.width, indexToGameHeight(y_index), 'knife');
    this.gameplayGroup.addChild(knife);
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
      this.gameplayGroup.addChild(deadzone);

      deadzone.anchor.setTo(0, 0);
      game.physics.p2.enable(deadzone);
      deadzone.body.y = game.height - DEADLINE_HEIGHT / 2;
      deadzone.body.static = true;
      deadzone.body.setRectangle(deadzone.width, deadzone.height - 15, 0, 15);
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
      this.arrowHint.alpha -= 0.05;

      // if (player.facing != 'left') {
      //   player.facing = 'left';
      // }
    }
    else if (this.cursors.right.isDown) {
      this.player.body.moveRight(200);
      this.arrowHint.alpha -= 0.05;

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

    if (this.arrowHint.alpha <= 0) {
      this.arrowHint.destroy();
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
      this.lifeText.setText('Lives: ' + this.player.lifeCount);
      this.damageAndCheckLose();
    } else if (body && body.sprite && body.sprite.key === 'scroll') {
      console.log("scroll");
      this.getScroll();
      body.sprite.destroy();
    } if (body && body.sprite && (body.sprite.key === 'fireball1' || body.sprite.key === 'fireball2') && !this.playerSuper) {
      console.log("fireball");
      body.sprite.destroy();
      this.player.lifeCount--;
      this.lifeText.setText('Lives: ' + this.player.lifeCount);
      this.damageAndCheckLose();
    }
  }

  getScroll(sprite1, sprite2) {
    this.player.scollGot++;
    this.gotScrollText.setText('Scrolls: ' + this.player.scollGot);
    console.log('getScroll', this.player.scollGot, this.scrollGoal);

    if (this.player.scollGot >= this.scrollGoal) {
      this.win();
    }
  }

  win() {
    console.log('win');

    if (stageID + 1 >= stageList.length) {
      console.log('no more levels');
      this.finish();
      return;
    }

    this.winTextMinor.setText(roundEndText);
    this.winText.visible = true;


    setTimeout(() => {
      this.winText.visible = false;

      this.cleanUp();

      this.nextRoom();
    }, 4000);
  }

  lose() {
    console.log('lose');
    this.cleanUp();
  }

  damageAndCheckLose() {
    this.player.kill();
    this.bloodBG.visible = true;
    if (this.checkLose()) {
      this.lose();
      setTimeout(() => {
        this.loseText.visible = true;

      }, 1000);
    } else {
      setTimeout(() => {
        this.bloodBG.visible = false;
        this.player.revive();
        this.player.body.y = 30;
        this.player.body.setZeroVelocity();
      }, 1000);
    }
  }

  cleanUp() {
    console.log('cleanUp');
    this.player.scollGot = 0;
    this.gotScrollText.setText('Scrolls: ' + this.player.scollGot);

  }

  nextRoom() {
    console.log('nextRoom');
    stageID++;
    this.scrolls = this[stageList[stageID]]();
    this.scrollGoal = this.scrolls.length;
    this.player.scollGot = 0;
    this.gotScrollText.setText('Scrolls: ' + this.player.scollGot);

  }

  checkLose() {
    if (this.player.lifeCount <= 0) {
      this.lose();
      return true;
    }
    return false;
  }

  finish() {
    this.playerSuper = true;
    this.finishWinText.visible = true;
    this.cleanUp();
  }

  onSound(y0Pitch, y1Pitch, y0Amplitude, y1Amplitude) {
    // console.log(y0Pitch + " " + y1Pitch);

    const normalized0 = y0Pitch;
    const normalized1 = y1Pitch;
    var index = Math.round(normalized0) % NUMBER_OF_PITCH;
    this.musicNoteText.setText(soundModule.audioSource[0].label + ', ' + soundModule.audioSource[1].label + ' ' + soundModule.noteStrings[index]);
    var index1 = Math.round(normalized1) % NUMBER_OF_PITCH;
    //var singIndex = Math.round(normalized0 * 11);
    // console.log('noteStrings', soundModule.noteStrings[index]);
    // console.log('onSound', index);
    // normalized0, soundModule.noteStrings[singIndex],
    // normalized1, '');
    this.musicFloors.forEach((elem, id) => {

      if (index !== 0 && Math.abs(id - index) < 2) {
        // const heightLimit = 500 - y0Amplitude * 70;
        console.log('up center id', id);
        const heightLimit = 500 - 400;
        if (elem.y > heightLimit) {
          // console.log('y0Amplitude', y0Amplitude);

          elem.body.moveUp(300 * (y0Amplitude - 3) / 20);
        } else {
          elem.body.y = heightLimit;
          elem.body.setZeroVelocity();
        }
      } else {
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
    if (index > 0) {
      this.micHint.visible = true;
      if (this.micHintTimer) clearTimeout(this.micHintTimer);
      this.micHintTimer = setTimeout(() => {
        this.micHint.visible = false;

      }, 1000);

    }
  }

  createWall(x, y) {
    var wall = game.add.sprite(x, y, 'wall');
    this.gameplayGroup.addChild(wall);

    game.physics.p2.enable(wall);
    wall.body.static = true;

    wall.body.setCollisionGroup(this.playerCollisionGroup);
    wall.body.collides([this.playerCollisionGroup]);
    return wall;
  }

  createMusicFloor(x, y) {
    var wall = game.add.sprite(x, y, 'wall');
    this.gameplayGroup.addChild(wall);
    game.physics.p2.enable(wall);
    wall.body.kinematic = true;

    wall.body.setCollisionGroup(this.musicFloorCollisionGroup);
    wall.body.collides([this.playerCollisionGroup, this.musicFloorCollisionGroup]);
    return wall;
  }

  createBoss(x, y) {
    var boss = game.add.sprite(x, y, 'boss_ani', 'Comp1_00000');
    this.gameplayGroup.addChild(boss);
    game.physics.p2.enable(boss);
    boss.body.setRectangle(560, 437);
    boss.body.kinematic = true;

    boss.body.setCollisionGroup(this.bossCollisionGroup);
    boss.body.collides([this.playerCollisionGroup, this.musicFloorCollisionGroup]);
    this.createFireballs();
  }

  trasformBoss() {


  }
}

function createPhaser() {
  document.querySelector('#title').style.display = "none";
  game = new Phaser.Game(
    1280, 720, Phaser.AUTO, 'wrapper', new State());
}
