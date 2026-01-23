"use client"

export default function MemberFooter() {
  const year = new Date().getFullYear()
  return (
    <footer className="border-t bg-muted/40 text-sm md:text-[15px] mt-8">
      <div className="text-center py-6 md:py-7 text-xs md:text-sm text-muted-foreground">
        © {year} ShipYardHQ • Member Area
      </div>
    </footer>
  )
}
