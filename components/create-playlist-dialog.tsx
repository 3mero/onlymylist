"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { db } from "@/lib/db"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/lib/i18n/language-context"

interface CreatePlaylistDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

export function CreatePlaylistDialog({ open, onOpenChange, onCreated }: CreatePlaylistDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  // Remove dir from useLanguage
  const { t } = useLanguage()

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({
        title: "اسم القائمة مطلوب",
        description: "يرجى إدخال اسم لقائمة التشغيل",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const newPlaylistId = await db.playlists.add({
        name: name.trim(),
        description: description.trim(),
        videos: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Emit event for real-time updates across components
      window.dispatchEvent(
        new CustomEvent("playlistUpdated", {
          detail: { playlistId: newPlaylistId, action: "playlistCreated" },
        }),
      )

      toast({
        title: "تم إنشاء قائمة التشغيل",
        description: `تم إنشاء "${name.trim()}" بنجاح`,
      })

      setName("")
      setDescription("")
      onOpenChange(false)
      onCreated()
    } catch (error) {
      toast({
        title: "خطأ في الإنشاء",
        description: "حدث خطأ أثناء إنشاء قائمة التشغيل",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!isSubmitting) {
          onOpenChange(newOpen)
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.home.createPlaylist}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t.playlists.name}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.playlists.namePlaceholder}
              // dir removed, defaults to LTR
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t.playlists.description}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.playlists.descriptionPlaceholder}
              rows={3}
              // dir removed, defaults to LTR
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              {t.common.cancel}
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? t.playlists.creating : t.playlists.create}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
