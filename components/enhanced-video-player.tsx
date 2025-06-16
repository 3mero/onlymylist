"use client"

import { useState, useRef, useEffect } from "react"
import { useVideoStore } from "@/lib/store"
import { useLanguage } from "@/lib/i18n/language-context"
import { useToast } from "@/hooks/use-toast"
import { db } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, SkipBack, SkipForward, Trash2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function EnhancedVideoPlayer() {
  const { currentVideo, setCurrentVideo } = useVideoStore()
  const { t } = useLanguage()
  const { toast } = useToast()
  const videoRef = useRef<HTMLVideoElement>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const handleError = (e: Event) => {
    console.error("Video error event:", e)
    const videoElement = e.target as HTMLVideoElement
    let errorMessage = "Failed to load video"
    let errorDetails = ""

    // Check if video element and error exist
    if (videoElement && videoElement.error) {
      const error = videoElement.error
      errorDetails = `Error code: ${error.code}`

      switch (error.code) {
        case 1: // MEDIA_ERR_ABORTED
          errorMessage = "Video loading was aborted"
          break
        case 2: // MEDIA_ERR_NETWORK
          errorMessage = "Network error - check your connection"
          break
        case 3: // MEDIA_ERR_DECODE
          errorMessage = "Video format not supported or corrupted"
          break
        case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
          errorMessage = "Video source not supported or invalid URL"
          break
        default:
          errorMessage = `Video error (code: ${error.code})`
      }
    } else {
      // Fallback error detection when no specific error is available
      if (currentVideo?.url) {
        try {
          const url = new URL(currentVideo.url)
          if (!url.protocol.startsWith("http")) {
            errorMessage = "Invalid video URL - must use HTTP or HTTPS"
          } else {
            errorMessage = "Unable to load video - check URL and format"
          }
        } catch {
          errorMessage = "Invalid video URL format"
        }
      }
    }

    console.error("Video error details:", { errorMessage, errorDetails, url: currentVideo?.url })
    setError(errorMessage)
    setIsLoading(false)
  }

  useEffect(() => {
    if (!currentVideo?.url) {
      setError("No video URL provided")
      setIsLoading(false)
      return
    }

    const video = videoRef.current
    if (!video) {
      setError("Video player not available")
      setIsLoading(false)
      return
    }

    // Reset states when video changes
    setIsLoading(true)
    setError(null)
    setRetryCount(0)
    setCurrentTime(0)
    setDuration(0)
    setIsPlaying(false)

    // Validate URL format
    try {
      const url = new URL(currentVideo.url)
      if (!url.protocol.startsWith("http")) {
        setError("Invalid video URL - must use HTTP or HTTPS")
        setIsLoading(false)
        return
      }
    } catch {
      setError("Invalid video URL format")
      setIsLoading(false)
      return
    }

    const handleLoadedMetadata = () => {
      console.log("Video metadata loaded successfully")
      if (video.duration && !isNaN(video.duration)) {
        setDuration(video.duration)
      }
      setIsLoading(false)
      setError(null)
    }

    const handleTimeUpdate = () => {
      if (video.currentTime && !isNaN(video.currentTime)) {
        setCurrentTime(video.currentTime)
      }
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    const handleLoadStart = () => {
      console.log("Video loading started")
      setIsLoading(true)
      setError(null)
    }

    const handleCanPlay = () => {
      console.log("Video can play")
      setIsLoading(false)
      setError(null)
    }

    const handleLoadedData = () => {
      console.log("Video data loaded")
      setIsLoading(false)
    }

    const handleWaiting = () => {
      console.log("Video waiting for data")
      setIsLoading(true)
    }

    const handleCanPlayThrough = () => {
      console.log("Video can play through")
      setIsLoading(false)
    }

    // Add timeout for loading
    const loadTimeout = setTimeout(() => {
      if (isLoading) {
        setError("Video loading timeout - the video may be too large or the server is slow")
        setIsLoading(false)
      }
    }, 30000) // 30 second timeout

    // Add all event listeners
    video.addEventListener("loadedmetadata", handleLoadedMetadata)
    video.addEventListener("timeupdate", handleTimeUpdate)
    video.addEventListener("play", handlePlay)
    video.addEventListener("pause", handlePause)
    video.addEventListener("error", handleError)
    video.addEventListener("loadstart", handleLoadStart)
    video.addEventListener("canplay", handleCanPlay)
    video.addEventListener("loadeddata", handleLoadedData)
    video.addEventListener("waiting", handleWaiting)
    video.addEventListener("canplaythrough", handleCanPlayThrough)

    // Set video source safely
    try {
      // Clear any existing source first
      video.src = ""
      video.load()

      // Set new source
      video.src = currentVideo.url
      video.load()
    } catch (err) {
      console.error("Error setting video source:", err)
      setError("Failed to set video source")
      setIsLoading(false)
    }

    return () => {
      clearTimeout(loadTimeout)
      video.removeEventListener("loadedmetadata", handleLoadedMetadata)
      video.removeEventListener("timeupdate", handleTimeUpdate)
      video.removeEventListener("play", handlePlay)
      video.removeEventListener("pause", handlePause)
      video.removeEventListener("error", handleError)
      video.removeEventListener("loadstart", handleLoadStart)
      video.removeEventListener("canplay", handleCanPlay)
      video.removeEventListener("loadeddata", handleLoadedData)
      video.removeEventListener("waiting", handleWaiting)
      video.removeEventListener("canplaythrough", handleCanPlayThrough)
    }
  }, [currentVideo?.url])

  const retryVideo = () => {
    if (!currentVideo?.url || !videoRef.current) return

    console.log(`Retrying video load (attempt ${retryCount + 1}/3)`)
    setRetryCount((prev) => prev + 1)
    setError(null)
    setIsLoading(true)

    const video = videoRef.current

    try {
      // Clear current source completely
      video.removeAttribute("src")
      video.load()

      // Set new source after a brief delay
      setTimeout(() => {
        try {
          video.src = currentVideo.url
          video.load()
        } catch (err) {
          console.error("Error during retry:", err)
          setError("Failed to retry video loading")
          setIsLoading(false)
        }
      }, 500)
    } catch (err) {
      console.error("Error clearing video source:", err)
      setError("Failed to reset video player")
      setIsLoading(false)
    }
  }

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
    } else {
      video.play()
    }
  }

  const handleSeek = (value: number[]) => {
    const video = videoRef.current
    if (!video) return

    video.currentTime = value[0]
    setCurrentTime(value[0])
  }

  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current
    if (!video) return

    const newVolume = value[0]
    video.volume = newVolume
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return

    if (isMuted) {
      video.volume = volume
      setIsMuted(false)
    } else {
      video.volume = 0
      setIsMuted(true)
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const skip = (seconds: number) => {
    const video = videoRef.current
    if (!video) return

    video.currentTime = Math.max(0, Math.min(duration, video.currentTime + seconds))
  }

  const changePlaybackRate = (rate: number) => {
    const video = videoRef.current
    if (!video) return

    video.playbackRate = rate
    setPlaybackRate(rate)
  }

  const handleDeleteVideo = async () => {
    if (!currentVideo?.id) return

    try {
      await db.videos.delete(currentVideo.id)
      toast({
        title: t.video.delete,
        description: `"${currentVideo.customTitle || currentVideo.title}" has been deleted.`,
      })
      setCurrentVideo(null)
    } catch (error) {
      console.error("Error deleting video:", error)
      toast({
        title: t.common.error,
        description: "Failed to delete video.",
        variant: "destructive",
      })
    }
    setShowDeleteDialog(false)
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  if (!currentVideo) {
    return (
      <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
        <p className="text-muted-foreground">{t.player.noVideoSelected}</p>
      </div>
    )
  }

  return (
    <div className="relative bg-black rounded-lg overflow-hidden group">
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full aspect-video"
        onClick={togglePlay}
        onMouseMove={() => setShowControls(true)}
        crossOrigin="anonymous"
        preload="metadata"
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-white text-lg">{t.common.loading}</div>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-white text-center max-w-md p-4">
            <p className="text-lg mb-2">{error}</p>
            <p className="text-sm mb-4 opacity-75">URL: {currentVideo.url}</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={retryVideo} disabled={retryCount >= 3}>
                {retryCount >= 3
                  ? "Max retries reached"
                  : `${t.video.retry} ${retryCount > 0 ? `(${retryCount}/3)` : ""}`}
              </Button>
              <Button variant="outline" onClick={() => setCurrentVideo(null)}>
                {t.common.cancel}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Button */}
      <Button
        variant="destructive"
        size="sm"
        className="absolute top-4 left-4 z-10"
        onClick={() => setShowDeleteDialog(true)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      {/* Controls */}
      {showControls && !isLoading && !error && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          {/* Progress Bar */}
          <div className="mb-4">
            <Slider value={[currentTime]} max={duration} step={1} onValueChange={handleSeek} className="w-full" />
            <div className="flex justify-between text-white text-sm mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => skip(-10)} className="text-white hover:bg-white/20">
                <SkipBack className="h-4 w-4" />
              </Button>

              <Button variant="ghost" size="sm" onClick={togglePlay} className="text-white hover:bg-white/20">
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>

              <Button variant="ghost" size="sm" onClick={() => skip(10)} className="text-white hover:bg-white/20">
                <SkipForward className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-2 ml-4">
                <Button variant="ghost" size="sm" onClick={toggleMute} className="text-white hover:bg-white/20">
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                <Slider
                  value={[isMuted ? 0 : volume]}
                  max={1}
                  step={0.1}
                  onValueChange={handleVolumeChange}
                  className="w-20"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Speed Control */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                    {playbackRate}x
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                    <DropdownMenuItem key={rate} onClick={() => changePlaybackRate(rate)}>
                      {rate}x
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="ghost" size="sm" onClick={toggleFullscreen} className="text-white hover:bg-white/20">
                {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Video Info */}
      <div className="absolute top-4 left-4 text-white">
        <h3 className="text-lg font-semibold">{currentVideo.customTitle || currentVideo.title}</h3>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.video.deleteConfirm}</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the video from your library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteVideo}>{t.common.delete}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
