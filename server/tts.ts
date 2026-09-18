import { GoogleGenAI } from '@google/genai';
import { v2 as cloudinary } from 'cloudinary';
import { getCloudinaryConfig } from './cloudinary';
import { TtsSettings } from '../src/types';

const TTS_MODEL = 'gemini-2.5-flash-preview-tts';
const DEFAULT_VOICE = process.env.TTS_VOICE_NAME || 'Kore';
const TTS_TIMEOUT_MS = 7000;

let genAiClient: GoogleGenAI | null = null;
function getClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!genAiClient) genAiClient = new GoogleGenAI({ apiKey });
  return genAiClient;
}

// Gemini TTS returns raw 16-bit PCM, mono, 24kHz. Wrap it in a standard WAV
// header so it can be played in <audio> tags and stored/served normally.
function pcmToWav(pcmData: Buffer, sampleRate = 24000, channels = 1, bitsPerSample = 16): Buffer {
  const dataSize = pcmData.length;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * (bitsPerSample / 8), 28);
  buffer.writeUInt16LE(channels * (bitsPerSample / 8), 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  pcmData.copy(buffer, 44);
  return buffer;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('TTS timeout')), ms)),
  ]);
}

/**
 * Generates an AI voice reading of a donation message and uploads it to
 * Cloudinary (as resource_type: 'video', Cloudinary's convention for audio).
 * Supports options for reading mode (full message vs limit characters) and custom voice.
 * Returns null (never throws) on any failure — caller must treat that as
 * "no voice for this event" and continue normally.
 */
export async function generateDonationTtsAudio(
  text: string,
  options?: TtsSettings
): Promise<{ url: string; voiceName: string } | null> {
  const isEnabled = options?.enabled !== undefined ? options.enabled : (process.env.TTS_ENABLED === 'true');
  if (!isEnabled) return null;
  const trimmed = (text || '').trim();
  if (!trimmed) return null;

  const client = getClient();
  const cloudinaryConfig = getCloudinaryConfig();
  if (!client || !cloudinaryConfig.isConfigured) {
    console.warn('[TTS] Skipped — missing GEMINI_API_KEY or Cloudinary is not configured.');
    return null;
  }

  try {
    const voiceName = options?.voiceName || DEFAULT_VOICE;

    // Determine text to read based on readFullMessage setting
    let textToSpeak = trimmed;
    const readFull = options?.readFullMessage !== false; // default true (reads full message)
    if (!readFull) {
      const maxChars = options?.maxCharacters && options.maxCharacters > 0 ? options.maxCharacters : 120;
      if (textToSpeak.length > maxChars) {
        textToSpeak = textToSpeak.slice(0, maxChars).trim() + '...';
      }
    }

    const response: any = await withTimeout(
      client.models.generateContent({
        model: TTS_MODEL,
        contents: [{ parts: [{ text: textToSpeak }] }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
        },
      } as any),
      TTS_TIMEOUT_MS
    );

    const audioPart = response?.candidates?.[0]?.content?.parts?.find(
      (p: any) => p?.inlineData?.data
    );
    const base64Audio = audioPart?.inlineData?.data;
    if (!base64Audio) {
      console.warn('[TTS] Gemini returned no audio data.');
      return null;
    }

    const wavBuffer = pcmToWav(Buffer.from(base64Audio, 'base64'));

    cloudinary.config({
      cloud_name: cloudinaryConfig.cloudName,
      api_key: cloudinaryConfig.apiKey,
      api_secret: cloudinaryConfig.apiSecret,
      secure: true,
    });

    const uploadResult: any = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: 'video', folder: 'donation_tts', format: 'wav' },
        (err, result) => (err ? reject(err) : resolve(result))
      );
      stream.end(wavBuffer);
    });

    return { url: uploadResult.secure_url, voiceName };
  } catch (err: any) {
    console.error('[TTS] Generation failed:', err?.message || err);
    return null;
  }
}
