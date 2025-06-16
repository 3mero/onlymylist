"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { CardHeader as ShadCardHeader } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Play, GripVertical, Shuffle, ListX, Trash2, Plus, MoreVertical, Star, Clock, ArrowUp } from "lucide-react"
import { useVideoStore } from "@/lib/store"
import { cn, formatDuration } from "@/lib/utils"
import type { Playlist, Video } from "@/lib/db"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { db } from "@/lib/db"
import { useLanguage } from "@/lib/i18n/language-context"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CreatePlaylistDialog } from "./create-playlist-dialog"

interface PlaylistSidebarProps {
  className?: string
  isPlayerOnPage?: boolean
}

interface SortableItemProps {
  id: string
  video: Video
  index: number
  isActive: boolean
  onPlay: () => void
  onRemoveFromPlaylist: (videoId: number) => void
  onMoveToTop: (videoId: number) => void
  isRecentPlaylist: boolean
}

function SortableItem({
  id,
  video,
  index,
  isActive,
  onPlay,
  onRemoveFromPlaylist,
  onMoveToTop,
  isRecentPlaylist,
}: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const itemRef = useRef<HTMLDivElement>(null)
  const { t } = useLanguage()

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  useEffect(() => {
    if (isActive && itemRef.current) {
      const scrollParent = itemRef.current.closest("[data-radix-scroll-area-viewport]")
      if (scrollParent) {
        const itemRect = itemRef.current.getBoundingClientRect()
        const parentRect = scrollParent.getBoundingClientRect()

        if (itemRect.top < parentRect.top || itemRect.bottom > parentRect.bottom) {
          itemRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" })
        }
      }
    }
  }, [isActive])

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 p-2 rounded-lg hover:bg-accent mb-1 border group transition-all relative",
        isActive && "bg-primary/20 border-primary ring-1 ring-primary shadow-sm",
        !isActive && "border-transparent",
        isDragging && "shadow-lg z-50",
      )}
      data-video-index={index}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
      >
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Index Number */}
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center">
        <span className="text-xs font-medium">{index + 1}</span>
      </div>

      {/* Video Thumbnail */}
      <div className="flex-shrink-0 w-16 h-12 bg-muted rounded overflow-hidden">
        {video.thumbnail ? (
          <img
            src={video.thumbnail || "/placeholder.svg"}
            alt={video.customTitle || video.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = "/placeholder.svg?height=48&width=64"
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <Play className="w-4 h-4 text-primary/60" />
          </div>
        )}
      </div>

      {/* Video Info */}
      <div className="flex-1 min-w-0" ref={itemRef}>
        <div
          className="text-sm font-medium truncate cursor-pointer hover:text-primary transition-colors"
          onClick={onPlay}
          title={video.customTitle || video.title}
        >
          {video.customTitle || video.title}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {video.duration && <span>{formatDuration(video.duration)}</span>}
          {video.watchCount && video.watchCount > 1 && <span>• مشاهدة {video.watchCount} مرات</span>}
        </div>
      </div>

      {/* Quick Actions for Recent Playlist */}
      {isRecentPlaylist && (
        <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="icon"
            variant="secondary"
            onClick={() => onMoveToTop(video.id!)}
            className="h-6 w-6 rounded-full shadow-md"
            title="نقل للأعلى"
          >
            <ArrowUp className="w-3 h-3" />
          </Button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="icon"
          variant="ghost"
          onClick={onPlay}
          className="h-7 w-7 text-muted-foreground hover:text-primary"
          title={t.common?.play || "Play"}
        >
          <Play className="w-3.5 h-3.5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground">
              <MoreVertical className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onMoveToTop(video.id!)}>
              <ArrowUp className="w-4 h-4 mr-2" />
              {t.playlists?.moveToTop || "Move to Top"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRemoveFromPlaylist(video.id!)} className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              {t.common?.remove || "Remove"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

export function PlaylistSidebar({ className, isPlayerOnPage = false }: PlaylistSidebarProps) {
  const {
    currentVideo,
    setCurrentVideo: setVideoInStore,
    setPlaylistIndex,
    setCurrentPlaylist,
    currentPlaylist: activePlaylistFromStore,
  } = useVideoStore()

  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>("")
  const [currentPlaylist, setCurrentPlaylistState] = useState<Playlist | null>(null)
  const [videos, setVideos] = useState<Video[]>([])
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState(false)

  const { t } = useLanguage()
  const { toast } = useToast()
  const scrollViewportRef = useRef<HTMLDivElement>(null)

  // Real-time playlist updates
  const refreshCurrentPlaylist = useCallback(async () => {
    if (!selectedPlaylistId) return

    try {
      const playlist = await db.playlists.get(Number(selectedPlaylistId))
      if (playlist) {
        setCurrentPlaylistState(playlist)
        setVideos(playlist.videos || [])
      }
    } catch (error) {
      console.error("Error refreshing playlist:", error)
    }
  }, [selectedPlaylistId])

  // Listen for playlist updates and new playlist creation
  useEffect(() => {
    const handlePlaylistUpdate = (event: CustomEvent) => {
      const { playlistId, action } = event.detail

      // If it's the recent playlist or current playlist, refresh
      if (playlistId === "recent" || (currentPlaylist?.isRecent && action === "videoAdded")) {
        refreshCurrentPlaylist()
      }

      // If a new playlist was created, refresh the playlists list
      if (action === "playlistCreated" || action === "playlistDeleted") {
        loadPlaylists()
      }
    }

    const loadPlaylists = async () => {
      try {
        const allPlaylists = await db.playlists.orderBy("createdAt").reverse().toArray()
        setPlaylists(allPlaylists)

        // Auto-select recent playlist first if no playlist selected
        if (allPlaylists.length > 0 && !selectedPlaylistId) {
          const recentPlaylist = allPlaylists.find((p) => p.isRecent) || allPlaylists[0]
          setSelectedPlaylistId(String(recentPlaylist.id))
        }
      } catch (error) {
        console.error("Error loading playlists:", error)
      }
    }

    window.addEventListener("playlistUpdated", handlePlaylistUpdate as EventListener)
    return () => {
      window.removeEventListener("playlistUpdated", handlePlaylistUpdate as EventListener)
    }
  }, [refreshCurrentPlaylist, currentPlaylist, selectedPlaylistId])

  // Auto-switch to Recent playlist when video is played
  useEffect(() => {
    const handleVideoPlay = async () => {
      if (currentVideo && !activePlaylistFromStore) {
        // Auto-switch to Recent playlist
        const recentPlaylist = await db.getRecentPlaylist()
        if (recentPlaylist) {
          setSelectedPlaylistId(String(recentPlaylist.id))
          setCurrentPlaylist(recentPlaylist)
        }
      }
    }

    handleVideoPlay()
  }, [currentVideo, activePlaylistFromStore, setCurrentPlaylist])

  // Load all playlists
  useEffect(() => {
    const loadPlaylists = async () => {
      try {
        const allPlaylists = await db.playlists.orderBy("createdAt").reverse().toArray()
        setPlaylists(allPlaylists)

        // Auto-select recent playlist first
        if (allPlaylists.length > 0 && !selectedPlaylistId) {
          const recentPlaylist = allPlaylists.find((p) => p.isRecent) || allPlaylists[0]
          setSelectedPlaylistId(String(recentPlaylist.id))
        }
      } catch (error) {
        console.error("Error loading playlists:", error)
      }
    }
    loadPlaylists()
  }, [selectedPlaylistId])

  // Load selected playlist videos
  useEffect(() => {
    refreshCurrentPlaylist()
  }, [refreshCurrentPlaylist])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const totalDuration = useMemo(() => {
    return videos.reduce((acc, video) => acc + (video.duration || 0), 0)
  }, [videos])

  const handleDragEnd = async (event: any) => {
    const { active, over } = event
    if (!active || !over || !currentPlaylist?.id) return

    if (active.id !== over.id) {
      const oldIndex = videos.findIndex((v) => String(v.id) === active.id)
      const newIndex = videos.findIndex((v) => String(v.id) === over.id)

      if (oldIndex === -1 || newIndex === -1) return

      const newVideosOrder = arrayMove(videos, oldIndex, newIndex)
      setVideos(newVideosOrder)

      const updatedPlaylistData = { ...currentPlaylist, videos: newVideosOrder, updatedAt: new Date() }

      if (currentPlaylist.id > 0) {
        await db.playlists.update(currentPlaylist.id, updatedPlaylistData)
      }

      if (activePlaylistFromStore && activePlaylistFromStore.id === currentPlaylist.id) {
        setCurrentPlaylist(updatedPlaylistData)
        if (currentVideo) {
          const newPlayingIndex = newVideosOrder.findIndex((v) => v.id === currentVideo.id)
          if (newPlayingIndex !== -1) setPlaylistIndex(newPlayingIndex)
        }
      }

      toast({
        title: "تم إعادة ترتيب القائمة",
        description: "تم نقل الفيديو إلى الموضع الجديد",
      })
    }
  }

  const playVideoAtIndex = (indexInFilteredList: number) => {
    if (indexInFilteredList < 0 || indexInFilteredList >= videos.length || !currentPlaylist) return
    const videoToPlay = videos[indexInFilteredList]

    setCurrentPlaylist({ ...currentPlaylist, videos: videos })
    setVideoInStore(videoToPlay)
    setPlaylistIndex(indexInFilteredList)
  }

  const handleShuffle = async () => {
    if (videos.length < 2 || !currentPlaylist?.id) {
      toast({
        title: "عدد الفيديوهات غير كافي للخلط",
        variant: "default",
      })
      return
    }

    const shuffledVideos = [...videos].sort(() => Math.random() - 0.5)
    setVideos(shuffledVideos)

    const updatedPlaylistData = { ...currentPlaylist, videos: shuffledVideos, updatedAt: new Date() }

    if (currentPlaylist.id > 0) {
      await db.playlists.update(currentPlaylist.id, updatedPlaylistData)
    }

    if (activePlaylistFromStore && activePlaylistFromStore.id === currentPlaylist.id) {
      setCurrentPlaylist(updatedPlaylistData)
      if (currentVideo) {
        const newCurrentIndex = shuffledVideos.findIndex((v) => v.id === currentVideo.id)
        if (newCurrentIndex !== -1) {
          setPlaylistIndex(newCurrentIndex)
        } else {
          playVideoAtIndex(0)
        }
      } else if (shuffledVideos.length > 0) {
        playVideoAtIndex(0)
      }
    }
    toast({ title: "تم خلط قائمة التشغيل" })
  }

  const handleClearAllPlaylist = async () => {
    if (!currentPlaylist?.id) return

    const updatedPlaylistData = { ...currentPlaylist, videos: [], updatedAt: new Date() }

    if (currentPlaylist.id > 0) {
      await db.playlists.update(currentPlaylist.id, updatedPlaylistData)
    }

    setVideos([])

    if (activePlaylistFromStore && activePlaylistFromStore.id === currentPlaylist.id) {
      setCurrentPlaylist(updatedPlaylistData)
      setVideoInStore(null)
      setPlaylistIndex(0)
    }

    toast({
      title: "تم مسح قائمة التشغيل",
      description: "تم حذف جميع الفيديوهات من القائمة",
    })
  }

  const handleCreatePlaylist = async (name: string, description?: string) => {
    try {
      const newPlaylistId = await db.playlists.add({
        name,
        description,
        videos: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        isDefault: false,
        isFavorites: false,
        isRecent: false,
      })

      // Emit event for real-time updates
      window.dispatchEvent(
        new CustomEvent("playlistUpdated", {
          detail: { playlistId: newPlaylistId, action: "playlistCreated" },
        }),
      )

      // Refresh playlists and auto-select the new one
      const allPlaylists = await db.playlists.orderBy("createdAt").reverse().toArray()
      setPlaylists(allPlaylists)
      setSelectedPlaylistId(String(newPlaylistId))

      toast({
        title: "تم إنشاء قائمة التشغيل",
        description: `تم إنشاء "${name}" بنجاح وتم تحديدها`,
      })
    } catch (error) {
      console.error("Error creating playlist:", error)
      toast({
        title: "خطأ",
        description: "فشل في إنشاء قائمة التشغيل",
        variant: "destructive",
      })
    }
  }

  const handleDeletePlaylist = async () => {
    if (!currentPlaylist?.id) return

    try {
      const success = await db.deletePlaylist(currentPlaylist.id)
      if (success) {
        // Emit event for real-time updates
        window.dispatchEvent(
          new CustomEvent("playlistUpdated", {
            detail: { playlistId: currentPlaylist.id, action: "playlistDeleted" },
          }),
        )

        // Refresh playlists list
        const allPlaylists = await db.playlists.orderBy("createdAt").reverse().toArray()
        setPlaylists(allPlaylists)

        // Select first available playlist
        if (allPlaylists.length > 0) {
          const firstPlaylist = allPlaylists[0]
          setSelectedPlaylistId(String(firstPlaylist.id))
        } else {
          setSelectedPlaylistId("")
          setCurrentPlaylistState(null)
          setVideos([])
        }

        toast({
          title: "تم حذف قائمة التشغيل",
          description: `تم حذف "${currentPlaylist.name}" بنجاح`,
        })
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "لا يمكن حذف قوائم التشغيل الأساسية",
        variant: "destructive",
      })
    }
  }

  const handleRemoveVideoFromPlaylist = async (videoIdToRemove: number) => {
    if (!currentPlaylist?.id) return

    const videoToRemoveObject = videos.find((v) => v.id === videoIdToRemove)
    if (!videoToRemoveObject) return

    const originalIndexOfRemovedVideoInFilteredList = videos.findIndex((v) => v.id === videoIdToRemove)
    const newPlaylistVideos = videos.filter((video) => video.id !== videoIdToRemove)
    setVideos(newPlaylistVideos)

    const updatedPlaylistDataInDb = { ...currentPlaylist, videos: newPlaylistVideos, updatedAt: new Date() }

    if (currentPlaylist.id > 0) {
      await db.playlists.update(currentPlaylist.id, updatedPlaylistDataInDb)
    }

    if (activePlaylistFromStore && activePlaylistFromStore.id === currentPlaylist.id) {
      setCurrentPlaylist(updatedPlaylistDataInDb)

      if (currentVideo && currentVideo.id === videoIdToRemove) {
        if (newPlaylistVideos.length > 0) {
          const newPlayIndex = Math.min(originalIndexOfRemovedVideoInFilteredList, newPlaylistVideos.length - 1)
          setVideoInStore(newPlaylistVideos[newPlayIndex])
          setPlaylistIndex(newPlayIndex)
        } else {
          setVideoInStore(null)
          setPlaylistIndex(0)
        }
      } else if (currentVideo && newPlaylistVideos.some((v) => v.id === currentVideo.id)) {
        const newPlayingIndex = newPlaylistVideos.findIndex((v) => v.id === currentVideo.id)
        if (newPlayingIndex !== -1) setPlaylistIndex(newPlayingIndex)
      }
    }

    toast({
      title: "تم حذف الفيديو",
      description: `تم حذف "${videoToRemoveObject.customTitle || videoToRemoveObject.title}" من القائمة`,
    })
  }

  const handleMoveToTop = async (videoId: number) => {
    if (!currentPlaylist?.id) return

    const videoIndex = videos.findIndex((v) => v.id === videoId)
    if (videoIndex <= 0) return // Already at top or not found

    const videoToMove = videos[videoIndex]
    const newVideosOrder = [videoToMove, ...videos.filter((v) => v.id !== videoId)]
    setVideos(newVideosOrder)

    const updatedPlaylistData = { ...currentPlaylist, videos: newVideosOrder, updatedAt: new Date() }

    if (currentPlaylist.id > 0) {
      await db.playlists.update(currentPlaylist.id, updatedPlaylistData)
    }

    if (activePlaylistFromStore && activePlaylistFromStore.id === currentPlaylist.id) {
      setCurrentPlaylist(updatedPlaylistData)
      if (currentVideo && currentVideo.id === videoId) {
        setPlaylistIndex(0)
      } else if (currentVideo) {
        const newPlayingIndex = newVideosOrder.findIndex((v) => v.id === currentVideo.id)
        if (newPlayingIndex !== -1) setPlaylistIndex(newPlayingIndex)
      }
    }

    toast({
      title: "تم النقل للأعلى",
      description: `تم نقل "${videoToMove.customTitle || videoToMove.title}" إلى أعلى القائمة`,
    })
  }

  const getPlaylistIcon = (playlist: Playlist) => {
    if (playlist.isFavorites) return <Star className="w-4 h-4 text-yellow-500" />
    if (playlist.isRecent) return <Clock className="w-4 h-4 text-blue-500" />
    return null
  }

  const canDeletePlaylist = (playlist: Playlist) => {
    return !playlist.isFavorites && !playlist.isRecent
  }

  const dndItems = videos.map((v) => String(v.id))

  return (
    <Card className={cn("w-full h-fit overflow-hidden flex flex-col", className)}>
      <ShadCardHeader className="p-3 border-b">
        <div className="space-y-3">
          {/* Playlist Selector */}
          <div className="flex items-center gap-2">
            <Select value={selectedPlaylistId} onValueChange={setSelectedPlaylistId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="اختر قائمة التشغيل" />
              </SelectTrigger>
              <SelectContent>
                {playlists.map((playlist) => (
                  <SelectItem key={playlist.id} value={String(playlist.id)}>
                    <div className="flex items-center gap-2">
                      {getPlaylistIcon(playlist)}
                      <span>{playlist.name}</span>
                      <span className="text-muted-foreground text-xs">({playlist.videos?.length || 0})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <CreatePlaylistDialog
              open={isCreatePlaylistOpen}
              onOpenChange={setIsCreatePlaylistOpen}
              onCreatePlaylist={handleCreatePlaylist}
            >
              <Button size="sm" variant="outline">
                <Plus className="w-4 h-4" />
              </Button>
            </CreatePlaylistDialog>
          </div>

          {/* Playlist Info and Actions */}
          {currentPlaylist && (
            <div className="flex justify-between items-start gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base truncate flex items-center gap-2" title={currentPlaylist.name}>
                  {getPlaylistIcon(currentPlaylist)}
                  {currentPlaylist.name}
                  {currentPlaylist.isRecent && <span className="text-xs text-muted-foreground">(آخر 30 فيديو)</span>}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {videos.length} {videos.length === 1 ? "فيديو" : "فيديو"}
                  {videos.length > 0 && totalDuration > 0 && ` • ${formatDuration(totalDuration)}`}
                </p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Button variant="outline" size="sm" onClick={handleShuffle} disabled={videos.length < 2}>
                  <Shuffle className="w-3.5 h-3.5" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={videos.length === 0}>
                      <ListX className="w-3.5 h-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>مسح جميع الفيديوهات من "{currentPlaylist.name}"؟</AlertDialogTitle>
                      <AlertDialogDescription>
                        سيتم حذف جميع الفيديوهات من هذه القائمة. لا يمكن التراجع عن هذا الإجراء.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>إلغاء</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClearAllPlaylist}>مسح الكل</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {/* Delete Playlist Button - Only show if not a system playlist */}
                {canDeletePlaylist(currentPlaylist) && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>حذف قائمة التشغيل "{currentPlaylist.name}"؟</AlertDialogTitle>
                        <AlertDialogDescription>
                          سيتم حذف قائمة التشغيل نهائياً. لا يمكن التراجع عن هذا الإجراء.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeletePlaylist}>حذف</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          )}
        </div>
      </ShadCardHeader>

      <ScrollArea className="flex-1" viewportRef={scrollViewportRef}>
        <div className="p-2">
          {videos.length > 0 ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={dndItems} strategy={verticalListSortingStrategy}>
                {videos.map((video, index) => (
                  <SortableItem
                    key={String(video.id)}
                    id={String(video.id)}
                    video={video}
                    index={index}
                    isActive={currentVideo?.id === video.id && activePlaylistFromStore?.id === currentPlaylist?.id}
                    onPlay={() => playVideoAtIndex(index)}
                    onRemoveFromPlaylist={handleRemoveVideoFromPlaylist}
                    onMoveToTop={handleMoveToTop}
                    isRecentPlaylist={currentPlaylist?.isRecent || false}
                  />
                ))}
              </SortableContext>
            </DndContext>
          ) : (
            <div className="text-center py-8">
              <Plus className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {currentPlaylist?.isFavorites
                  ? "لا توجد فيديوهات في المفضلة"
                  : currentPlaylist?.isRecent
                    ? "لا توجد فيديوهات حديثة - ابدأ بتشغيل فيديو"
                    : "لا توجد فيديوهات في هذه القائمة"}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  )
}

export default PlaylistSidebar
