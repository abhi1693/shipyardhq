import Link from "next/link"

import { Button } from "@/components/atoms/button"
import { publicHeaderLinks } from "./public-header-links"

export default function PublicHeaderNav() {
  return (
    <nav className="hidden items-center gap-6 lg:flex">
      {publicHeaderLinks.map((link) => {
        return (
          <Button
            key={link.href}
            asChild
            variant="link"
            className="h-auto rounded-none border-0 bg-transparent p-0 text-[14px] font-normal leading-5 text-[#43474c] shadow-none no-underline transition-colors hover:bg-transparent hover:text-black hover:no-underline"
          >
            <Link href={link.href}>{link.label}</Link>
          </Button>
        )
      })}
    </nav>
  )
}
