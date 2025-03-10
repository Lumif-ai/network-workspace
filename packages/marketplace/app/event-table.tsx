
import { DataTable } from "./data-table"
import { columns } from "./columns"
import { useEventMonitor } from "./hooks/useEventMonitor"

export function EventTable() {
  const { events, isLoading, error } = useEventMonitor()

  return (
    <div className="space-y-4 w-full">

      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground text-center">
            Loading event data from the blockchain...<br/>
            This may take up to 30 seconds on initial load.
          </p>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-64 text-destructive">
          <p>Error: {error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="ml-4 px-4 py-2 rounded-md bg-primary text-primary-foreground"
          >
            Retry
          </button>
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-sm text-muted-foreground text-center">
            No agents found yet.<br/>
            Please wait while we scan for new agents...
          </p>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Live Agents</h2>
            <span className="text-sm text-muted-foreground">
              {events.length} agents found
            </span>
          </div>
          <DataTable columns={columns} data={events} />
        </>
      )}
    </div>
  )
}
