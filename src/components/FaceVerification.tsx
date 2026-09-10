import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Camera,
  CheckCircle2,
  LoaderCircle,
  RefreshCcw,
  ScanFace,
  ShieldCheck,
  VideoOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_VIDEO_BYTES, type FaceCapture } from "@/lib/loan-applications";

/**
 * Guided liveness capture.
 *
 * The applicant is asked to look straight, then left, right, up and down while
 * a single continuous clip records. The clip is kept in memory as a Blob and
 * handed back to the caller, which uploads it together with the application.
 *
 * This is a UX-level liveness check (a guided recording an operator can review)
 * — it does not run biometric face matching on the device.
 */

const STEP_SECONDS = 3;

const STEPS = [
  {
    id: "center",
    label: "Look straight at the camera",
    hint: "Keep your whole face inside the oval.",
    Icon: ScanFace,
  },
  {
    id: "left",
    label: "Slowly turn your head LEFT",
    hint: "Hold it until the ring completes.",
    Icon: ArrowLeft,
  },
  {
    id: "right",
    label: "Slowly turn your head RIGHT",
    hint: "Keep your eyes open.",
    Icon: ArrowRight,
  },
  {
    id: "up",
    label: "Slowly look UP",
    hint: "Lift your chin a little.",
    Icon: ArrowUp,
  },
  {
    id: "down",
    label: "Slowly look DOWN",
    hint: "Almost done.",
    Icon: ArrowDown,
  },
] as const;

type Phase = "idle" | "requesting" | "ready" | "recording" | "finishing" | "done" | "error";

function pickMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4;codecs=h264",
    "video/mp4",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

