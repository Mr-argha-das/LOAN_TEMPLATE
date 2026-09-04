import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CircleAlert, RefreshCcw, ScanFace, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ACCEPTED_VIDEO_TYPES,
  MAX_VIDEO_BYTES,
  readUpload,
  type SelectedUpload,
} from "@/lib/loan-applications";

// Guided liveness sequence — jaise loan KYC face verification mein hota hai.
const INSTRUCTIONS: Array<{ label: string; hint: string; seconds: number }> = [
  { label: "Camera mein seedha dekhein", hint: "Apna face oval ke andar rakhein", seconds: 3 },
  { label: "Face dheere se UPAR karein", hint: "Sir ko dheere se upar uthayein", seconds: 3 },
  { label: "Face dheere se NEECHE karein", hint: "Sir ko dheere se neeche jhukayein", seconds: 3 },
  { label: "Face LEFT mudayein", hint: "Apne face ko dheere se left side ghumayein", seconds: 3 },
  { label: "Face RIGHT mudayein", hint: "Apne face ko dheere se right side ghumayein", seconds: 3 },
  { label: "Aankhein 2 baar jhapkayein", hint: "Bas itna — verification complete!", seconds: 3 },
];

const PREPARE_SECONDS = 3;

const MIME_CANDIDATES = [
  { recorderType: "video/webm;codecs=vp9", fileType: "video/webm", ext: "webm" },
  { recorderType: "video/webm;codecs=vp8", fileType: "video/webm", ext: "webm" },
  { recorderType: "video/webm", fileType: "video/webm", ext: "webm" },
  { recorderType: "video/mp4;codecs=h264", fileType: "video/mp4", ext: "mp4" },
  { recorderType: "video/mp4", fileType: "video/mp4", ext: "mp4" },
];

const TOTAL_MS = INSTRUCTIONS.reduce((total, step) => total + step.seconds * 1000, 0);
const FIRST_INSTRUCTION = INSTRUCTIONS[0]!;

function pickMimeType() {
  if (typeof MediaRecorder === "undefined") return undefined;
  return MIME_CANDIDATES.find((candidate) => MediaRecorder.isTypeSupported(candidate.recorderType));
}

function cameraErrorMessage(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError") {
      return "Camera permission nahi mili. Browser ke address bar se camera allow karke dobara try karein.";
    }
    if (error.name === "NotFoundError" || error.name === "OverconstrainedError") {
      return "Is device par koi camera nahi mila. Camera wale device se try karein.";
    }
    if (error.name === "NotReadableError") {
      return "Camera kisi aur app mein use ho raha hai. Use band karke dobara try karein.";
    }
  }
  return error instanceof Error ? error.message : "Camera start nahi ho paya.";
}

type Phase = "intro" | "starting" | "prepare" | "recording" | "saving";

