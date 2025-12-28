import { useSyncState, useHasPendingMutations } from "@/sync/hooks"
import { Cloud, CloudOff, Loader2, AlertCircle, Check } from "lucide-react"

export function SyncStatusIndicator() {
  const syncState = useSyncState()
  const hasPending = useHasPendingMutations()

  const getStatusInfo = () => {
    if (!syncState.isOnline) {
      return {
        icon: CloudOff,
        text: "Offline",
        className: "text-amber-500",
        animate: false,
      }
    }

    switch (syncState.status) {
      case "syncing":
        return {
          icon: Loader2,
          text: "Syncing...",
          className: "text-blue-500",
          animate: true,
        }
      case "pushing":
        return {
          icon: Loader2,
          text: "Saving...",
          className: "text-blue-500",
          animate: true,
        }
      case "error":
        return {
          icon: AlertCircle,
          text: "Sync error",
          className: "text-red-500",
          animate: false,
        }
      case "idle":
      default:
        if (hasPending) {
          return {
            icon: Cloud,
            text: "Pending changes",
            className: "text-amber-500",
            animate: false,
          }
        }
        return {
          icon: Check,
          text: "Synced",
          className: "text-green-500",
          animate: false,
        }
    }
  }

  const { icon: Icon, text, className, animate } = getStatusInfo()

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] shadow-lg">
        <Icon
          className={`h-4 w-4 ${className} ${animate ? "animate-spin" : ""}`}
        />
        <span className="text-xs text-[var(--text-secondary)]">{text}</span>
        {hasPending && syncState.pendingMutationsCount > 0 && (
          <span className="text-xs text-[var(--text-tertiary)]">
            ({syncState.pendingMutationsCount})
          </span>
        )}
      </div>
    </div>
  )
}
