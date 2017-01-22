soundModule = (function () {


    var SMOOTH_TICK_COUNT = 10;
    var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    var source = [];

    var MIN_SAMPLES = 0;  // will be initialized when AudioContext is created.
    var analyser = []
    var inputanalyser = []
    inputanalyser[0] = audioCtx.createAnalyser();
    inputanalyser[1] = audioCtx.createAnalyser();
    analyser[0] = audioCtx.createAnalyser();
    analyser[1] = audioCtx.createAnalyser();
    analyser[0].minDecibels = -90;
    analyser[0].maxDecibels = -10;
    analyser[0].smoothingTimeConstant = 0.85;
    analyser[1].minDecibels = -90;
    analyser[1].maxDecibels = -10;
    analyser[1].smoothingTimeConstant = 0.85;

    var soundSource = [];
    // var canvas = document.querySelector('#visualizer');
    // var canvasCtx = canvas.getContext("2d");

    // var intendedWidth = document.querySelector('#wrapper').clientWidth;
    // canvas.setAttribute('width', intendedWidth);
    // canvas.width = intendedWidth;

    // window.onresize = function (event) {
    //     var intendedWidth = document.querySelector('#wrapper').clientWidth;
    //     canvas.setAttribute('width', intendedWidth);
    //     canvas.width = intendedWidth;
    // };

    var drawRAF;

    //main block for doing the audio recording

    var audioSource = [];
    var audioSourceExt = [];

    // not used
    var noteStrings = ["none", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

    var signal = new Phaser.Signal();

    function noteFromPitch(frequency) {
        if (frequency == 0) return 0;
        var noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
        return (noteNum + 69) % 12;
    }


    function autoCorrelate(buf, sampleRate) {
        var SIZE = buf.length;
        var MAX_SAMPLES = Math.floor(SIZE / 2);
        var best_offset = -1;
        var best_correlation = 0;
        var rms = 0;
        var foundGoodCorrelation = false;
        var correlations = new Array(MAX_SAMPLES);

        for (let i = 0; i < SIZE; i++) {
            var val = buf[i];
            rms += val * val;
        }
        rms = Math.sqrt(rms / SIZE);
        if (rms < 0.01) // not enough signal
            return -1;

        var lastCorrelation = 1;
        for (var offset = MIN_SAMPLES; offset < MAX_SAMPLES; offset++) {
            var correlation = 0;

            for (let i = 0; i < MAX_SAMPLES; i++) {
                correlation += Math.abs((buf[i]) - (buf[i + offset]));
            }
            correlation = 1 - (correlation / MAX_SAMPLES);
            correlations[offset] = correlation; // store it, for the tweaking we need to do below.
            if ((correlation > 0.9) && (correlation > lastCorrelation)) {
                foundGoodCorrelation = true;
                if (correlation > best_correlation) {
                    best_correlation = correlation;
                    best_offset = offset;
                }
            } else if (foundGoodCorrelation) {
                var shift = (correlations[best_offset + 1] - correlations[best_offset - 1]) / correlations[best_offset];
                return sampleRate / (best_offset + (8 * shift));
            }
            lastCorrelation = correlation;
        }
        if (best_correlation > 0.01) {
            return sampleRate / best_offset;
        }
        return -1;
    }

    // gets availale audio sources
    MediaStreamTrack.getSources(function (sourceInfos) {

        for (let i = 0; i != sourceInfos.length; ++i) {
            var sourceInfo = sourceInfos[i];
            if (sourceInfo.kind === 'audio') {
                console.log(sourceInfo.id, sourceInfo.label || 'microphone');

                audioSource.push(sourceInfo.id);
                audioSourceExt.push(sourceInfo);
            }
        }

    });

    // play with the sources
    if (navigator.mediaDevices.getUserMedia) {
        var syncLock = 0;
        console.log('getUserMedia supported.');
        // constraints - only audio needed for this app
        Promise.resolve().then(() => {
            return navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: { exact: audioSource[0] }
                }
            });
        }).then((stream) => {
            console.log(stream);
            source[0] = audioCtx.createMediaStreamSource(stream);
            source[0].connect(analyser[0]);
            source[0].connect(inputanalyser[0]);

            //voiceChange();

        }).then(() => {
            // constraints - only audio needed for this app
            return navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: { exact: audioSource[1] }
                }
            });
        }).then((stream) => {
            console.log(stream)
            source[1] = audioCtx.createMediaStreamSource(stream);
            source[1].connect(analyser[1]);
            source[1].connect(inputanalyser[1]);

            //voiceChange();

        }).then(() => {
            visualize();
        });

    } else {
        console.log('getUserMedia not supported on your browser!');
    }


    function visualize() {
        // WIDTH = canvas.width;
        // HEIGHT = canvas.height;


        var visualSetting = "sinewave";
        console.log(visualSetting);

        if (visualSetting == "sinewave") {
            analyser[0].fftSize = 2048;
            analyser[1].fftSize = 2048;
            var bufferLength = analyser[0].frequencyBinCount;
            var dataArray = new Float32Array(2048);

            // canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

            console.log('bufferLength', bufferLength);

            var history0 = new Array(bufferLength).fill(0);
            var history1 = new Array(bufferLength).fill(0);

            var history_a0 = new Array(bufferLength).fill(0);
            var history_a1 = new Array(bufferLength).fill(0);

            var LEVEL_SCALE = 1;
            var y0smoothingCache = [];
            var y1smoothingCache = [];

            var y = [0, 0];
            var total = 0;
            function draw() {

                drawRAF = setTimeout(draw, 100);
                var freqData = new Uint8Array(inputanalyser[0].frequencyBinCount);
                inputanalyser[0].getByteFrequencyData(freqData);

                total = 0;
                for (let i = 0; i < freqData.length; i++) {
                    total += parseFloat(freqData[i]);
                }

                var level = LEVEL_SCALE * total / freqData.length;
                history_a0.push(level);
                inputanalyser[1].getByteFrequencyData(freqData);
                total = 0;

                for (let i = 0; i < freqData.length; i++) {
                    total += parseFloat(freqData[i]);
                }
                level = LEVEL_SCALE * total / freqData.length;
                history_a1.push(level);

                analyser[0].getFloatTimeDomainData(dataArray);
                var ac0 = autoCorrelate(dataArray, audioCtx.sampleRate) || 0;
                ac0 = (ac0 == -1) ? 0 : ac0;
                //  console.log(dataArray[0])
                analyser[1].getFloatTimeDomainData(dataArray);
                var ac1 = autoCorrelate(dataArray, audioCtx.sampleRate) || 0;
                ac1 = (ac1 == -1) ? 0 : ac1;

                var x = 0;
                y0smoothingCache.push((ac0));
                y1smoothingCache.push((ac1));

                if (y0smoothingCache.length >= SMOOTH_TICK_COUNT) {

                    // let sum = (y0smoothingCache
                    //     .slice(-SMOOTH_TICK_COUNT)
                    //     .reduce((previous, current) => current + previous)
                    // );
                    // const y0Pitch = y[0] = sum / y0smoothingCache.length;
                    const smoothed0 = smoothOut(y0smoothingCache.slice(-SMOOTH_TICK_COUNT), 0.3);
                    const y0Pitch = y[1] = noteFromPitch(smoothed0[smoothed0.length-1]);
                    

                    //console.log(y[0])
                    // y[0] *= canvas.height / 24;
                    // y0smoothingCache.length = 0;
                    history0.push(y[0]);

                    // sum = y1smoothingCache.reduce((previous, current) => current += previous);
                    // const y1Pitch = y[1] = sum / y1smoothingCache.length;
                    const smoothed1 = smoothOut(y1smoothingCache.slice(-SMOOTH_TICK_COUNT), 0.85);
                    const y1Pitch = y[1] = noteFromPitch(smoothed1[smoothed1.length-1]);
                    
                    // y[1] *= canvas.height / 30;
                    // y1smoothingCache.length = 0;
                    history1.push(y[1]);


                    function avg(v) {
                        return v.reduce((a, b) => a + b, 0) / v.length;
                    }

                    function smoothOut(vector, variance) {
                        var t_avg = avg(vector) * variance;
                        var ret = Array(vector.length);
                        for (var i = 0; i < vector.length; i++) {
                            (function () {
                                var prev = i > 0 ? ret[i - 1] : vector[i];
                                var next = i < vector.length ? vector[i] : vector[i - 1];
                                ret[i] = avg([t_avg, avg([prev, vector[i], next])]);
                            })();
                        }
                        return ret;
                    }

                    const y0Amplitude = history_a0[history_a0.length - 1];
                    const y1Amplitude = history_a1[history_a1.length - 1];
                    signal.dispatch(y0Pitch, y1Pitch, y0Amplitude, y1Amplitude);
                }

            }

            // const i = Math.floor(history_a0.length / 2);
            // console.log('hi histoyr', history0);
            // console.log('hi NaN', history0[i], history1[history1.length - i - 1]);

            // console.log('hi auntie', history0[i] - history1[history1.length - i - 1]);
            // console.log('hi auntie', history_a0[i] - history_a1[history_a1.length - i - 1]);

            // console.log('hi y 01', y[0], y[1]);

            // we've got all data at this point

            // canvasCtx.moveTo(0, canvas.height / 2);
            // for (let i = history0.length; i > 0; i--) {
            //     x += sliceWidth;
            //     canvasCtx.moveTo(x, canvas.height / 2);
            //     canvasCtx.lineTo(x, history0[i] - history1[history1.length - i - 1] + canvas.height / 2);
            // }
            // canvasCtx.stroke();


            // canvasCtx.strokeStyle = 'rgb(255, 0, 0)';

            // canvasCtx.beginPath();
            // canvasCtx.moveTo(0, canvas.height / 2);
            // x = 0;
            // for (let i = history_a0.length; i > 0; i--) {
            //     x += sliceWidth;
            //     canvasCtx.moveTo(x, canvas.height / 2);
            //     canvasCtx.lineTo(x, history_a0[i] - history_a1[history_a1.length - i - 1] + canvas.height / 2);
            // }
            // canvasCtx.stroke();


            // advance time
            if (history0.length >= bufferLength) {
                history0.shift();
                history1.shift();
                history_a0.shift();
                history_a1.shift();
            }
            history0.push(0);
            history1.push(0);
            history_a0.push(0);
            history_a1.push(0);
        };

        draw();

        // } else if(visualSetting == "frequencybars") {
        //   analyser.fftSize = 256;
        //   var bufferLength = analyser.frequencyBinCount;
        //   console.log(bufferLength);
        //   var dataArray = new Uint8Array(bufferLength);

        //   canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

        //   function draw() {
        //     drawRAF = requestAnimationFrame(draw);

        //     analyser.getByteFrequencyData(dataArray);

        //     canvasCtx.fillStyle = 'rgb(0, 0, 0)';
        //     canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

        //     var barWidth = (WIDTH / bufferLength) * 2.5;
        //     var barHeight;
        //     var x = 0;

        //     for(var i = 0; i < bufferLength; i++) {
        //       barHeight = dataArray[i];

        //       canvasCtx.fillStyle = 'rgb(' + (barHeight+100) + ',50,50)';
        //       canvasCtx.fillRect(x,HEIGHT-barHeight/2,barWidth,barHeight/2);

        //       x += barWidth + 1;
        //     }
        //   };

        //   draw();

        // } else if(visualSetting == "off") {
        //   canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
        //   canvasCtx.fillStyle = "red";
        //   canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
    }


    function voiceChange() {

        //  else if(voiceSetting == "biquad") {
        //   biquadFilter.type = "lowshelf";
        //   biquadFilter.frequency.value = 1000;
        //   biquadFilter.gain.value = 25;
        // } else if(voiceSetting == "off") {
        //   console.log("Voice settings turned off");
        // }

    }

    // event listeners to change visualize and voice settings

    return { signal, noteStrings, audioSource: audioSourceExt };

} ());
