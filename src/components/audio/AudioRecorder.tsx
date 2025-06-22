import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Play, Pause, Square } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import AudioVisualizer from "./AudioVisualizer";
import TranscriptionDisplay from "./TranscriptionDisplay";

interface AudioRecorderProps {
  consultationId: Id<"consultations">;
  onRecordingComplete?: (audioRecordingId: Id<"audioRecordings">) => void;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
}

const AudioRecorder = ({
  consultationId,
  onRecordingComplete,
  onRecordingStart,
  onRecordingStop,
}: AudioRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [audioRecordingId, setAudioRecordingId] =
    useState<Id<"audioRecordings"> | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Convex queries and mutations
  const existingRecordings = useQuery(
    api.audio.getAudioRecordingsForConsultation,
    {
      consultationId,
    }
  );
  const existingAudioUrl = useQuery(
    api.audio.generateAudioUrl,
    audioRecordingId ? { audioRecordingId } : "skip"
  );
  const generateUploadUrl = useMutation(api.audio.generateUploadUrl);
  const storeAudioRecording = useMutation(api.audio.storeAudioRecording);

  // Set up timer for recording duration
  useEffect(() => {
    if (isRecording && !isPaused) {
      intervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRecording, isPaused]);

  // Clean up resources when component unmounts
  useEffect(() => {
    return () => {
      if (audioStream) {
        audioStream.getTracks().forEach((track) => track.stop());
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioStream, audioUrl]);

  // Check for existing recordings when component loads
  useEffect(() => {
    if (existingRecordings && existingRecordings.length > 0) {
      // Get the most recent recording
      const latestRecording = existingRecordings[existingRecordings.length - 1];
      setAudioRecordingId(latestRecording._id);
    }
  }, [existingRecordings]);

  const startRecording = async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);

      // Set up audio context for visualization
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Set up media recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = handleRecordingStop;

      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);

      // Notify parent component
      if (onRecordingStart) {
        onRecordingStart();
      }
    } catch (error) {
      console.error("Error starting recording:", error);
      alert(
        "Could not access microphone. Please ensure you have granted permission."
      );
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      // The onstop handler will take care of the rest
    }
  };

  const handleRecordingStop = async () => {
    if (audioStream) {
      audioStream.getTracks().forEach((track) => track.stop());
    }

    // Create audio blob and URL
    const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
    const url = URL.createObjectURL(audioBlob);
    setAudioUrl(url);
    setIsRecording(false);
    setIsPaused(false);

    // Notify parent component
    if (onRecordingStop) {
      onRecordingStop();
    }

    // Upload to Convex
    try {
      setIsUploading(true);

      // Get upload URL
      const uploadUrl = await generateUploadUrl();

      // Upload the file
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": audioBlob.type },
        body: audioBlob,
      });

      if (!result.ok) {
        throw new Error(`Upload failed: ${result.status} ${result.statusText}`);
      }

      const { storageId } = await result.json();

      // Store the recording metadata
      const recordingId = await storeAudioRecording({
        consultationId,
        storageId,
        fileName: `recording-${Date.now()}.webm`,
        fileType: audioBlob.type,
        fileSize: audioBlob.size,
        duration: recordingTime,
      });

      // Set the audio recording ID for transcription display
      setAudioRecordingId(recordingId);

      // Notify parent component
      if (onRecordingComplete) {
        onRecordingComplete(recordingId);
      }
    } catch (error) {
      console.error("Error uploading recording:", error);
      alert("Failed to upload recording. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      {/* Audio Visualizer */}
      {isRecording && (
        <div className="h-20 bg-gray-100 rounded-md overflow-hidden">
          {analyserRef.current && (
            <AudioVisualizer analyser={analyserRef.current} />
          )}
        </div>
      )}

      {/* Timer Display */}
      <div className="text-center">
        <div className="text-3xl font-mono text-[#1D1D1F] mb-2">
          {formatTime(recordingTime)}
        </div>
        {isRecording && (
          <div className="flex items-center justify-center space-x-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isPaused ? "bg-yellow-500" : "bg-red-500 animate-pulse"
              }`}
            ></div>
            <span className="text-sm text-[#86868B]">
              {isPaused ? "Paused" : "Recording"}
            </span>
          </div>
        )}
        {isUploading && (
          <div className="text-sm text-blue-500 mt-2">
            Uploading recording...
          </div>
        )}
      </div>

      {/* Audio Controls */}
      <div className="flex justify-center space-x-2">
        {!isRecording ? (
          <Button
            onClick={startRecording}
            className="bg-[#0066CC] hover:bg-[#0077ED]"
            disabled={isUploading}
          >
            <Mic className="h-4 w-4 mr-2" />
            Start Recording
          </Button>
        ) : (
          <>
            {!isPaused ? (
              <Button
                onClick={pauseRecording}
                variant="outline"
                disabled={isUploading}
              >
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
            ) : (
              <Button
                onClick={resumeRecording}
                className="bg-[#0066CC] hover:bg-[#0077ED]"
                disabled={isUploading}
              >
                <Play className="h-4 w-4 mr-2" />
                Resume
              </Button>
            )}
            <Button
              onClick={stopRecording}
              variant="destructive"
              disabled={isUploading}
            >
              <Square className="h-4 w-4 mr-2" />
              Stop
            </Button>
          </>
        )}
      </div>

      {/* Audio Playback (after recording) */}
      {(audioUrl || existingAudioUrl) && !isRecording && (
        <div className="mt-4">
          <audio
            src={audioUrl || existingAudioUrl}
            controls
            className="w-full"
          />
        </div>
      )}

      {/* Transcription Display (after recording is complete and uploaded) */}
      {audioRecordingId && (
        <div className="mt-6">
          <TranscriptionDisplay
            audioRecordingId={audioRecordingId}
            consultationId={consultationId}
          />
        </div>
      )}
    </div>
  );
};

export default AudioRecorder;
