import { Plus, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { t } from '@/i18n'

type TagPickerProps = {
  /** Id of the visible label for the whole picker. */
  labelledBy?: string
  value: string[]
  onChange: (tags: string[]) => void
  /** Existing tag names to pick from. */
  suggestions: string[]
}

const sameName = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

/** Pick existing tags or type a new one. Names are unique ignoring case, like on the backend. */
export function TagPicker({ labelledBy, value, onChange, suggestions }: TagPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const query = search.trim().replace(/\s+/g, ' ')

  const available = suggestions.filter(
    (name) =>
      !value.some((selected) => sameName(selected, name)) &&
      name.toLowerCase().includes(query.toLowerCase()),
  )
  const canCreate =
    query.length > 0 &&
    query.length <= 50 &&
    !suggestions.some((name) => sameName(name, query)) &&
    !value.some((name) => sameName(name, query))

  const add = (name: string) => {
    onChange([...value, name])
    setSearch('')
    // Stay in the search box so the next tag can be typed right away.
    inputRef.current?.focus()
  }

  return (
    <div role="group" aria-labelledby={labelledBy} className="flex flex-wrap items-center gap-2">
      {value.map((name) => (
        <Badge key={name} variant="secondary" className="gap-1 pr-1">
          {name}
          <button
            type="button"
            className="rounded-sm p-0.5 hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-label={`${t('tags.remove')} ${name}`}
            onClick={() => onChange(value.filter((tag) => tag !== name))}
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <Plus />
            {t('tags.add')}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              ref={inputRef}
              placeholder={t('tags.search')}
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>{t('tags.none')}</CommandEmpty>
              {(available.length > 0 || canCreate) && (
                <CommandGroup>
                  {canCreate && (
                    <CommandItem value={`create:${query}`} onSelect={() => add(query)}>
                      <Plus />
                      {t('tags.create')} “{query}”
                    </CommandItem>
                  )}
                  {available.map((name) => (
                    <CommandItem key={name} value={name} onSelect={() => add(name)}>
                      {name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
