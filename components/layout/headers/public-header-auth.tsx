"use client"

import dynamic from "next/dynamic"
import Link from "next/link"

import { Button } from "@/components/atoms/button"
import { MEMBER_PRODUCTS_ADD_PATH } from "@/lib/routes"

const PublicHeaderAuthControls = dynamic(
  () => import("./public-header-auth-controls"),
  {
    ssr: false,
    loading: () => <PublicHeaderAuthFallback />,
  },
)

function PublicHeaderAuthFallback() {
  return (
    <>
      <div className="hidden items-center gap-3 md:flex">
        <Button
          asChild
          className="h-auto rounded-[4px] border-0 bg-black px-4 py-2 text-[12px] font-semibold leading-4 tracking-[0.05em] text-white shadow-none transition-transform hover:scale-95 hover:bg-black hover:brightness-100 hover:shadow-none active:brightness-100"
        >
          <Link href={MEMBER_PRODUCTS_ADD_PATH} prefetch={false}>
            Ship Product
          </Link>
        </Button>
        <Button
          asChild
          variant="ghost"
          className="size-8 rounded-[4px] border-0 p-0 text-[12px] font-medium leading-4 text-[#43474c] shadow-none hover:border-transparent hover:bg-[#F8FAFC] hover:text-black"
          aria-label="Sign in"
        >
          <Link href="/login">Login</Link>
        </Button>
      </div>
      <div
        className="size-10 rounded-[10px] border border-[#E2E8F0] bg-white md:hidden"
        aria-hidden
      />
    </>
  )
}

export default function PublicHeaderAuth() {
  return <PublicHeaderAuthControls />
}
