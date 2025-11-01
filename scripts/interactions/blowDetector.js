const globalScope = typeof window !== 'undefined' ? window : globalThis;
const AudioContextClass = globalScope.AudioContext || globalScope.webkitAudioContext;
const hasRAF = typeof globalScope.requestAnimationFrame === 'function' && typeof globalScope.cancelAnimationFrame === 'function';

export function createBlowDetector(options = {}) {
    const {
        fftSize = 1024,
        smoothingTimeConstant = 0.7,
    } = options;

    let audioContext = null;
    let analyser = null;
    let mediaStream = null;
    let dataArray = null;
    let animationFrame = null;
    let level = 0;
    let running = false;
    let onLevel = null;

    async function start(callback) {
        if (running) {
            onLevel = callback;
            return true;
        }
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('此瀏覽器不支援麥克風存取。');
        }
        if (!AudioContextClass) {
            throw new Error('AudioContext 不受支援。');
        }

        audioContext = new AudioContextClass();
        try {
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }

            mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
                video: false,
            });

            analyser = audioContext.createAnalyser();
            analyser.fftSize = fftSize;
            analyser.smoothingTimeConstant = smoothingTimeConstant;
            dataArray = new Uint8Array(analyser.fftSize);

            const source = audioContext.createMediaStreamSource(mediaStream);
            source.connect(analyser);
        } catch (error) {
            if (mediaStream) {
                mediaStream.getTracks().forEach((track) => track.stop());
                mediaStream = null;
            }
            if (audioContext) {
                audioContext.close();
                audioContext = null;
            }
            analyser = null;
            dataArray = null;
            throw error;
        }

        onLevel = callback;
        running = true;
        level = 0;
        tick();
        return true;
    }

    function stop() {
        running = false;
        if (animationFrame) {
            if (hasRAF) {
                globalScope.cancelAnimationFrame(animationFrame);
            } else {
                clearTimeout(animationFrame);
            }
            animationFrame = null;
        }
        if (mediaStream) {
            mediaStream.getTracks().forEach((track) => track.stop());
            mediaStream = null;
        }
        if (audioContext) {
            audioContext.close();
            audioContext = null;
        }
        analyser = null;
        dataArray = null;
        onLevel = null;
        level = 0;
    }

    function isRunning() {
        return running;
    }

    function tick() {
        if (!running || !analyser || !dataArray) return;
        analyser.getByteTimeDomainData(dataArray);
        const next = computeLevel(dataArray);
        level = next * 0.4 + level * 0.6;
        if (onLevel) {
            onLevel(level);
        }
        if (hasRAF) {
            animationFrame = globalScope.requestAnimationFrame(tick);
        } else {
            animationFrame = globalScope.setTimeout(tick, 16);
        }
    }

    return {
        start,
        stop,
        isRunning,
    };
}

function computeLevel(samples) {
    let sum = 0;
    for (let i = 0; i < samples.length; i += 1) {
        const centered = samples[i] - 128;
        sum += centered * centered;
    }
    const meanSquare = sum / samples.length;
    const rms = Math.sqrt(meanSquare) / 128;
    return Math.max(0, Math.min(1, rms));
}
