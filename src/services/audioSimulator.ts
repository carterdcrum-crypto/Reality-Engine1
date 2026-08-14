export class AudioEngineSimulator {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private animationFrameId: number | null = null;
  private isSimulated = false;

  async startMicrophone(onRmsUpdate: (rms: number) => void): Promise<boolean> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      source.connect(this.analyser);

      const buffer = new Uint8Array(this.analyser.frequencyBinCount);
      const loop = () => {
        if (!this.analyser) return;
        this.analyser.getByteTimeDomainData(buffer);
        let sumSquares = 0;
        for (let i = 0; i < buffer.length; i++) {
          const norm = (buffer[i] - 128) / 128;
          sumSquares += norm * norm;
        }
        const rms = Math.min(1, Math.sqrt(sumSquares / buffer.length) * 2.5);
        onRmsUpdate(rms);
        this.animationFrameId = requestAnimationFrame(loop);
      };
      loop();
      this.isSimulated = false;
      return true;
    } catch (e) {
      console.warn('Microphone access not granted, falling back to simulated stream:', e);
      this.startSimulatedAudio(onRmsUpdate);
      return false;
    }
  }

  startSimulatedAudio(onRmsUpdate: (rms: number) => void) {
    this.isSimulated = true;
    let phase = 0;
    const interval = setInterval(() => {
      phase += 0.15;
      const base = 0.25 + 0.35 * Math.sin(phase);
      const jitter = (Math.random() - 0.5) * 0.2;
      const rms = Math.max(0.05, Math.min(0.95, base + jitter));
      onRmsUpdate(rms);
    }, 100);

    return () => clearInterval(interval);
  }

  stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
