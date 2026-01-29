import { useAtomValue } from "jotai"
import { useMemo, useState } from "react"
import {
  modelProfilesAtom,
  activeProfileIdAtom,
  type ModelProfile,
} from "../../../lib/atoms"
import { cn } from "../../../lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu"
import {
  AgentIcon,
  IconChevronDown,
} from "../../../components/ui/icons"

interface ModelSelectorProps {
  value: string | null  // Profile ID
  onChange: (profileId: string | null) => void
  disabled?: boolean
}

export function ModelSelector({
  value,
  onChange,
  disabled = false,
}: ModelSelectorProps) {
  const modelProfiles = useAtomValue(modelProfilesAtom)
  const activeProfileId = useAtomValue(activeProfileIdAtom)
  const [open, setOpen] = useState(false)

  // Find the selected profile
  const selectedProfile = useMemo(() => {
    if (!value) return null
    return modelProfiles.find((p) => p.id === value) || null
  }, [value, modelProfiles])

  // Get display name for a profile
  const getDisplayName = (profile: ModelProfile) => {
    const formatLabel = profile.apiFormat === "openai" ? "OpenAI" : "Anthropic"
    return `${profile.name} (${formatLabel})`
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 text-sm text-muted-foreground hover:text-foreground transition-[background-color,color] duration-150 ease-out rounded-md hover:bg-muted/50 outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          disabled={disabled}
        >
          <AgentIcon className="w-4 h-4" />
          <span className="truncate max-w-[120px]">
            {selectedProfile
              ? getDisplayName(selectedProfile)
              : (activeProfileId
                  ? getDisplayName(modelProfiles.find((p) => p.id === activeProfileId)!)
                  : "Default")
            }
          </span>
          <IconChevronDown className="w-3 h-3 opacity-50" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 p-1" align="start">
        {/* Default option (use active profile) */}
        <DropdownMenuItem
          onClick={() => {
            onChange(null)
            setOpen(false)
          }}
          className={cn(
            "flex items-center gap-2 cursor-default",
            !value && "bg-muted"
          )}
        >
          <AgentIcon className="h-4 w-4" />
          <div className="flex flex-col">
            <span className="text-sm">Default</span>
            <span className="text-xs text-muted-foreground">
              Use active profile
            </span>
          </div>
          {!value && (
            <span className="ml-auto text-xs text-muted-foreground">✓</span>
          )}
        </DropdownMenuItem>

        {/* Model profiles */}
        {modelProfiles.map((profile) => (
          <DropdownMenuItem
            key={profile.id}
            onClick={() => {
              onChange(profile.id)
              setOpen(false)
            }}
            className={cn(
              "flex items-center gap-2 cursor-default",
              value === profile.id && "bg-muted"
            )}
          >
            <AgentIcon className="h-4 w-4" />
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm truncate">{profile.name}</span>
              <span className="text-xs text-muted-foreground truncate">
                {profile.apiFormat === "openai" ? "OpenAI" : "Anthropic"}
              </span>
            </div>
            {value === profile.id && (
              <span className="ml-auto text-xs text-muted-foreground">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
