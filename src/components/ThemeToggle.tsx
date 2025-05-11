
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

  if (!mounted) {
    return  <div className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10" /> 
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" onClick={toggleTheme} aria-label="Toggle theme" className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10">
            {theme === 'light' ? (
              <Moon className="h-4 w-4 sm:h-[1.1rem] sm:w-[1.1rem] md:h-[1.2rem] md:w-[1.2rem]" />
            ) : (
              <Sun className="h-4 w-4 sm:h-[1.1rem] sm:w-[1.1rem] md:h-[1.2rem] md:w-[1.2rem]" />
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
