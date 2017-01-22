micMouseMic = (function () {
  var recording = false;
  var startY = 0;
  var signal = new Phaser.Signal();
  var buffer = [];
  
  window.addEventListener("mousedown", (evt) => {
    recording = true;
    startY = evt.clientY;
  });

  window.addEventListener("mousemove", (evt) => {
    if (recording) {
      var delta = -(evt.clientY - startY);
      console.log('mousemove', delta);
      buffer.push(delta);
      
      signal.dispatch({delta, buffer});
    }
  });

  window.addEventListener("mouseup", (evt) => {
    recording = false;
  });
  return {signal, buffer};
} ());
