"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Camera, RefreshCw, FlipVerticalIcon as Flip } from "lucide-react"

interface CameraViewProps {
  onCapture: (photoDataUrl: string) => void
  autoCapture?: boolean
  remainingPhotos?: number
}

export default function CameraView({ onCapture, autoCapture = false, remainingPhotos = 1 }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [isCameraReady, setIsCameraReady] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string>("")
  const [cameraFacingMode, setCameraFacingMode] = useState<"user" | "environment">("user")
  const [isMirrored, setIsMirrored] = useState(true)
  const [sessionStarted, setSessionStarted] = useState(false)
  const captureRef = useRef<() => void>(() => {})
  const onCaptureRef = useRef(onCapture)
  onCaptureRef.current = onCapture

  // Deteksi apakah perangkat adalah iOS
  const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent)

  // Gunakan useRef untuk menyimpan fungsi startCamera
  const startCameraRef = useRef<() => Promise<void>>()

  // Inisialisasi kamera saat komponen dimuat
  useEffect(() => {
    const startCamera = async () => {
      try {
        setDebugInfo("Memulai akses kamera...")

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop())
          streamRef.current = null
        }

        setError(null)
        setIsCameraReady(false)

        // Konfigurasi khusus untuk iOS
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: cameraFacingMode,
            width: { ideal: isIOS ? 640 : 1280 }, // Kurangi resolusi untuk iOS
            height: { ideal: isIOS ? 480 : 720 },
          },
          audio: false,
        }

        setDebugInfo("Meminta izin kamera...")

        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)

        if (!mediaStream || mediaStream.getVideoTracks().length === 0) {
          throw new Error("Tidak ada track video yang tersedia")
        }

        streamRef.current = mediaStream

        if (videoRef.current) {
          // Reset video element
          videoRef.current.srcObject = null
          videoRef.current.load()

          // Set new stream
          videoRef.current.srcObject = mediaStream
          videoRef.current.setAttribute("playsinline", "true")
          videoRef.current.setAttribute("webkit-playsinline", "true")

          // Tambahkan event listener untuk memastikan video dimuat
          const playPromise = videoRef.current.play()
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                setDebugInfo("Video berhasil diputar")
                setIsCameraReady(true)
              })
              .catch((err) => {
                console.error("Error playing video:", err)
                setDebugInfo(`Error saat memutar video: ${err.message}`)
                // Untuk iOS, coba play lagi setelah user interaction
                if (isIOS) {
                  const retryPlay = () => {
                    if (videoRef.current) {
                      videoRef.current
                        .play()
                        .then(() => {
                          setIsCameraReady(true)
                          document.removeEventListener("touchend", retryPlay)
                        })
                        .catch(console.error)
                    }
                  }
                  document.addEventListener("touchend", retryPlay)
                }
              })
          }
        }
      } catch (err: any) {
        console.error("Error accessing camera:", err)
        setDebugInfo(`Error akses kamera: ${err.message || err}`)

        // Pesan error yang lebih spesifik untuk iOS
        if (isIOS) {
          setError(
            `Tidak dapat mengakses kamera di iOS. Pastikan Anda: \n
            1. Menggunakan Safari browser\n
            2. Memberikan izin kamera\n
            3. Tidak ada aplikasi lain yang menggunakan kamera`,
          )
        } else {
          setError(
            `Tidak dapat mengakses kamera. Pastikan Anda telah memberikan izin dan tidak ada aplikasi lain yang menggunakan kamera. Detail: ${err.message || err}`,
          )
        }
        setIsCameraReady(false)
      }
    }

    startCameraRef.current = startCamera

    // Tambahkan delay untuk iOS
    const timer = setTimeout(
      () => {
        startCamera()
      },
      isIOS ? 1000 : 500,
    )

    return () => {
      clearTimeout(timer)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
    }
  }, [cameraFacingMode, isIOS])

  useEffect(() => { setIsMirrored(cameraFacingMode === "user") }, [cameraFacingMode])

  const switchCamera = useCallback(() => {
    setCameraFacingMode((prev) => (prev === "user" ? "environment" : "user"))
  }, [])

  const toggleMirror = useCallback(() => {
    setIsMirrored((prev) => !prev)
  }, [])

  // Modifikasi fungsi capturePhoto untuk menerapkan filter
  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current && isCameraReady) {
      const video = videoRef.current
      const canvas = canvasRef.current

      // Tentukan ukuran foto persegi
      const size = Math.min(video.videoWidth, video.videoHeight)

      // Hitung offset untuk cropping tengah
      const xOffset = (video.videoWidth - size) / 2
      const yOffset = (video.videoHeight - size) / 2

      // Set canvas dimensions menjadi persegi
      canvas.width = size
      canvas.height = size

      const context = canvas.getContext("2d")
      if (context) {
        // Terapkan efek mirror jika diaktifkan
        if (isMirrored) {
          context.translate(size, 0)
          context.scale(-1, 1)
        }

        // Gambar hanya bagian tengah video (crop menjadi persegi)
        context.drawImage(
          video,
          xOffset,
          yOffset,
          size,
          size, // Source: crop bagian tengah
          0,
          0,
          size,
          size, // Destination: seluruh canvas
        )

        // Reset transformasi
        if (isMirrored) {
          context.setTransform(1, 0, 0, 1, 0, 0)
        }

        onCaptureRef.current(canvas.toDataURL("image/jpeg", 0.9))
      }
    }
  }, [isCameraReady, isMirrored])
  captureRef.current = capturePhoto

  const startCountdown = useCallback(() => {
    if (!isCameraReady || countdown !== null) return
    setSessionStarted(true)
    setCountdown(3)
  }, [isCameraReady, countdown])

  useEffect(() => {
    if (!autoCapture || !sessionStarted || !isCameraReady || remainingPhotos <= 0 || countdown !== null) return
    const timer = window.setTimeout(() => setCountdown(3), 500)
    return () => window.clearTimeout(timer)
  }, [autoCapture, sessionStarted, isCameraReady, remainingPhotos, countdown])

  useEffect(() => {
    if (countdown === null) return
    if (countdown === 0) {
      const timer = window.setTimeout(() => {
        captureRef.current()
        setCountdown(null)
      }, 180)
      return () => window.clearTimeout(timer)
    }
    const timer = window.setTimeout(() => setCountdown((value) => value === null ? null : value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [countdown])

  return (
    <div className="relative max-w-md mx-auto">
      <div className="relative rounded-lg overflow-hidden bg-black aspect-[4/3]">
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <div className="text-center p-4">
              <p className="text-red-500 mb-4 whitespace-pre-line">{error}</p>
              <p className="text-xs text-gray-500 mb-4">{debugInfo}</p>
              <Button onClick={() => startCameraRef.current && startCameraRef.current()}>Coba Lagi</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                webkit-playsinline="true"
                muted
                className={`min-w-full min-h-full object-cover ${isMirrored ? "scale-x-[-1]" : ""}`}
                
              />
            </div>

            {/* Overlay persegi untuk area foto */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[75%] aspect-square border-2 border-white border-opacity-50 rounded-sm"></div>
            </div>

            {countdown !== null && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <span className="text-white text-7xl font-bold">{countdown}</span>
              </div>
            )}

            {!isCameraReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mb-4"></div>
                  <p className="text-white text-sm">{debugInfo || "Menyiapkan kamera..."}</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <div className="mt-4">
        {/* Control buttons */}
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={switchCamera}
            disabled={!isCameraReady || countdown !== null || (autoCapture && sessionStarted)}
            className="px-3"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Ganti Kamera
          </Button>

          <Button
            variant="outline"
            onClick={toggleMirror}
            disabled={!isCameraReady || countdown !== null}
            className="px-3"
          >
            <Flip className="mr-2 h-4 w-4" />
            {isMirrored ? "Non-Mirror" : "Mirror"}
          </Button>

          <Button onClick={startCountdown} disabled={!isCameraReady || countdown !== null}>
            <Camera className="mr-2 h-4 w-4" />
            {autoCapture ? (sessionStarted ? "Sesi Berjalan" : "Mulai Sesi Foto") : "Ambil Foto"}
          </Button>
        </div>
      </div>
    </div>
  )
}

