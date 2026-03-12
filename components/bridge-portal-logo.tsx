"use client"

import Link from "next/link"

import { cn } from "@/lib/utils"

import styles from "./bridge-portal-logo.module.css"

type BridgePortalLogoProps = {
  className?: string
  href?: string
}

export function BridgePortalLogo({
  className,
  href = "/dashboard",
}: BridgePortalLogoProps) {
  return (
    <Link
      href={href}
      aria-label="Bridge OneClub"
      className={cn(styles.logoLink, "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9aa5bb]", className)}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 500 214"
        className={styles.logoSvg}
        role="img"
        aria-hidden="true"
      >
        <text x="20" y="88" className={styles.bridgeText}>
          Brıdge
        </text>

        <circle cx="132" cy="18" r="9" className={styles.redDot} />

        <g transform="translate(18, 130)">
          <circle cx="37" cy="31" r="30" className={styles.clubRing} />
          <text
            x="37"
            y="46"
            textAnchor="middle"
            fontSize="48"
            className={styles.clubSymbol}
          >
            ♣
          </text>
        </g>

        <text x="94" y="187" className={styles.oneclubText}>
          neClub
        </text>
      </svg>
    </Link>
  )
}
