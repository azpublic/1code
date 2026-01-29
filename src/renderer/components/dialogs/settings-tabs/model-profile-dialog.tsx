import { useAtom } from "jotai"
import { useState } from "react"
import { toast } from "sonner"
import { modelProfilesAtom, type ModelProfile, type ApiFormat } from "../../../../lib/atoms"
import { Button } from "../../ui/button"
import { Input } from "../../ui/input"
import { Label } from "../../ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog"

interface ModelProfileDialogProps {
  open: boolean
  onClose: () => void
  onSave: (profile: Omit<ModelProfile, "id">) => void
  editProfile?: ModelProfile | null
}

export function ModelProfileDialog({
  open,
  onClose,
  onSave,
  editProfile,
}: ModelProfileDialogProps) {
  const [name, setName] = useState(editProfile?.name || "")
  const [apiFormat, setApiFormat] = useState<ApiFormat>(editProfile?.apiFormat || "anthropic")
  const [model, setModel] = useState(editProfile?.config.model || "")

  // Anthropic-style models with display names
  const [haikuModel, setHaikuModel] = useState(editProfile?.config.haikuModel || "")
  const [haikuDisplayName, setHaikuDisplayName] = useState(editProfile?.config.haikuDisplayName || "")
  const [sonnetModel, setSonnetModel] = useState(editProfile?.config.sonnetModel || "")
  const [sonnetDisplayName, setSonnetDisplayName] = useState(editProfile?.config.sonnetDisplayName || "")
  const [opusModel, setOpusModel] = useState(editProfile?.config.opusModel || "")
  const [opusDisplayName, setOpusDisplayName] = useState(editProfile?.config.opusDisplayName || "")

  const [token, setToken] = useState(editProfile?.config.token || "")
  const [baseUrl, setBaseUrl] = useState(editProfile?.config.baseUrl || "")

  // Reset form when dialog opens or editProfile changes
  useState(() => {
    if (open) {
      setName(editProfile?.name || "")
      setApiFormat(editProfile?.apiFormat || "anthropic")
      setModel(editProfile?.config.model || "")
      setHaikuModel(editProfile?.config.haikuModel || "")
      setHaikuDisplayName(editProfile?.config.haikuDisplayName || "")
      setSonnetModel(editProfile?.config.sonnetModel || "")
      setSonnetDisplayName(editProfile?.config.sonnetDisplayName || "")
      setOpusModel(editProfile?.config.opusModel || "")
      setOpusDisplayName(editProfile?.config.opusDisplayName || "")
      setToken(editProfile?.config.token || "")
      setBaseUrl(editProfile?.config.baseUrl || "")
    }
  })

  const trimmedName = name.trim()
  const trimmedModel = model.trim()
  const trimmedHaikuModel = haikuModel.trim()
  const trimmedHaikuDisplayName = haikuDisplayName.trim()
  const trimmedSonnetModel = sonnetModel.trim()
  const trimmedSonnetDisplayName = sonnetDisplayName.trim()
  const trimmedOpusModel = opusModel.trim()
  const trimmedOpusDisplayName = opusDisplayName.trim()
  const trimmedToken = token.trim()
  const trimmedBaseUrl = baseUrl.trim()

  // Validation: need at least one model field set
  const hasModelForOpenAI = apiFormat === "openai" && trimmedModel
  const hasModelForAnthropic = apiFormat === "anthropic" && (
    trimmedHaikuModel || trimmedSonnetModel || trimmedOpusModel
  )
  const hasModel = hasModelForOpenAI || hasModelForAnthropic

  const canSave = Boolean(
    trimmedName &&
    hasModel &&
    trimmedToken &&
    trimmedBaseUrl
  )

  const handleSave = () => {
    if (!canSave) {
      toast.error("Please fill in all required fields")
      return
    }

    onSave({
      name: trimmedName,
      apiFormat,
      config: {
        ...(apiFormat === "anthropic" ? {
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
    })

    // Reset form
    setName("")
    setApiFormat("anthropic")
    setModel("")
    setHaikuModel("")
    setHaikuDisplayName("")
    setSonnetModel("")
    setSonnetDisplayName("")
    setOpusModel("")
    setOpusDisplayName("")
    setToken("")
    setBaseUrl("")

    onClose()
  }

  // Update base URL placeholder when API format changes
  const getBaseUrlPlaceholder = () => {
    if (apiFormat === "openai") {
      return "https://api.openai.com/v1"
    }
    return "https://api.anthropic.com"
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {editProfile ? "Edit Model Profile" : "Add Model Profile"}
          </DialogTitle>
          <DialogDescription>
            Configure a custom AI model provider. Supports both Anthropic and OpenAI-style APIs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Profile Name */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <Label className="text-sm font-medium">Profile Name</Label>
              <p className="text-xs text-muted-foreground">
                Display name for this profile
              </p>
            </div>
            <div className="flex-shrink-0 w-64">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Custom Model"
                className="w-full"
              />
            </div>
          </div>

          {/* API Format */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <Label className="text-sm font-medium">API Format</Label>
              <p className="text-xs text-muted-foreground">
                Choose the API format your provider uses
              </p>
            </div>
            <div className="flex-shrink-0 w-64">
              <select
                value={apiFormat}
                onChange={(e) => setApiFormat(e.target.value as ApiFormat)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="openai">OpenAI-compatible</option>
              </select>
            </div>
          </div>

          {/* Model Fields - Different for Anthropic vs OpenAI */}
          {apiFormat === "anthropic" ? (
            <>
              {/* Haiku Model */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <Label className="text-sm font-medium">Haiku Model</Label>
                    <p className="text-xs text-muted-foreground">
                      Fast, lightweight model (e.g., ANTHROPIC_DEFAULT_HAIKU_MODEL)
                    </p>
                  </div>
                  <div className="flex-shrink-0 w-64">
                    <Input
                      value={haikuModel}
                      onChange={(e) => setHaikuModel(e.target.value)}
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
                      value={haikuDisplayName}
                      onChange={(e) => setHaikuDisplayName(e.target.value)}
                      placeholder="Haiku 3.5"
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Sonnet Model */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <Label className="text-sm font-medium">Sonnet Model</Label>
                    <p className="text-xs text-muted-foreground">
                      Balanced model (e.g., ANTHROPIC_DEFAULT_SONNET_MODEL)
                    </p>
                  </div>
                  <div className="flex-shrink-0 w-64">
                    <Input
                      value={sonnetModel}
                      onChange={(e) => setSonnetModel(e.target.value)}
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
                      value={sonnetDisplayName}
                      onChange={(e) => setSonnetDisplayName(e.target.value)}
                      placeholder="Sonnet 3.5"
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Opus Model */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <Label className="text-sm font-medium">Opus Model</Label>
                    <p className="text-xs text-muted-foreground">
                      Most capable model (e.g., ANTHROPIC_DEFAULT_OPUS_MODEL)
                    </p>
                  </div>
                  <div className="flex-shrink-0 w-64">
                    <Input
                      value={opusModel}
                      onChange={(e) => setOpusModel(e.target.value)}
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
                      value={opusDisplayName}
                      onChange={(e) => setOpusDisplayName(e.target.value)}
                      placeholder="Opus 3.5"
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Single model input for OpenAI-style */
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <Label className="text-sm font-medium">Model Name</Label>
                <p className="text-xs text-muted-foreground">
                  Model identifier for requests
                </p>
              </div>
              <div className="flex-shrink-0 w-64">
                <Input
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="gpt-4o"
                  className="w-full font-mono text-xs"
                />
              </div>
            </div>
          )}

          {/* API Token */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <Label className="text-sm font-medium">API Token</Label>
              <p className="text-xs text-muted-foreground">
                Authentication token or API key
              </p>
            </div>
            <div className="flex-shrink-0 w-64">
              <Input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="sk-..."
                className="w-full"
              />
            </div>
          </div>

          {/* Base URL */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <Label className="text-sm font-medium">Base URL</Label>
              <p className="text-xs text-muted-foreground">
                API endpoint URL
              </p>
            </div>
            <div className="flex-shrink-0 w-64">
              <Input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder={getBaseUrlPlaceholder()}
                className="w-full"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {editProfile ? "Save Changes" : "Add Profile"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
