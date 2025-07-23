import { Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function SettingsToggle() {

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => console.log("TO")}
      className="w-9 px-0"
    >
      <Settings className="h-[1.2rem] w-[1.2rem]" />
      <span className="sr-only">Settings theme</span>
    </Button>
  )
}
