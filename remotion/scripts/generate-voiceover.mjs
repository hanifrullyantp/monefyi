import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../.env");

// Load .env
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim().replace(/^["']|["']$/g, "");
      process.env[key] = val;
    }
  }
}

const apiKey = process.env.ELEVENLABS_API_KEY;
const defaultVoiceId = process.env.ELEVENLABS_VOICE_ID || "1k39YpzqXZn52BgyLyGO";

if (!apiKey) {
  console.error("Error: ELEVENLABS_API_KEY tidak ditemukan di remotion/.env");
  process.exit(1);
}

/**
 * Generate Voiceover from text
 * @param {string} text Text to synthesize
 * @param {string} outputFile Path to output MP3 relative to public/
 * @param {string} voiceId ElevenLabs Voice ID
 */
export async function generateVoiceover({
  text,
  outputFile = "audio-generated.mp3",
  voiceId = defaultVoiceId,
  modelId = "eleven_multilingual_v2",
}) {
  const targetPath = path.resolve(__dirname, "../public", outputFile);
  console.log(`Mengirim request ke ElevenLabs (Voice ID: ${voiceId})...`);

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.2,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`ElevenLabs API Error (${response.status}): ${errText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  fs.writeFileSync(targetPath, Buffer.from(arrayBuffer));
  console.log(`Berhasil disimpan ke: ${targetPath}`);
}

// CLI usage if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const customText = process.argv[2];
  const customOut = process.argv[3] || "audio-elevenlabs.mp3";
  if (!customText) {
    console.log("Usage: node generate-voiceover.mjs \"teks narasi\" [nama_file.mp3]");
  } else {
    generateVoiceover({ text: customText, outputFile: customOut }).catch(console.error);
  }
}

