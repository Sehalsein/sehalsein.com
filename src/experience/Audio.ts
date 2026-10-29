export class RoomAudio {
  private context: AudioContext | null = null;
  private gain: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | undefined;
  private enabled = false;
  private note = 0;
  private readonly notes = [
    220, 329.63, 440, 293.66, 369.99, 293.66, 246.94, 329.63,
  ];

  async setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      clearInterval(this.timer);
      if (this.gain && this.context)
        this.gain.gain.setTargetAtTime(0, this.context.currentTime, 0.18);
      return;
    }
    if (!this.context) {
      this.context = new AudioContext();
      this.gain = this.context.createGain();
      this.gain.gain.value = 0;
      this.gain.connect(this.context.destination);
    }
    await this.context.resume();
    if (!this.enabled) return;
    this.gain!.gain.setTargetAtTime(0.15, this.context.currentTime, 0.3);
    const play = () => {
      if (!this.context || !this.gain || document.hidden) return;
      const now = this.context.currentTime,
        oscillator = this.context.createOscillator(),
        envelope = this.context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = this.notes[this.note++ % this.notes.length];
      envelope.gain.setValueAtTime(0, now);
      envelope.gain.linearRampToValueAtTime(0.26, now + 0.03);
      envelope.gain.exponentialRampToValueAtTime(0.001, now + 3.4);
      oscillator.connect(envelope);
      envelope.connect(this.gain);
      oscillator.start(now);
      oscillator.stop(now + 3.5);
      oscillator.onended = () => {
        oscillator.disconnect();
        envelope.disconnect();
      };
    };
    clearInterval(this.timer);
    play();
    this.timer = setInterval(play, 1300);
  }
  dispose() {
    this.enabled = false;
    clearInterval(this.timer);
    void this.context?.close();
  }
}
