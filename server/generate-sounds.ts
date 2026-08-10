import fs from 'fs';
import path from 'path';

function createWavFile(filePath: string, durationSec: number, freqFn: (t: number) => number) {
  const sampleRate = 44100;
  const numSamples = Math.floor(sampleRate * durationSec);
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size
  buffer.writeUInt16LE(1, 20);  // AudioFormat (PCM)
  buffer.writeUInt16LE(1, 22);  // NumChannels (1 = Mono)
  buffer.writeUInt32LE(sampleRate, 24); // SampleRate
  buffer.writeUInt32LE(sampleRate * 2, 28); // ByteRate
  buffer.writeUInt16LE(2, 32);  // BlockAlign
  buffer.writeUInt16LE(16, 34); // BitsPerSample

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Generate PCM data
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const freq = freqFn(t);
    // Exponential decay envelope
    const envelope = Math.exp(-3 * t);
    const val = Math.sin(2 * Math.PI * freq * t) * envelope;
    const intVal = Math.max(-32768, Math.min(32767, Math.floor(val * 16000)));
    buffer.writeInt16LE(intVal, 44 + i * 2);
  }

  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, buffer);
}

// Generate sounds
const soundsDir = path.join(process.cwd(), 'public', 'assets', 'sounds');

// 1. Chime sound (pleasing arpeggio / high freq)
createWavFile(path.join(soundsDir, 'chime.mp3'), 1.5, (t) => {
  if (t < 0.2) return 523.25; // C5
  if (t < 0.4) return 659.25; // E5
  if (t < 0.6) return 783.99; // G5
  return 1046.5; // C6
});

// 2. Fanfare sound (triumphant brass frequency)
createWavFile(path.join(soundsDir, 'fanfare.mp3'), 2.0, (t) => {
  if (t < 0.3) return 440.0; // A4
  if (t < 0.6) return 554.37; // C#5
  if (t < 0.9) return 659.25; // E5
  return 880.0; // A5
});

// 3. Explosion / Boom sound (falling pitch sub-bass)
createWavFile(path.join(soundsDir, 'explosion.mp3'), 2.5, (t) => {
  return Math.max(40, 300 - t * 100);
});

console.log('Sample sound WAV/MP3 files created successfully in public/assets/sounds/');