export function FaceVerification({
  video,
  onVideoChange,
  onContinue,
}: {
  video: SelectedUpload | undefined;
  onVideoChange: (video: SelectedUpload | undefined) => void;
  onContinue: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [error, setError] = useState("");
  const [prepareCount, setPrepareCount] = useState(PREPARE_SECONDS);
  const [stepIndex, setStepIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(FIRST_INSTRUCTION.seconds);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | undefined>(undefined);
  const recorderRef = useRef<MediaRecorder | undefined>(undefined);
  const chunksRef = useRef<Blob[]>([]);
  const cancelledRef = useRef(false);
  const tickRef = useRef<number | undefined>(undefined);
  const elapsedRef = useRef(0);

  const stopCamera = useCallback(() => {
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = undefined;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = undefined;
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const finalizeRecording = useCallback(() => {
    stopCamera();
    const mimeType = pickMimeType();
    const chunks = chunksRef.current;
    chunksRef.current = [];
    if (cancelledRef.current || !mimeType || chunks.length === 0) {
      setPhase("intro");
      return;
    }
    setPhase("saving");
    const blob = new Blob(chunks, { type: mimeType.fileType });
    const file = new File([blob], `face-verification.${mimeType.ext}`, {
      type: mimeType.fileType,
    });
    try {
      const upload = readUpload(file, ACCEPTED_VIDEO_TYPES, MAX_VIDEO_BYTES, "8 MB");
      onVideoChange(upload);
      setError("");
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Video save nahi ho payi, dobara try karein.",
      );
    }
    setPhase("intro");
  }, [onVideoChange, stopCamera]);

  const runSequence = useCallback(() => {
    elapsedRef.current = 0;
    setStepIndex(0);
    setSecondsLeft(FIRST_INSTRUCTION.seconds);
    tickRef.current = window.setInterval(() => {
      elapsedRef.current += 100;
      let elapsed = elapsedRef.current;
      if (elapsed >= TOTAL_MS) {
        if (tickRef.current) window.clearInterval(tickRef.current);
        tickRef.current = undefined;
        const recorder = recorderRef.current;
        if (recorder?.state === "recording") recorder.stop();
        return;
      }
      let index = 0;
      for (let i = 0; i < INSTRUCTIONS.length; i++) {
        const stepMs = INSTRUCTIONS[i]!.seconds * 1000;
        if (elapsed < stepMs) {
          index = i;
          setSecondsLeft(Math.ceil((stepMs - elapsed) / 1000));
          break;
        }
        elapsed -= stepMs;
      }
      setStepIndex(index);
    }, 100);
  }, []);

  const beginRecording = useCallback(() => {
    const mimeType = pickMimeType();
    if (!mimeType) {
      setError("Is browser mein video recording support nahi hai. Chrome ya Safari use karein.");
      setPhase("intro");
      return;
    }
    cancelledRef.current = false;
    chunksRef.current = [];
    const stream = streamRef.current;
    if (!stream) {
      setError("Camera start nahi hua. Dobara try karein.");
      setPhase("intro");
      return;
    }
    const recorder = new MediaRecorder(stream, {
      mimeType: mimeType.recorderType,
      videoBitsPerSecond: 500_000,
    });
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => finalizeRecording();
    recorderRef.current = recorder;
    recorder.start(250);
    setPhase("recording");
    runSequence();
  }, [finalizeRecording, runSequence]);

  const startCamera = useCallback(async () => {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Is browser mein camera access support nahi hai.");
      return;
    }
    const mimeType = pickMimeType();
    if (!mimeType) {
      setError("Is browser mein video recording support nahi hai. Chrome ya Safari use karein.");
      return;
    }
    setPhase("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setPhase("prepare");
      setPrepareCount(PREPARE_SECONDS);
      let count = PREPARE_SECONDS;
      tickRef.current = window.setInterval(() => {
        count -= 1;
        setPrepareCount(count);
        if (count <= 0) {
          if (tickRef.current) window.clearInterval(tickRef.current);
          tickRef.current = undefined;
          beginRecording();
        }
      }, 1000);
    } catch (cameraError) {
      stopCamera();
      setError(cameraErrorMessage(cameraError));
      setPhase("intro");
    }
  }, [beginRecording, stopCamera]);

  const cancelRecording = () => {
    cancelledRef.current = true;
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = undefined;
    }
    const recorder = recorderRef.current;
    if (recorder?.state === "recording") recorder.stop();
    else {
      stopCamera();
      setPhase("intro");
    }
  };

  const retake = () => {
    if (video) window.URL.revokeObjectURL(video.previewUrl);
    onVideoChange(undefined);
    void startCamera();
  };

  // Step 1 — review recorded video
  if (video) {
    return (
      <div className="space-y-4">
        <h2 className="text-center text-lg font-bold">Face Verification Complete ✅</h2>
        <div className="overflow-hidden rounded-lg border border-success/40 bg-card">
          <video
            src={video.previewUrl}
            controls
            playsInline
            className="aspect-[4/3] w-full bg-black object-contain"
          />
          <p className="border-t border-border px-3 py-2 text-center text-xs text-muted-foreground">
            Aapki face verification video record ho gayi. Submit ke saath verify hogi.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={retake}
            className="h-12 rounded-full text-base"
            disabled={phase === "starting"}
          >
            <RefreshCcw className="mr-1 h-4 w-4" /> Retake
          </Button>
          <Button onClick={onContinue} className="h-12 rounded-full px-6 text-base">
            Continue
          </Button>
        </div>
      </div>
    );
  }

  // Step 2 — live camera (prepare countdown or recording)
  if (phase === "starting" || phase === "prepare" || phase === "recording") {
    const instruction = INSTRUCTIONS[stepIndex] ?? INSTRUCTIONS[0]!;
    return (
      <div className="space-y-4">
        <h2 className="text-center text-lg font-bold">Face Verification</h2>
        <div className="relative overflow-hidden rounded-lg border border-primary/40 bg-black">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="aspect-[4/3] w-full scale-x-[-1] object-cover"
          />

          {/* Face guide oval */}
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="h-[68%] w-[55%] rounded-[50%] border-2 border-dashed border-white/70" />
          </div>

          {phase === "starting" && (
            <div className="absolute inset-0 grid place-items-center bg-black/60">
              <p className="flex items-center gap-2 text-sm font-medium text-white">
                <Camera className="h-4 w-4 animate-pulse" /> Camera start ho raha hai…
              </p>
            </div>
          )}

          {phase === "prepare" && (
            <div className="absolute inset-0 grid place-items-center bg-black/50">
              <div className="grid h-20 w-20 place-items-center rounded-full bg-primary text-3xl font-bold text-primary-foreground">
                {Math.max(prepareCount, 1)}
              </div>
              <p className="absolute bottom-6 text-sm font-medium text-white">
                Ready ho jayein — recording shuru ho rahi hai
              </p>
            </div>
          )}

          {phase === "recording" && (
            <>
              <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                REC
              </div>
              <div className="absolute inset-x-3 bottom-3 rounded-lg bg-black/60 px-3 py-2 text-center backdrop-blur-sm">
                <p className="text-sm font-bold text-white">{instruction.label}</p>
                <p className="mt-0.5 text-xs text-white/80">{instruction.hint}</p>
                <p className="mt-1 text-xs font-semibold text-brand-red">{secondsLeft}s</p>
              </div>
            </>
          )}
        </div>

        {phase === "recording" && (
          <>
            <div className="flex items-center justify-center gap-1.5">
              {INSTRUCTIONS.map((step, index) => (
                <span
                  key={step.label}
                  className={`h-2 rounded-full transition-all ${
                    index < stepIndex
                      ? "w-2 bg-success"
                      : index === stepIndex
                        ? "w-6 bg-primary"
                        : "w-2 bg-muted"
                  }`}
                />
              ))}
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Step {stepIndex + 1} / {INSTRUCTIONS.length} · Video record ho rahi hai
            </p>
            <Button
              variant="outline"
              onClick={cancelRecording}
              className="h-11 w-full rounded-full text-sm"
            >
              Cancel aur dobara shuru karein
            </Button>
          </>
        )}
      </div>
    );
  }

  // Step 3 — intro / error
  return (
    <div className="space-y-4">
      <h2 className="text-center text-lg font-bold">Face Verification (Video KYC)</h2>
      <div className="rounded-md border border-primary/30 bg-secondary px-4 py-3 text-sm leading-relaxed text-foreground">
        Loan application complete karne ke liye apna face verification video record karein — jaise
        loan lete time ID verification hota hai. Camera khulega aur aapko guide kiya jayega.
      </div>
      <ul className="space-y-2 rounded-md border border-border/60 bg-card px-4 py-3 text-sm text-foreground">
        {INSTRUCTIONS.map((step) => (
          <li key={step.label} className="flex items-start gap-2">
            <ScanFace className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            {step.label}
          </li>
        ))}
      </ul>
      {error && (
        <p className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}
      <Button
        onClick={() => void startCamera()}
        className="h-12 w-full rounded-full px-6 text-base"
      >
        <Video className="mr-2 h-5 w-5" />
        {error ? "Camera dobara try karein" : "Camera start karein"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Achhi roshni mein rahin aur camera ko saamne rakhein
      </p>
    </div>
  );
}
