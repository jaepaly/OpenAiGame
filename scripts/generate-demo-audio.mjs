import { writeFile } from "node:fs/promises";

const output = process.argv[2] ?? "submission/video/demo_audio.wav";
const duration = Number(process.argv[3] ?? 55);
const sampleRate = 48_000;
const frameCount = Math.ceil(duration * sampleRate);
const left = new Float32Array(frameCount);
const right = new Float32Array(frameCount);
let seed = 0x5a17c9;

const random = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 0xffffffff;
};

const addTone = (start, length, frequency, gain, pan = 0, wave = "sine") => {
  const from = Math.max(0, Math.floor(start * sampleRate));
  const to = Math.min(frameCount, Math.ceil((start + length) * sampleRate));
  const attack = Math.min(.025, length * .22);
  const release = Math.min(.12, length * .42);
  for (let index = from; index < to; index += 1) {
    const time = index / sampleRate - start;
    const phase = time * frequency * Math.PI * 2;
    const raw = wave === "triangle" ? 2 / Math.PI * Math.asin(Math.sin(phase)) : Math.sin(phase);
    const envelope = Math.min(1, time / Math.max(.001, attack), (length - time) / Math.max(.001, release));
    const value = raw * gain * Math.max(0, envelope);
    left[index] += value * (1 - pan * .45);
    right[index] += value * (1 + pan * .45);
  }
};

const addChord = (start, length, root, gain) => {
  [1, 1.25, 1.5, 2].forEach((ratio, index) => addTone(start + index * .018, length, root * ratio, gain / 4, (index - 1.5) * .25, "triangle"));
};

const addWhoosh = (start, length, gain) => {
  const from = Math.max(0, Math.floor(start * sampleRate));
  const to = Math.min(frameCount, Math.ceil((start + length) * sampleRate));
  let filtered = 0;
  for (let index = from; index < to; index += 1) {
    const progress = (index - from) / Math.max(1, to - from);
    filtered = filtered * (.93 - progress * .14) + (random() * 2 - 1) * (.07 + progress * .14);
    const envelope = Math.sin(progress * Math.PI) ** 1.6;
    const value = filtered * envelope * gain;
    left[index] += value * (1.08 - progress * .3);
    right[index] += value * (.78 + progress * .35);
  }
};

const addHarvestRun = (start, end, interval, base, gain) => {
  let step = 0;
  for (let time = start; time < end; time += interval) {
    const scale = [1, 1.25, 1.5, 2, 1.5, 2.5][step % 6];
    addTone(time, .11, base * scale, gain, Math.sin(step * 1.7) * .65, "triangle");
    if (step % 5 === 4) addTone(time, .18, base * 3, gain * .55, 0, "sine");
    step += 1;
  }
};

// Title: a short original sky-company ident.
addWhoosh(0, 1.3, .12);
addChord(.35, 2.7, 164.81, .13);
addChord(2.15, 2.1, 220, .11);

// Early flight: no background music, only tactile harvest plinks.
addHarvestRun(4.7, 11.05, .42, 330, .105);
addTone(10.85, .38, 245, .11, 0, "triangle");

// LAST HARVEST warning and secure return.
[11.25, 11.85, 12.38, 12.84].forEach((time, index) => addTone(time, .09, 310 + index * 55, .09, 0, "sine"));
addWhoosh(13.65, 1.1, .18);
addChord(16.25, 1.4, 261.63, .15);

// Factory: restrained machinery and confirmation sounds.
for (let time = 19.2; time < 22.1; time += .72) addTone(time, .055, 185, .055, -.25, "triangle");
addChord(22.55, 1.25, 293.66, .13);
addTone(27.05, .12, 520, .09, -.25, "triangle");
addTone(28.0, .12, 660, .09, .25, "triangle");
addChord(29.2, 1.45, 349.23, .1);

// Late-game fever: an original quick arpeggio layered with dense harvest plinks.
for (let time = 31.15, step = 0; time < 36.7; time += .16, step += 1) {
  const notes = [220, 277.18, 329.63, 440, 554.37, 659.25];
  addTone(time, .12, notes[step % notes.length], .045, Math.sin(step) * .7, "triangle");
}
addHarvestRun(31.2, 36.7, .11, 440, .052);
addWhoosh(36.75, 1.1, .2);
addChord(39.1, 1.4, 329.63, .14);

// Processing and payout.
for (let time = 41.4; time < 44.3; time += .48) addTone(time, .06, 210 + (time % 1) * 80, .045, 0, "triangle");
addChord(44.7, 2.1, 392, .17);
addChord(47.0, 2.2, 493.88, .14);

// Outro resolution.
addWhoosh(49.7, 1.1, .1);
addChord(50.0, 4.5, 220, .12);
addChord(52.15, 2.7, 293.66, .11);

const headerSize = 44;
const bytesPerSample = 2;
const dataSize = frameCount * 2 * bytesPerSample;
const buffer = Buffer.alloc(headerSize + dataSize);
buffer.write("RIFF", 0);
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write("WAVE", 8);
buffer.write("fmt ", 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(2, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(sampleRate * 2 * bytesPerSample, 28);
buffer.writeUInt16LE(2 * bytesPerSample, 32);
buffer.writeUInt16LE(16, 34);
buffer.write("data", 36);
buffer.writeUInt32LE(dataSize, 40);

for (let index = 0; index < frameCount; index += 1) {
  const peak = Math.max(1, Math.abs(left[index]), Math.abs(right[index]));
  buffer.writeInt16LE(Math.round(left[index] / peak * 32767 * .92), headerSize + index * 4);
  buffer.writeInt16LE(Math.round(right[index] / peak * 32767 * .92), headerSize + index * 4 + 2);
}

await writeFile(output, buffer);
console.log(`Generated ${duration.toFixed(2)}s original demo audio: ${output}`);
