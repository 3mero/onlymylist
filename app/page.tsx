"use client"

import { useState, useEffect } from "react"
import { VideoPlayer } from "@/components/video-player"
import { VideoUrlInput } from "@/components/video-url-input"
import { RecentVideos } from "@/components/recent-videos"
import { GlobalSearchInput } from "@/components/global-search-input"
import { WelcomeDialog } from "@/components/welcome-dialog"
import PlaylistSidebar from "@/components/playlist-sidebar"
import { CreatePlaylistDialog } from "@/components/create-playlist-dialog"
import { useVideoStore } from "@/lib/store"
import { useLanguage } from "@/lib/i18n/language-context"
import { db, type Video, type Playlist } from "@/lib/db"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Play, Clock, TrendingUp, Heart, ListPlus, Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function HomePage() {
  const { currentVideo, currentPlaylist, setCurrentVideo, setCurrentPlaylist, setPlaylistIndex } = useVideoStore()
  const { t } = useLanguage()
  const { toast } = useToast()

  const [recentVideos, setRecentVideos] = useState<Video[]>([])
  const [popularVideos, setPopularVideos] = useState<Video[]>([])
  const [favoriteVideos, setFavoriteVideos] = useState<Video[]>([])
  const [currentPlayingPlaylist, setCurrentPlayingPlaylist] = useState<Playlist | null>(null)
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState(false)
  const [quickPlaylist, setQuickPlaylist] = useState<Video[]>([])
  const [allPlaylists, setAllPlaylists] = useState<Playlist[]>([])

  useEffect(() => {
    loadVideos()
    loadPlaylists()
    // Create a quick playlist from recent videos if no current playlist
    if (!currentPlaylist) {
      createQuickPlaylist()
    }
  }, [currentPlaylist])

  useEffect(() => {
    const handlePlaylistUpdate = () => {
      // Refresh playlists when new ones are created
      loadPlaylists()
    }

    window.addEventListener("playlistUpdated", handlePlaylistUpdate as EventListener)
    return () => {
      window.removeEventListener("playlistUpdated", handlePlaylistUpdate as EventListener)
    }
  }, [])

  const loadVideos = async () => {
    try {
      const recent = await db.videos.orderBy("lastWatched").reverse().limit(10).toArray()
      const popular = await db.videos.orderBy("watchCount").reverse().limit(10).toArray()
      const favorites = await db.getFavoriteVideos()

      setRecentVideos(recent)
      setPopularVideos(popular)
      setFavoriteVideos(favorites)
    } catch (error) {
      console.error("Error loading videos:", error)
    }
  }

  const loadPlaylists = async () => {
    try {
      const playlists = await db.playlists.orderBy("createdAt").reverse().toArray()
      setAllPlaylists(playlists)
    } catch (error) {
      console.error("Error loading playlists:", error)
    }
  }

  const createQuickPlaylist = async () => {
    try {
      const allVideos = await db.videos.orderBy("lastWatched").reverse().limit(20).toArray()
      setQuickPlaylist(allVideos)

      if (allVideos.length > 0 && !currentPlaylist) {
        const quickPlaylistData: Playlist = {
          id: 0,
          name: t.playlists?.quickPlaylist || "قائمة سريعة",
          description: t.playlists?.quickPlaylistDescription || "قائمة تشغيل تلقائية من الفيديوهات الحديثة",
          videos: allVideos,
          createdAt: new Date(),
          updatedAt: new Date(),
          isDefault: true,
        }
        setCurrentPlayingPlaylist(quickPlaylistData)
      }
    } catch (error) {
      console.error("Error creating quick playlist:", error)
    }
  }

  const handleVideoSelect = async (video: Video) => {
    try {
      const updatedVideo = await db.addToHistory(video)
      if (updatedVideo) {
        setCurrentVideo(updatedVideo)

        if (!currentPlaylist) {
          const recentVideos = await db.videos.orderBy("lastWatched").reverse().limit(10).toArray()
          const playlistVideos = [updatedVideo, ...recentVideos.filter((v) => v.id !== updatedVideo.id)]

          const autoPlaylist: Playlist = {
            id: 0,
            name: t.playlists?.autoPlaylist || "قيد التشغيل الآن",
            description: t.playlists?.autoPlaylistDescription || "قائمة تشغيل تلقائية",
            videos: playlistVideos,
            createdAt: new Date(),
            updatedAt: new Date(),
            isDefault: true,
          }

          setCurrentPlaylist(autoPlaylist)
          setCurrentPlayingPlaylist(autoPlaylist)
          setPlaylistIndex(0)
        } else {
          const videoIndex = currentPlaylist.videos.findIndex((v) => v.id === updatedVideo.id)
          if (videoIndex !== -1) {
            setPlaylistIndex(videoIndex)
          } else {
            const updatedPlaylist = {
              ...currentPlaylist,
              videos: [updatedVideo, ...currentPlaylist.videos],
              updatedAt: new Date(),
            }
            setCurrentPlaylist(updatedPlaylist)
            setCurrentPlayingPlaylist(updatedPlaylist)
            setPlaylistIndex(0)
          }
        }
      }
    } catch (error) {
      console.error("Error selecting video:", error)
      toast({
        title: t.common?.error || "خطأ",
        description: "فشل في تحميل الفيديو",
        variant: "destructive",
      })
    }
  }

  const handleAddToQuickPlaylist = async (video: Video) => {
    try {
      const updatedVideo = await db.addToHistory(video)
      if (updatedVideo) {
        const newQuickPlaylist = [updatedVideo, ...quickPlaylist.filter((v) => v.id !== updatedVideo.id)]
        setQuickPlaylist(newQuickPlaylist)

        if (currentPlayingPlaylist?.isDefault) {
          const updatedPlaylist = {
            ...currentPlayingPlaylist,
            videos: newQuickPlaylist,
            updatedAt: new Date(),
          }
          setCurrentPlayingPlaylist(updatedPlaylist)
          setCurrentPlaylist(updatedPlaylist)
        }

        toast({
          title: t.playlists?.addedToPlaylist || "تمت الإضافة للقائمة",
          description: `"${updatedVideo.customTitle || updatedVideo.title}" تمت إضافته للقائمة السريعة`,
        })
      }
    } catch (error) {
      console.error("Error adding to quick playlist:", error)
    }
  }

  const handleToggleFavorite = async (video: Video) => {
    try {
      const isNowFavorite = await db.toggleVideoFavorite(video)
      toast({
        title: isNowFavorite ? "تمت الإضافة للمفضلة" : "تمت الإزالة من المفضلة",
        description: `"${video.customTitle || video.title}" ${isNowFavorite ? "تمت إضافته" : "تمت إزالته"} ${isNowFavorite ? "إلى" : "من"} المفضلة`,
      })
      // Reload videos and playlists to update the UI
      loadVideos()
      loadPlaylists()
    } catch (error) {
      console.error("Error toggling favorite:", error)
      toast({
        title: "خطأ",
        description: "فشل في تحديث حالة المفضلة",
        variant: "destructive",
      })
    }
  }

  const handlePlaylistSelect = (playlist: Playlist) => {
    setCurrentPlaylist(playlist)
    setCurrentPlayingPlaylist(playlist)
    setPlaylistIndex(0)
  }

  const displayPlaylist = currentPlaylist || currentPlayingPlaylist

  return (
    <div className="container mx-auto px-1 md:px-4 py-4 md:py-6 space-y-6">
      {/* Video Input */}
      <div className="w-full">
        <VideoUrlInput />
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Video Player - Takes 3 columns */}
        <div className="lg:col-span-3">
          {currentVideo ? (
            <VideoPlayer />
          ) : (
            <Card className="aspect-video flex items-center justify-center bg-muted">
              <div className="text-center space-y-4">
                <Play className="w-16 h-16 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold">{t.player?.noVideoSelected || "لم يتم اختيار فيديو"}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t.player?.selectVideoToPlay || "اختر فيديو من الأسفل أو أضف رابط جديد لبدء التشغيل"}
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Playlist Sidebar - Takes 1 column */}
        <div className="lg:col-span-1">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{t.playlists?.currentPlaylist || "قائمة التشغيل الحالية"}</h3>
              <Button size="sm" variant="outline" onClick={() => setIsCreatePlaylistOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t.playlists?.create || "إنشاء"}
              </Button>
            </div>

            {allPlaylists.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">اختر قائمة تشغيل:</label>
                <select
                  className="w-full p-2 border rounded-md bg-background"
                  value={displayPlaylist?.id || ""}
                  onChange={(e) => {
                    const selectedId = Number.parseInt(e.target.value)
                    const selectedPlaylist = allPlaylists.find((p) => p.id === selectedId)
                    if (selectedPlaylist) {
                      handlePlaylistSelect(selectedPlaylist)
                    }
                  }}
                >
                  <option value="">اختر قائمة تشغيل</option>
                  {allPlaylists.map((playlist) => (
                    <option key={playlist.id} value={playlist.id}>
                      {playlist.name} ({playlist.videos.length} فيديو)
                      {playlist.isFavorites && " 🌟"}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {displayPlaylist && displayPlaylist.videos.length > 0 ? (
              <PlaylistSidebar className="max-h-[calc(100vh-300px)] sticky top-4" isPlayerOnPage={true} />
            ) : (
              <Card className="p-6 text-center">
                <ListPlus className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t.playlists?.noPlaylist || "لا توجد قائمة تشغيل"}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t.playlists?.createPlaylistPrompt || "أنشئ قائمة تشغيل أو اختر فيديوهات لبناء قائمة الانتظار"}
                </p>
                <Button onClick={() => setIsCreatePlaylistOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t.playlists?.createFirst || "إنشاء قائمة تشغيل"}
                </Button>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Video Library Tabs */}
      <div className="w-full">
        <Tabs defaultValue="recent" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="recent" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {t.navigation?.recent || "الحديثة"}
              {recentVideos.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {recentVideos.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="popular" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              {t.navigation?.popular || "الشائعة"}
              {popularVideos.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {popularVideos.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="favorites" className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              {t.navigation?.favorites || "المفضلة"}
              {favoriteVideos.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {favoriteVideos.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recent" className="mt-6">
            {recentVideos.length > 0 ? (
              <RecentVideos
                videos={recentVideos}
                onVideoSelect={handleVideoSelect}
                onAddToPlaylist={handleAddToQuickPlaylist}
                onToggleFavorite={handleToggleFavorite}
              />
            ) : (
              <Card className="p-8 text-center">
                <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t.history?.noVideos || "لا توجد فيديوهات حديثة"}</h3>
                <p className="text-sm text-muted-foreground">
                  {t.history?.addFirstVideo || "أضف أول فيديو باستخدام حقل الرابط أعلاه"}
                </p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="popular" className="mt-6">
            {popularVideos.length > 0 ? (
              <RecentVideos
                videos={popularVideos}
                onVideoSelect={handleVideoSelect}
                onAddToPlaylist={handleAddToQuickPlaylist}
                onToggleFavorite={handleToggleFavorite}
              />
            ) : (
              <Card className="p-8 text-center">
                <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {t.stats?.noPopularVideos || "لا توجد فيديوهات شائعة بعد"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t.stats?.watchMoreVideos || "شاهد المزيد من الفيديوهات لرؤية الأكثر شعبية هنا"}
                </p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="favorites" className="mt-6">
            {favoriteVideos.length > 0 ? (
              <RecentVideos
                videos={favoriteVideos}
                onVideoSelect={handleVideoSelect}
                onAddToPlaylist={handleAddToQuickPlaylist}
                onToggleFavorite={handleToggleFavorite}
              />
            ) : (
              <Card className="p-8 text-center">
                <Heart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t.favorites?.noFavorites || "لا توجد فيديوهات مفضلة"}</h3>
                <p className="text-sm text-muted-foreground">
                  {t.favorites?.markFavorites || "اضغط على زر القلب لإضافة فيديوهات للمفضلة"}
                </p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Global Search */}
      <div className="w-full">
        <GlobalSearchInput onVideoSelect={handleVideoSelect} />
      </div>

      {/* Welcome Dialog */}
      <WelcomeDialog />

      {/* Create Playlist Dialog */}
      <CreatePlaylistDialog
        open={isCreatePlaylistOpen}
        onOpenChange={setIsCreatePlaylistOpen}
        onCreated={() => {
          // Just close the dialog, real-time updates will handle the rest
          loadVideos()
          loadPlaylists()
        }}
      />
    </div>
  )
}
