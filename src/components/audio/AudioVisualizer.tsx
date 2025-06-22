import { useEffect, useRef } from "react";

interface AudioVisualizerProps {
  analyser: AnalyserNode;
}

const AudioVisualizer = ({ analyser }: AudioVisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas dimensions
    const resizeCanvas = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Create visualization
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      // Get frequency data
      analyser.getByteFrequencyData(dataArray);

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw visualization
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;

        // Create gradient
        const gradient = ctx.createLinearGradient(
          0,
          canvas.height,
          0,
          canvas.height - barHeight
        );
        gradient.addColorStop(0, "rgba(0, 102, 204, 0.8)"); // Blue
        gradient.addColorStop(1, "rgba(0, 153, 255, 0.4)");

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    // Start animation
    draw();

    // Clean up
    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
};

export default AudioVisualizer;
