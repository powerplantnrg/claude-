import { type ComponentProps } from "react"

function Skeleton({ className = "", ...props }: ComponentProps<"div">) {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-200 ${className}`}
      {...props}
    />
  )
}

export { Skeleton }
