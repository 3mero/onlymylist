"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Home, History, PlaySquare, Menu, Clock, Eye, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/lib/i18n/language-context"
import { db, type Video, type Playlist } from "@/lib/db"
import { VideoCard } from "./video-card"
import { EnhancedVideoPlayer } from "./enhanced-video-player"

interface YouTubeLayoutProps {
  currentVideo?: Video
  onVideoSelect?: (video: Video) => void
  onVideoDelete?: (videoId: number) => void
}

export function YouTubeLayout({ currentVideo, onVideoSelect, onVideoDelete }: YouTubeLayoutProps) {
  const { t } = useLanguage()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeTab, setActiveTab] = useState("home")
  const [recentVideos, setRecentVideos] = useState<Video[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [recommendedVideos, setRecommendedVideos] = useState<Video[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const videos = await db.videos.orderBy("lastWatched").reverse().limit(20).toArray()
      setRecentVideos(videos)

      const allPlaylists = await db.playlists.toArray()
      setPlaylists(allPlaylists)

      // Get recommended videos (most watched)
      const recommended = await db.videos.orderBy("watchCount").reverse().limit(10).toArray()
      setRecommendedVideos(recommended)
    } catch (error) {
      console.error("Error loading data:", error)
    }
  }

  const handleDeleteCurrentVideo = async () => {
    if (!currentVideo?.id) return

    try {
      await db.deleteVideo(currentVideo.id)
      onVideoDelete?.(currentVideo.id)
      await loadData()
    } catch (error) {
      console.error("Error deleting video:", error)
    }
  }

  const sidebarItems = [
    { id: "home", label: t("home"), icon: Home },
    { id: "history", label: t("history"), icon: History },
    { id: "playlists", label: t("playlists"), icon: PlaySquare },
  ]

  const formatViewCount = (count: number) => {
    if (count < 1000) return count.toString()
    if (count < 1000000) return `${(count / 1000).toFixed(1)}K`
    return `${(count / 1000000).toFixed(1)}M`
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div
        className={cn(
          "bg-background border-r transition-all duration-300 flex flex-col",
          sidebarOpen ? "w-64" : "w-16",
        )}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full justify-start"
          >
            <Menu className="h-4 w-4" />
            {sidebarOpen && <span className="ml-2">{t("menu")}</span>}
          </Button>
        </div>

        {/* Sidebar Navigation */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {sidebarItems.map((item) => (
              <Button
                key={item.id}
                variant={activeTab === item.id ? "secondary" : "ghost"}
                className={cn("w-full justify-start", !sidebarOpen && "px-2")}
                onClick={() => setActiveTab(item.id)}
              >
                <item.icon className="h-4 w-4" />
                {sidebarOpen && <span className="ml-2">{item.label}</span>}
              </Button>
            ))}
          </div>

          {sidebarOpen && (
            <>
              <Separator className="my-4" />

              {/* Playlists */}
              <div className="p-2">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">{t("playlists")}</h3>
                <div className="space-y-1">
                  {playlists.slice(0, 5).map((playlist) => (
                    <Button
                      key={playlist.id}
                      variant="ghost"
                      className="w-full justify-start text-sm"
                      onClick={() => setActiveTab(`playlist-${playlist.id}`)}
                    >
                      <PlaySquare className="h-3 w-3 mr-2" />
                      <span className="truncate">{playlist.name}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}
        </ScrollArea>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Video Player Section */}
        {currentVideo && (
          <div className="bg-black">
            <div className="max-w-6xl mx-auto">
              <EnhancedVideoPlayer
                src={currentVideo.url}
                title={currentVideo.customTitle || currentVideo.title}
                onDelete={handleDeleteCurrentVideo}
                className="w-full"
              />
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 flex">
          {/* Main Content */}
          <div className="flex-1 p-6">
            {currentVideo && (
              <div className="max-w-6xl mx-auto mb-6">
                {/* Video Info */}
                <div className="space-y-4">
                  <h1 className="text-2xl font-bold">{currentVideo.customTitle || currentVideo.title}</h1>

                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Eye className="h-4 w-4" />
                      <span>
                        {formatViewCount(currentVideo.watchCount || 0)} {t("views")}
                      </span>
                    </div>

                    {currentVideo.lastWatched && (
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(currentVideo.lastWatched).toLocaleDateString()}</span>
                      </div>
                    )}

                    {currentVideo.duration && (
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{formatDuration(currentVideo.duration)}</span>
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  {currentVideo.tags && currentVideo.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {currentVideo.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Video Grid */}
            <div className="max-w-6xl mx-auto">
              <h2 className="text-xl font-semibold mb-4">
                {activeTab === "home" && t("recommended")}
                {activeTab === "history" && t("watchHistory")}
                {activeTab === "playlists" && t("playlists")}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {activeTab === "home" &&
                  recommendedVideos.map((video) => (
                    <VideoCard key={video.id} video={video} onClick={() => onVideoSelect?.(video)} showWatchCount />
                  ))}

                {activeTab === "history" &&
                  recentVideos.map((video) => (
                    <VideoCard key={video.id} video={video} onClick={() => onVideoSelect?.(video)} showWatchCount />
                  ))}

                {activeTab === "playlists" &&
                  playlists.map((playlist) => (
                    <div
                      key={playlist.id}
                      className="bg-card rounded-lg p-4 cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => setActiveTab(`playlist-${playlist.id}`)}
                    >
                      <div className="aspect-video bg-muted rounded-md mb-3 flex items-center justify-center">
                        <PlaySquare className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="font-medium truncate">{playlist.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {playlist.videos.length} {t("videos")}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Right Sidebar - Related Videos */}
          {currentVideo && (
            <div className="w-80 border-l p-4">
              <h3 className="font-semibold mb-4">{t("upNext")}</h3>
              <ScrollArea className="h-full">
                <div className="space-y-3">
                  {recommendedVideos
                    .filter((video) => video.id !== currentVideo.id)
                    .slice(0, 10)
                    .map((video) => (
                      <div
                        key={video.id}
                        className="flex space-x-3 cursor-pointer hover:bg-accent rounded-lg p-2 transition-colors"
                        onClick={() => onVideoSelect?.(video)}
                      >
                        <div className="w-24 h-16 bg-muted rounded flex-shrink-0 flex items-center justify-center">
                          <PlaySquare className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium line-clamp-2 mb-1">{video.customTitle || video.title}</h4>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div>
                              {formatViewCount(video.watchCount || 0)} {t("views")}
                            </div>
                            {video.duration && <div>{formatDuration(video.duration)}</div>}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
