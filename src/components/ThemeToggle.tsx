
"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"


export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light")
  }

  // Prevents hydration mismatch by not rendering the button until mounted on client
  if (!mounted) {
    return  <div className="h-9 w-9 sm:h-10 sm:w-10" /> // Placeholder to prevent layout shift
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" onClick={toggleTheme} aria-label="Toggle theme" className="h-9 w-9 sm:h-10 sm:w-10">
            {theme === 'light' ? (
              <Moon className="h-[1.1rem] w-[1.1rem] sm:h-[1.2rem] sm:w-[1.2rem]" />
            ) : (
              <Sun className="h-[1.1rem] w-[1.1rem] sm:h-[1.2rem] sm:w-[1.2rem]" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Toggle theme ({theme === 'light' ? 'dark' : 'light'})</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