export function FaceVerification({
  onVerified,
  onBack,
  disabled = false,
}: {
  onVerified: (capture: FaceCapture) => void;
  onBack?: () => void;
  disabled?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const tickRef = useRef<number>(undefined);
  const captureRef = useRef<FaceCapture | undefined>(undefined);

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [stepIndex, setStepIndex] = useState(0);
  const [stepProgress, setStepProgress] = useState(0);
  const [capture, setCapture] = useState<FaceCapture>();

  const totalSeconds = STEPS.length * STEP_SECONDS;

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  // Release the camera and any object URL when the component goes away.
  useEffect(() => {
    return () => {
      window.clearInterval(tickRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (captureRef.current) URL.revokeObjectURL(captureRef.current.previewUrl);
    };
  }, []);

  useEffect(() => {
    captureRef.current = capture;
  }, [capture]);

  const startCamera = useCallback(async () => {
    setError("");
    setPhase("requesting");
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Your browser does not support camera capture.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setPhase("ready");
    } catch (cause) {
      const name = cause instanceof DOMException ? cause.name : "";
      setError(
        name === "NotAllowedError"
          ? "Camera permission was denied. Allow camera access in your browser and try again."
          : name === "NotFoundError"
            ? "No camera was found on this device."
            : cause instanceof Error
              ? cause.message
              : "The camera could not be started.",
      );
      setPhase("error");
    }
  }, []);

  const finishRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    setPhase("finishing");
    if (recorder.state !== "inactive") recorder.stop();
  }, []);

  const startRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    if (typeof MediaRecorder === "undefined") {
      setError("Your browser cannot record video. Please try Chrome or Safari.");
      setPhase("error");
      return;
    }

    chunksRef.current = [];
    const mimeType = pickMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch {
      setError("Video recording could not be started on this device.");
      setPhase("error");
      return;
    }
    recorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      window.clearInterval(tickRef.current);
      const type = recorder.mimeType || mimeType || "video/webm";
      const blob = new Blob(chunksRef.current, { type });
      stopStream();

      if (blob.size === 0) {
        setError("The recording was empty. Please try again.");
        setPhase("error");
        return;
      }
      if (blob.size > MAX_VIDEO_BYTES) {
        setError("The recording is too large. Please retry in a well-lit room.");
        setPhase("error");
        return;
      }
      const result: FaceCapture = {
        blob,
        type,
        size: blob.size,
        durationSeconds: totalSeconds,
        previewUrl: URL.createObjectURL(blob),
      };
      setCapture(result);
      setPhase("done");
    };

    recorder.start(250);
    setStepIndex(0);
    setStepProgress(0);
    setPhase("recording");

    // Drive the on-screen prompts: one tick every 100 ms.
    const ticksPerStep = (STEP_SECONDS * 1000) / 100;
    let elapsedTicks = 0;
    tickRef.current = window.setInterval(() => {
      elapsedTicks += 1;
      const currentStep = Math.floor(elapsedTicks / ticksPerStep);
      if (currentStep >= STEPS.length) {
        window.clearInterval(tickRef.current);
        finishRecording();
        return;
      }
      setStepIndex(currentStep);
      setStepProgress(((elapsedTicks % ticksPerStep) / ticksPerStep) * 100);
    }, 100);
  }, [finishRecording, stopStream, totalSeconds]);

  const retake = useCallback(() => {
    if (capture) URL.revokeObjectURL(capture.previewUrl);
    setCapture(undefined);
    setStepIndex(0);
    setStepProgress(0);
    setError("");
    setPhase("idle");
    void startCamera();
  }, [capture, startCamera]);

  const activeStep = STEPS[Math.min(stepIndex, STEPS.length - 1)]!;
  const overallProgress =
    phase === "done" ? 100 : ((stepIndex + stepProgress / 100) / STEPS.length) * 100;

  return (
    <div>
      <h2 className="mb-1 text-center text-lg font-bold">Face Verification</h2>
      <p className="mb-4 text-center text-xs text-muted-foreground">
        Record a short liveness video — look straight, then left, right, up and down.
      </p>

      <div className="relative mx-auto aspect-[3/4] w-full max-w-[320px] overflow-hidden rounded-xl bg-black">
        {/* Live preview */}
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          className={`h-full w-full -scale-x-100 object-cover ${phase === "done" ? "hidden" : ""}`}
        />

        {/* Recorded playback */}
        {phase === "done" && capture && (
          <video
            src={capture.previewUrl}
            controls
            playsInline
            loop
            className="h-full w-full -scale-x-100 object-cover"
          />
        )}

        {/* Face oval guide */}
        {(phase === "ready" || phase === "recording" || phase === "finishing") && (
          <svg viewBox="0 0 300 400" className="pointer-events-none absolute inset-0 h-full w-full">
            <defs>
              <mask id="face-oval-mask">
                <rect width="300" height="400" fill="white" />
                <ellipse cx="150" cy="185" rx="96" ry="126" fill="black" />
              </mask>
            </defs>
            <rect width="300" height="400" fill="rgba(0,0,0,0.45)" mask="url(#face-oval-mask)" />
            <ellipse
              cx="150"
              cy="185"
              rx="96"
              ry="126"
              fill="none"
              strokeWidth="3"
              strokeDasharray="10 8"
              stroke={phase === "recording" ? "var(--chola-red)" : "rgba(255,255,255,0.8)"}
            />
          </svg>
        )}

        {/* Idle / permission states */}
        {(phase === "idle" || phase === "requesting" || phase === "error") && (
          <div className="absolute inset-0 grid place-items-center bg-chola-blue-dark/95 px-6 text-center">
            {phase === "requesting" ? (
              <div>
                <LoaderCircle className="mx-auto h-10 w-10 animate-spin text-white" />
                <p className="mt-3 text-sm text-white/80">Starting your camera…</p>
              </div>
            ) : phase === "error" ? (
              <div>
                <VideoOff className="mx-auto h-10 w-10 text-white" />
                <p className="mt-3 text-sm text-white/85">{error}</p>
              </div>
            ) : (
              <div>
                <Camera className="mx-auto h-11 w-11 text-white" />
                <p className="mt-3 text-sm text-white/85">
                  We need your camera to record a short verification video.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Recording badge */}
        {(phase === "recording" || phase === "finishing") && (
          <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
            <span className="text-[11px] font-semibold text-white">REC</span>
          </div>
        )}

        {/* Step prompt */}
        {phase === "recording" && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-4 pb-4 pt-8 text-center">
            <activeStep.Icon className="mx-auto h-8 w-8 animate-bounce text-white" />
            <p className="mt-1.5 text-[15px] font-bold text-white">{activeStep.label}</p>
            <p className="text-[11px] text-white/70">{activeStep.hint}</p>
          </div>
        )}

        {phase === "done" && (
          <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-success px-3 py-1.5">
            <CheckCircle2 className="h-4 w-4 text-white" />
            <span className="text-[11px] font-semibold text-white">Captured</span>
          </div>
        )}
      </div>

      {/* Step chips */}
      <div className="mx-auto mt-4 flex max-w-[320px] justify-between gap-1">
        {STEPS.map((step, index) => {
          const complete = phase === "done" || index < stepIndex;
          const active = phase === "recording" && index === stepIndex;
          return (
            <div key={step.id} className="flex flex-1 flex-col items-center gap-1">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${
                  complete
                    ? "border-success bg-success text-white"
                    : active
                      ? "border-chola-red bg-chola-red/10 text-chola-red"
                      : "border-border bg-card text-muted-foreground"
                }`}
              >
                {complete ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <step.Icon className="h-4 w-4" />
                )}
              </span>
              <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
                {step.id}
              </span>
            </div>
          );
        })}
      </div>

      {/* Overall progress */}
      {(phase === "recording" || phase === "finishing" || phase === "done") && (
        <div className="mx-auto mt-3 h-1.5 w-full max-w-[320px] overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-chola-red transition-all duration-100"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      )}

      {error && phase !== "error" && (
        <p className="mt-3 text-center text-sm text-destructive">{error}</p>
      )}

      {/* Controls */}
      <div className="mt-5 flex flex-col items-center gap-3">
        {(phase === "idle" || phase === "error") && (
          <Button onClick={() => void startCamera()} className="h-12 rounded-full px-10 text-base">
            <Camera className="mr-2 h-5 w-5" />
            {phase === "error" ? "Try again" : "Start camera"}
          </Button>
        )}

        {phase === "ready" && (
          <>
            <p className="text-center text-xs text-muted-foreground">
              Position your face inside the oval. The recording lasts about {totalSeconds} seconds.
            </p>
            <Button onClick={startRecording} className="h-12 rounded-full px-10 text-base">
              <ScanFace className="mr-2 h-5 w-5" />
              Start face verification
            </Button>
          </>
        )}

        {(phase === "recording" || phase === "finishing") && (
          <p className="flex items-center gap-2 text-sm text-primary">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            {phase === "finishing" ? "Saving your video…" : "Recording — follow the prompts"}
          </p>
        )}

        {phase === "done" && capture && (
          <>
            <p className="flex items-center gap-2 text-center text-sm font-semibold text-success">
              <ShieldCheck className="h-5 w-5" />
              Liveness video recorded ({Math.round(capture.size / 1024)} KB)
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button
                variant="outline"
                onClick={retake}
                disabled={disabled}
                className="h-12 rounded-full px-7"
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Retake
              </Button>
              <Button
                disabled={disabled}
                onClick={() => onVerified(capture)}
                className="h-12 rounded-full px-9 text-base"
              >
                Continue
              </Button>
            </div>
          </>
        )}

        {onBack && phase !== "recording" && phase !== "finishing" && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              stopStream();
              onBack();
            }}
            className="text-sm text-muted-foreground underline"
          >
            Back to documents
          </button>
        )}
      </div>

      <p className="mt-5 rounded-md bg-secondary px-3 py-2 text-center text-[11px] leading-relaxed text-muted-foreground">
        Your video is recorded on this device and uploaded only with your loan application. It is
        used to confirm that a real person submitted the KYC documents.
      </p>
    </div>
  );
}
