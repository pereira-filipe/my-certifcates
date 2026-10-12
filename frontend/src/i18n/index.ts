import { en } from './en'

const messages = en

type Path<T> = T extends string
  ? never
  : { [K in keyof T & string]: T[K] extends string ? K : `${K}.${Path<T[K]>}` }[keyof T & string]

export type MessageKey = Path<typeof messages>

/** Returns the UI text for a key like `"notFound.title"`. */
export function t(key: MessageKey): string {
  let value: unknown = messages
  for (const part of key.split('.')) {
    value = (value as Record<string, unknown>)[part]
  }
  return value as string
}
