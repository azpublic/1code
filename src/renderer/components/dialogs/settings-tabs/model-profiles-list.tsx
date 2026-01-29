import { useAtom } from "jotai"
import { ChevronDown, ChevronUp, Edit, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { modelProfilesAtom, OFFLINE_PROFILE, type ModelProfile, type ApiFormat } from "../../../lib/atoms"
import { Badge } from "../../ui/badge"
import { Button } from "../../ui/button"
import { Input } from "../../ui/input"
import { Label } from "../../ui/label"
import { ModelProfileDialog } from "./model-profile-dialog"

interface ProfileCardProps {
  profile: ModelProfile
  onEdit: () => void
  onDelete: () => void
  onSave: (profile: Omit<ModelProfile, "id">) => void
  onSetActive?: () => void
  isActive?: boolean
  isDefault?: boolean
}

function ProfileCard({
  profile,
  onEdit,
  onDelete,
  onSave,
  onSetActive,
  isActive,
  isDefault,
}: ProfileCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(profile.name)
  const [editApiFormat, setEditApiFormat] = useState<ApiFormat>(profile.apiFormat)
  const [editModel, setEditModel] = useState(profile.config.model || "")

  // Anthropic-style models with display names
  const [editHaikuModel, setEditHaikuModel] = useState(profile.config.haikuModel || "")
  const [editHaikuDisplayName, setEditHaikuDisplayName] = useState(profile.config.haikuDisplayName || "")
  const [editSonnetModel, setEditSonnetModel] = useState(profile.config.sonnetModel || "")
  const [editSonnetDisplayName, setEditSonnetDisplayName] = useState(profile.config.sonnetDisplayName || "")
  const [editOpusModel, setEditOpusModel] = useState(profile.config.opusModel || "")
  const [editOpusDisplayName, setEditOpusDisplayName] = useState(profile.config.opusDisplayName || "")

  const [editToken, setEditToken] = useState(profile.config.token)
  const [editBaseUrl, setEditBaseUrl] = useState(profile.config.baseUrl)

  // Don't show delete button for offline profile
  const canDelete = !profile.isOffline

  // Get API format badge variant
  const getApiFormatBadgeVariant = (format: ApiFormat) => {
    return format === "openai" ? "default" : "secondary"
  }

  // Get API format display name
  const getApiFormatDisplayName = (format: ApiFormat) => {
    return format === "openai" ? "OpenAI" : "Anthropic"
  }

  const handleSave = () => {
    const trimmedName = editName.trim()
    const trimmedModel = editModel.trim()
    const trimmedHaikuModel = editHaikuModel.trim()
    const trimmedHaikuDisplayName = editHaikuDisplayName.trim()
    const trimmedSonnetModel = editSonnetModel.trim()
    const trimmedSonnetDisplayName = editSonnetDisplayName.trim()
    const trimmedOpusModel = editOpusModel.trim()
    const trimmedOpusDisplayName = editOpusDisplayName.trim()
    const trimmedToken = editToken.trim()
    const trimmedBaseUrl = editBaseUrl.trim()

    // Validation: need at least one model field set
    const hasModelForOpenAI = editApiFormat === "openai" && trimmedModel
    const hasModelForAnthropic = editApiFormat === "anthropic" && (
      trimmedHaikuModel || trimmedSonnetModel || trimmedOpusModel
    )
    const hasModel = hasModelForOpenAI || hasModelForAnthropic

    if (!trimmedName || !hasModel || !trimmedToken || !trimmedBaseUrl) {
      toast.error("Please fill in all required fields")
      return
    }

    onSave({
      name: trimmedName,
      apiFormat: editApiFormat,
      config: {
        ...(editApiFormat === "anthropic" ? {
          ...(trimmedHaikuModel && { haikuModel: trimmedHaikuModel }),
          ...(trimmedHaikuDisplayName && { haikuDisplayName: trimmedHaikuDisplayName }),
          ...(trimmedSonnetModel && { sonnetModel: trimmedSonnetModel }),
          ...(trimmedSonnetDisplayName && { sonnetDisplayName: trimmedSonnetDisplayName }),
          ...(trimmedOpusModel && { opusModel: trimmedOpusModel }),
          ...(trimmedOpusDisplayName && { opusDisplayName: trimmedOpusDisplayName }),
        } : {
          model: trimmedModel,
        }),
        token: trimmedToken,
        baseUrl: trimmedBaseUrl,
      },
      isOffline: profile.isOffline,
    })

    setIsEditing(false)
    setIsExpanded(false)
  }

  const handleCancel = () => {
    setEditName(profile.name)
    setEditApiFormat(profile.apiFormat)
    setEditModel(profile.config.model || "")
    setEditHaikuModel(profile.config.haikuModel || "")
    setEditHaikuDisplayName(profile.config.haikuDisplayName || "")
    setEditSonnetModel(profile.config.sonnetModel || "")
    setEditSonnetDisplayName(profile.config.sonnetDisplayName || "")
    setEditOpusModel(profile.config.opusModel || "")
    setEditOpusDisplayName(profile.config.opusDisplayName || "")
    setEditToken(profile.config.token)
    setEditBaseUrl(profile.config.baseUrl)
    setIsEditing(false)
  }

  const isDirty =
    editName !== profile.name ||
    editApiFormat !== profile.apiFormat ||
    editModel !== (profile.config.model || "") ||
    editHaikuModel !== (profile.config.haikuModel || "") ||
    editHaikuDisplayName !== (profile.config.haikuDisplayName || "") ||
    editSonnetModel !== (profile.config.sonnetModel || "") ||
    editSonnetDisplayName !== (profile.config.sonnetDisplayName || "") ||
    editOpusModel !== (profile.config.opusModel || "") ||
    editOpusDisplayName !== (profile.config.opusDisplayName || "") ||
    editToken !== profile.config.token ||
    editBaseUrl !== profile.config.baseUrl

  return (
    <div className="bg-background rounded-lg border border-border overflow-hidden">
      {/* Card Header */}
      <div className="flex items-center justify-between p-3 hover:bg-muted/50">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={() => !isEditing && setIsExpanded(!isExpanded)}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate">{profile.name}</span>
              <Badge variant={getApiFormatBadgeVariant(profile.apiFormat)} className="text-xs">
                {getApiFormatDisplayName(profile.apiFormat)}
              </Badge>
              {profile.isOffline && (
                <Badge variant="outline" className="text-xs">
                  Offline
                </Badge>
              )}
              {isActive && (
                <Badge variant="secondary" className="text-xs">
                  Active
                </Badge>
              )}
              {isDefault && (
                <Badge variant="outline" className="text-xs">
                  Default
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {profile.apiFormat === "anthropic" && (profile.config.haikuModel || profile.config.sonnetModel || profile.config.opusModel)
                ? `Custom models (${profile.config.haikuModel ? "H" : ""}${profile.config.sonnetModel ? "S" : ""}${profile.config.opusModel ? "O" : ""})`
                : (profile.config.model || "No model set")
              }
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {onSetActive && !isActive && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onSetActive}
            >
              Set Active
            </Button>
          )}
          {!isEditing && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => {
                setIsEditing(true)
                setIsExpanded(true)
              }}
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {canDelete && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 hover:bg-red-500/10 hover:text-red-600"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {(isExpanded || isEditing) && (
        <div className="border-t border-border bg-muted/30">
          <div className="p-4 space-y-4">
            {isEditing ? (
              <>
                {/* Edit Mode */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <Label className="text-sm font-medium">Name</Label>
                    </div>
                    <div className="flex-shrink-0 w-64">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <Label className="text-sm font-medium">API Format</Label>
                    </div>
                    <div className="flex-shrink-0 w-64">
                      <select
                        value={editApiFormat}
                        onChange={(e) => setEditApiFormat(e.target.value as ApiFormat)}
                        className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="anthropic">Anthropic</option>
                        <option value="openai">OpenAI</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <Label className="text-sm font-medium">Model</Label>
                    </div>
                    <div className="flex-shrink-0 w-64">
                      <Input
                        value={editModel}
                        onChange={(e) => setEditModel(e.target.value)}
                        className="w-full font-mono text-xs"
                      />
                    </div>
                  </div>

                  {editApiFormat === "anthropic" && (
                    <>
                      {/* Haiku */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <Label className="text-sm font-medium">Haiku Model</Label>
                            <p className="text-xs text-muted-foreground">Fast, lightweight</p>
                          </div>
                          <div className="flex-shrink-0 w-64">
                            <Input
                              value={editHaikuModel}
                              onChange={(e) => setEditHaikuModel(e.target.value)}
                              placeholder="claude-3-5-haiku-20241022"
                              className="w-full font-mono text-xs"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-4 pl-4">
                          <div className="flex-1">
                            <Label className="text-xs text-muted-foreground">Display Name</Label>
                          </div>
                          <div className="flex-shrink-0 w-64">
                            <Input
                              value={editHaikuDisplayName}
                              onChange={(e) => setEditHaikuDisplayName(e.target.value)}
                              placeholder="Haiku 3.5"
                              className="w-full"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Sonnet */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <Label className="text-sm font-medium">Sonnet Model</Label>
                            <p className="text-xs text-muted-foreground">Balanced</p>
                          </div>
                          <div className="flex-shrink-0 w-64">
                            <Input
                              value={editSonnetModel}
                              onChange={(e) => setEditSonnetModel(e.target.value)}
                              placeholder="claude-3-5-sonnet-20241022"
                              className="w-full font-mono text-xs"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-4 pl-4">
                          <div className="flex-1">
                            <Label className="text-xs text-muted-foreground">Display Name</Label>
                          </div>
                          <div className="flex-shrink-0 w-64">
                            <Input
                              value={editSonnetDisplayName}
                              onChange={(e) => setEditSonnetDisplayName(e.target.value)}
                              placeholder="Sonnet 3.5"
                              className="w-full"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Opus */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <Label className="text-sm font-medium">Opus Model</Label>
                            <p className="text-xs text-muted-foreground">Most capable</p>
                          </div>
                          <div className="flex-shrink-0 w-64">
                            <Input
                              value={editOpusModel}
                              onChange={(e) => setEditOpusModel(e.target.value)}
                              placeholder="claude-3-5-sonnet-20250107"
                              className="w-full font-mono text-xs"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-4 pl-4">
                          <div className="flex-1">
                            <Label className="text-xs text-muted-foreground">Display Name</Label>
                          </div>
                          <div className="flex-shrink-0 w-64">
                            <Input
                              value={editOpusDisplayName}
                              onChange={(e) => setEditOpusDisplayName(e.target.value)}
                              placeholder="Opus 3.5"
                              className="w-full"
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <Label className="text-sm font-medium">API Token</Label>
                    </div>
                    <div className="flex-shrink-0 w-64">
                      <Input
                        type="password"
                        value={editToken}
                        onChange={(e) => setEditToken(e.target.value)}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <Label className="text-sm font-medium">Base URL</Label>
                    </div>
                    <div className="flex-shrink-0 w-64">
                      <Input
                        value={editBaseUrl}
                        onChange={(e) => setEditBaseUrl(e.target.value)}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button size="sm" variant="ghost" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={!isDirty}>
                    Save
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* View Mode */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">API Format:</span>
                    <Badge variant={getApiFormatBadgeVariant(profile.apiFormat)} className="text-xs">
                      {getApiFormatDisplayName(profile.apiFormat)}
                    </Badge>
                  </div>

                  {profile.apiFormat === "anthropic" && (profile.config.haikuModel || profile.config.sonnetModel || profile.config.opusModel) ? (
                    <>
                      {profile.config.haikuModel && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">
                            {profile.config.haikuDisplayName || "Haiku"}:
                          </span>
                          <span className="font-mono text-xs truncate max-w-[300px]" title={profile.config.haikuModel}>
                            {profile.config.haikuModel}
                          </span>
                        </div>
                      )}
                      {profile.config.sonnetModel && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">
                            {profile.config.sonnetDisplayName || "Sonnet"}:
                          </span>
                          <span className="font-mono text-xs truncate max-w-[300px]" title={profile.config.sonnetModel}>
                            {profile.config.sonnetModel}
                          </span>
                        </div>
                      )}
                      {profile.config.opusModel && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">
                            {profile.config.opusDisplayName || "Opus"}:
                          </span>
                          <span className="font-mono text-xs truncate max-w-[300px]" title={profile.config.opusModel}>
                            {profile.config.opusModel}
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Model:</span>
                      <span className="font-mono text-xs truncate max-w-[300px]" title={profile.config.model || "N/A"}>
                        {profile.config.model || "N/A"}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">API Token:</span>
                    <span className="font-mono text-xs">•••••••••••••••</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Base URL:</span>
                    <span className="font-mono text-xs truncate max-w-[300px]">{profile.config.baseUrl}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface ModelProfilesListProps {
  activeProfileId: string | null
  defaultClaudeModelId: string | null
  onSetActive: (profileId: string) => void
  onSetDefault: (profileId: string) => void
}

export function ModelProfilesList({
  activeProfileId,
  defaultClaudeModelId,
  onSetActive,
  onSetDefault,
}: ModelProfilesListProps) {
  const [profiles, setProfiles] = useAtom(modelProfilesAtom)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editProfile, setEditProfile] = useState<ModelProfile | null>(null)

  const handleAddProfile = () => {
    setEditProfile(null)
    setDialogOpen(true)
  }

  const handleSaveProfile = (profileData: Omit<ModelProfile, "id">) => {
    if (editProfile) {
      // Update existing profile
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === editProfile.id
            ? { ...editProfile, ...profileData }
            : p
        )
      )
      toast.success("Profile updated")
    } else {
      // Add new profile
      const newProfile: ModelProfile = {
        id: `profile-${Date.now()}`,
        ...profileData,
      }
      setProfiles((prev) => [...prev, newProfile])
      toast.success("Profile added")
    }
    setEditProfile(null)
  }

  const handleDeleteProfile = (profile: ModelProfile) => {
    if (profile.isOffline) {
      toast.error("Cannot delete the offline profile")
      return
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${profile.name}"?`
    )
    if (confirmed) {
      setProfiles((prev) => prev.filter((p) => p.id !== profile.id))
      toast.success("Profile deleted")
    }
  }

  const handleSaveInline = (profileId: string, profileData: Omit<ModelProfile, "id">) => {
    setProfiles((prev) =>
      prev.map((p) =>
        p.id === profileId
          ? { ...p, ...profileData }
          : p
      )
    )
    toast.success("Profile updated")
  }

  return (
    <>
      <div className="space-y-3">
        {profiles.map((profile) => (
          <ProfileCard
            key={profile.id}
            profile={profile}
            isActive={activeProfileId === profile.id}
            isDefault={defaultClaudeModelId === profile.id}
            onSetActive={() => onSetActive(profile.id)}
            onEdit={() => {
              setEditProfile(profile)
              setDialogOpen(true)
            }}
            onDelete={() => handleDeleteProfile(profile)}
            onSave={(data) => handleSaveInline(profile.id, data)}
          />
        ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={handleAddProfile}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Model Profile
      </Button>

      <ModelProfileDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false)
          setEditProfile(null)
        }}
        onSave={handleSaveProfile}
        editProfile={editProfile}
      />
    </>
  )
}
