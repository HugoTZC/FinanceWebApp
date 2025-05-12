export default function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="flex flex-col items-center gap-2">
        <div className="rounded-full bg-primary/20 p-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
        <p className="text-sm text-muted-foreground">Authenticating...</p>
      </div>
    </div>
  )
}