import { execFile } from "node:child_process";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const projectRoot = path.resolve(import.meta.dirname, "..");
const captureRoot = path.resolve(
  process.argv[2] ?? path.join(projectRoot, "submission", "video", "raw", "capture_1787663518710"),
);
const videoRoot = path.join(projectRoot, "submission", "video");
const workRoot = path.join(videoRoot, "work");
const output = path.resolve(
  process.argv[3] ?? path.join(videoRoot, "sky-harvest-company-demo-ko.mp4"),
);
const audioPath = path.join(videoRoot, "demo_audio.wav");
const subtitlePath = path.join(videoRoot, "demo.ass");

const scenes = [
  "01_early_harvest",
  "02_last_harvest_trigger",
  "03_secure_return",
  "04_processing_choice",
  "05_early_report",
  "06_skill_tree",
  "07_aurora_harvest",
  "08_aurora_return",
  "09_aurora_processing",
  "10_aurora_report",
];

const run = async (command, args) => {
  process.stdout.write(`\n> ${command} ${args.join(" ")}\n`);
  const result = await execFileAsync(command, args, {
    cwd: projectRoot,
    maxBuffer: 16 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.stderr) process.stdout.write(result.stderr.slice(-1600));
  return result;
};

await mkdir(workRoot, { recursive: true });
await run("node", [path.join(projectRoot, "scripts", "generate-demo-audio.mjs"), audioPath, "55"]);

const encodeStill = async (name, duration, videoFilter) => {
  const target = path.join(workRoot, `${name}.mp4`);
  await run("ffmpeg", [
    "-y",
    "-hide_banner",
    "-loglevel", "warning",
    "-loop", "1",
    "-framerate", "30",
    "-t", String(duration),
    "-i", path.join(captureRoot, "title.jpg"),
    "-vf", videoFilter,
    "-an",
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "18",
    "-pix_fmt", "yuv420p",
    "-r", "30",
    target,
  ]);
  return target;
};

const titleClip = await encodeStill(
  "00_title",
  4.5,
  "scale=1280:720,fade=t=in:st=0:d=0.45,fade=t=out:st=4:d=0.45,format=yuv420p",
);

const sceneClips = [];
for (const [index, scene] of scenes.entries()) {
  const frames = (await readdir(path.join(captureRoot, scene))).filter((file) => file.endsWith(".jpg")).length;
  if (!frames) throw new Error(`No captured frames found for ${scene}`);
  const target = path.join(workRoot, `${String(index + 1).padStart(2, "0")}_${scene}.mp4`);
  await run("ffmpeg", [
    "-y",
    "-hide_banner",
    "-loglevel", "warning",
    "-framerate", "6",
    "-i", path.join(captureRoot, scene, "%05d.jpg"),
    "-vf", "scale=1280:720,tpad=stop_mode=clone:stop_duration=0.3,minterpolate=fps=30:mi_mode=blend,format=yuv420p",
    "-an",
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "18",
    "-pix_fmt", "yuv420p",
    "-r", "30",
    target,
  ]);
  sceneClips.push(target);
  process.stdout.write(`Encoded ${scene}: ${frames} source frames\n`);
}

const outroClip = await encodeStill(
  "11_outro",
  5,
  "scale=1280:720,boxblur=3:1,eq=brightness=-0.32:contrast=0.82,fade=t=in:st=0:d=0.45,format=yuv420p",
);

const clips = [titleClip, ...sceneClips, outroClip];
const manifestPath = path.join(workRoot, "concat.txt");
const manifest = clips
  .map((file) => `file '${file.replaceAll("\\", "/").replaceAll("'", "'\\''")}'`)
  .join("\n");
await writeFile(manifestPath, `${manifest}\n`);

const silentVideo = path.join(workRoot, "silent.mp4");
await run("ffmpeg", [
  "-y",
  "-hide_banner",
  "-loglevel", "warning",
  "-f", "concat",
  "-safe", "0",
  "-i", manifestPath,
  "-c", "copy",
  silentVideo,
]);

await run("ffmpeg", [
  "-y",
  "-hide_banner",
  "-loglevel", "warning",
  "-i", silentVideo,
  "-i", audioPath,
  "-vf", `ass=${path.relative(projectRoot, subtitlePath).replaceAll("\\", "/")}`,
  "-af", "loudnorm=I=-20:LRA=7:TP=-2",
  "-c:v", "libx264",
  "-preset", "slow",
  "-crf", "18",
  "-pix_fmt", "yuv420p",
  "-c:a", "aac",
  "-b:a", "192k",
  "-ar", "48000",
  "-shortest",
  "-movflags", "+faststart",
  output,
]);

const probe = await run("ffprobe", [
  "-v", "error",
  "-show_entries", "format=duration,size:stream=codec_name,width,height,r_frame_rate,sample_rate,channels",
  "-of", "json",
  output,
]);
process.stdout.write(`\nCreated ${output}\n${probe.stdout}\n`);
